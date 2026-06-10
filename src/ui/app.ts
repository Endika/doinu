import type { InputAdapter, Capabilities } from '../core/input-adapter'
import type { InputEvent } from '../core/events'
import { MidiInputAdapter } from '../core/midi-adapter'
import { perfClock, offsetClock } from '../core/clock'
import { Engine } from '../engine/engine'
import type { Summary } from '../engine/scoring'
import { Renderer, leadInMs, expectedNotesAt } from '../render/renderer'
import { Keyboard } from '../render/keyboard'
import { MelodyMode } from '../modes/melody-mode'
import { CURRICULUM, type Exercise } from '../content/curriculum'

/** Hit-window half-width (ms) shared by the engine matcher and the on-screen guide. */
const WINDOW_MS = 150
/** Falling-note speed in pixels per millisecond (calm pace for young learners). */
const PX_PER_MS = 0.15

/**
 * Wraps an input adapter so emitted event times are translated onto the
 * song-relative timeline (raw `performance.now()` → song time). This keeps the
 * matcher's event times on the same origin as the 0-based chart.
 */
class SongTimeAdapter implements InputAdapter {
  capabilities: Capabilities
  constructor(private readonly inner: InputAdapter, private readonly origin: number) {
    this.capabilities = inner.capabilities
  }
  onEvent(cb: (e: InputEvent) => void): void {
    this.inner.onEvent(e => cb({ ...e, time: e.time - this.origin }))
  }
  start(): Promise<void> { return this.inner.start() }
  stop(): void { this.inner.stop() }
}

export interface Env {
  hasWebMidi: boolean
}

export interface SelectedAdapter extends InputAdapter {
  statusKey?: string
}

// Idle adapter used when there is no real input source yet.
// Fase 1 ships MIDI only; microphone input lands in Fase 2.
class NullAdapter implements SelectedAdapter {
  capabilities: Capabilities = { polyphonic: false, source: 'fake' }
  statusKey = 'input.noMidiMicLater'
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onEvent(_cb: (e: InputEvent) => void): void {
    // no-op: a null adapter never produces events.
  }
  async start(): Promise<void> {
    // no-op
  }
  stop(): void {
    // no-op
  }
}

/**
 * Pure adapter selection: given the detected environment, pick the input
 * adapter. Kept free of DOM / `navigator` so it is safe in a node test.
 */
export function selectAdapter(env: Env): SelectedAdapter {
  if (env.hasWebMidi) return new MidiInputAdapter()
  return new NullAdapter()
}

const STATUS_MESSAGES: Record<string, string> = {
  'input.noMidiMicLater':
    'No MIDI keyboard detected. Microphone input is coming in Fase 2.',
}

function statusMessage(key: string): string {
  return STATUS_MESSAGES[key] ?? key
}

function pickExercise(id = 'first-three'): Exercise {
  return CURRICULUM.find(e => e.id === id) ?? CURRICULUM[0]
}

function formatSummary(s: Summary): string {
  const accuracy = `${Math.round(s.accuracy * 100)}%`
  const findSpeed = `${Math.round(s.meanFindMs)} ms`
  const timing = `${Math.round(s.meanTimingDevMs)} ms`
  return [
    `Accuracy: ${accuracy}`,
    `Find speed: ${findSpeed}`,
    `Timing: ±${timing}`,
  ].join('\n')
}

/**
 * Real browser entry point. Reads the canvas, selects the input adapter,
 * builds the first exercise and drives the engine + renderer to completion.
 * Guarded so importing this module in node never touches the DOM.
 */
export function bootstrap(): void {
  if (typeof document === 'undefined') return

  const stageCanvas = document.getElementById('stage') as HTMLCanvasElement | null
  const keysCanvas = document.getElementById('keys') as HTMLCanvasElement | null
  const status = ensureStatusEl()

  const env: Env = { hasWebMidi: 'requestMIDIAccess' in navigator }
  const selected = selectAdapter(env)

  // No real input source: show the status message instead of starting.
  if (selected.statusKey) {
    if (status) status.textContent = statusMessage(selected.statusKey)
    return
  }

  const exercise = pickExercise()
  const chart = new MelodyMode(exercise).buildChart()

  sizeCanvas(stageCanvas)
  sizeCanvas(keysCanvas)
  const stageCtx = stageCanvas?.getContext('2d') ?? null
  const keysCtx = keysCanvas?.getContext('2d') ?? null

  // Falling-notes geometry + a song-relative clock whose lead-in equals the time
  // a note takes to fall the full height, so the first note enters at the very
  // top of the stage and reaches the hit line after a full, reactable run.
  const hitLineY = stageCanvas ? stageCanvas.height * 0.88 : 0
  const lead = leadInMs(hitLineY, PX_PER_MS)
  const origin = perfClock.now() + lead
  const songClock = offsetClock(perfClock, origin)

  const adapter = new SongTimeAdapter(selected, origin)
  const engine = new Engine(chart, adapter, songClock, { windowMs: WINDOW_MS })
  const renderer = new Renderer(stageCtx, { hitLineY, pxPerMs: PX_PER_MS })
  const keyboard = new Keyboard(keysCtx)

  if (status) status.textContent = exercise.title

  engine.start()

  const lastEndMs = chart.targets.length
    ? Math.max(...chart.targets.map(t => t.startMs + t.durMs))
    : 0

  const loop = (): void => {
    engine.tick()
    const frame = engine.frameState()
    renderer.draw(frame)
    const expected = expectedNotesAt(frame.targets, frame.nowMs, WINDOW_MS)
    keyboard.draw(frame.activeNotes, expected)

    if (songClock.now() >= lastEndMs + 1500) {
      engine.stop()
      if (status) status.textContent = formatSummary(engine.summary())
      return
    }
    requestAnimationFrame(loop)
  }
  requestAnimationFrame(loop)
}

function ensureStatusEl(): HTMLElement | null {
  if (typeof document === 'undefined') return null
  let el = document.getElementById('status')
  if (!el) {
    el = document.createElement('div')
    el.id = 'status'
    document.body.appendChild(el)
  }
  return el
}

function sizeCanvas(canvas: HTMLCanvasElement | null): void {
  if (!canvas) return
  canvas.width = canvas.clientWidth || window.innerWidth
  canvas.height = canvas.clientHeight || window.innerHeight
}

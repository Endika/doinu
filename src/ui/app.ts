import type { InputAdapter, Capabilities } from '../core/input-adapter'
import type { InputEvent } from '../core/events'
import { MidiInputAdapter } from '../core/midi-adapter'
import { perfClock } from '../core/clock'
import { Engine } from '../engine/engine'
import type { Summary } from '../engine/scoring'
import { Renderer } from '../render/renderer'
import { Keyboard } from '../render/keyboard'
import { MelodyMode } from '../modes/melody-mode'
import { CURRICULUM, type Exercise } from '../content/curriculum'

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

  const canvas = document.getElementById('stage') as HTMLCanvasElement | null
  const status = ensureStatusEl()

  const env: Env = { hasWebMidi: 'requestMIDIAccess' in navigator }
  const adapter = selectAdapter(env)

  // No real input source: show the status message instead of starting.
  if (adapter.statusKey) {
    if (status) status.textContent = statusMessage(adapter.statusKey)
    return
  }

  const exercise = pickExercise()
  const chart = new MelodyMode(exercise).buildChart()

  const ctx = canvas?.getContext('2d') ?? null
  sizeCanvas(canvas)

  const engine = new Engine(chart, adapter, perfClock, { windowMs: 150 })

  const pxPerMs = 0.25
  const hitLineY = ctx ? ctx.canvas.height * 0.75 : 0
  const renderer = new Renderer(ctx, { hitLineY, pxPerMs })
  const keyboard = new Keyboard(null)

  if (status) status.textContent = exercise.title

  engine.start()
  renderer.start(() => {
    const frame = engine.frameState()
    keyboard.draw(frame.activeNotes)
    return frame
  })

  // Drive scoring/missed-note advancement and detect chart completion.
  const lastStartMs = chart.targets.length
    ? Math.max(...chart.targets.map(t => t.startMs + t.durMs))
    : 0
  const startedAt = perfClock.now()

  const loop = (): void => {
    engine.tick()
    if (perfClock.now() - startedAt >= lastStartMs + 1000) {
      renderer.stop()
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

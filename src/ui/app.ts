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
import { MetricsStore } from '../progress/metrics-store'
import { buildMasteryMap, type MasteryEntry, type MasteryState } from '../progress/mastery'
import { buildProgressReport, renderProgressReport } from '../progress/progress-view'

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

/**
 * Pure: pick which exercise to play now. Resume at the first `inProgress`
 * exercise; if every exercise is `mastered`, fall back to the LAST exercise id
 * (free replay). Assumes a non-empty map (the curriculum is non-empty, and
 * index 0 is never locked, so there is always a non-locked entry).
 */
export function pickCurrentExerciseId(map: MasteryEntry[]): string {
  const inProgress = map.find(e => e.state === 'inProgress')
  if (inProgress) return inProgress.exerciseId
  return map[map.length - 1].exerciseId
}

const STATUS_MESSAGES: Record<string, string> = {
  'input.noMidiMicLater':
    'No MIDI keyboard detected. Microphone input is coming in Fase 2.',
}

function statusMessage(key: string): string {
  return STATUS_MESSAGES[key] ?? key
}

function findExercise(id: string): Exercise {
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
    '',
    'Tap or press a key to continue.',
  ].join('\n')
}

// DOM + collaborators shared by every exercise run within one bootstrap.
interface ExerciseDeps {
  stageCanvas: HTMLCanvasElement | null
  keysCanvas: HTMLCanvasElement | null
  status: HTMLElement | null
  selected: SelectedAdapter
}

/**
 * Set up and drive a single exercise to completion. Owns the song-relative
 * clock (with lead-in), the `SongTimeAdapter`, the engine, renderer, keyboard
 * and rAF loop. Calls `onComplete(engine)` once when the run ends so the caller
 * can persist the attempt, refresh progress and advance.
 */
function runExercise(
  exercise: Exercise,
  deps: ExerciseDeps,
  onComplete: (engine: Engine) => void,
): void {
  const { stageCanvas, keysCanvas, status, selected } = deps
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
      onComplete(engine)
      return
    }
    requestAnimationFrame(loop)
  }
  requestAnimationFrame(loop)
}

/**
 * Real browser entry point. Reads the canvases, selects the input adapter,
 * resumes at the right exercise from stored progress, and drives the engine +
 * renderer to completion — persisting each attempt, tracking mastery, refreshing
 * the parent report and advancing on a tap. Guarded so importing this module in
 * node never touches the DOM.
 */
export function bootstrap(): void {
  if (typeof document === 'undefined') return

  const stageCanvas = document.getElementById('stage') as HTMLCanvasElement | null
  const keysCanvas = document.getElementById('keys') as HTMLCanvasElement | null
  const status = ensureStatusEl()

  setupReportToggle()
  const reportEl = document.getElementById('report')

  const env: Env = { hasWebMidi: 'requestMIDIAccess' in navigator }
  const selected = selectAdapter(env)

  // No real input source: show the status message instead of starting.
  if (selected.statusKey) {
    if (status) status.textContent = statusMessage(selected.statusKey)
    return
  }

  const store = new MetricsStore(window.localStorage)
  const deps: ExerciseDeps = { stageCanvas, keysCanvas, status, selected }

  const refreshReport = (): void => {
    const map = buildMasteryMap(CURRICULUM, id => store.sessionsFor(id))
    const stateFor = (id: string): MasteryState =>
      map.find(e => e.exerciseId === id)?.state ?? 'locked'
    const report = buildProgressReport(CURRICULUM, id => store.sessionsFor(id), stateFor)
    renderProgressReport(reportEl, report)
  }

  // Resume: pick the exercise from stored progress.
  const initialMap = buildMasteryMap(CURRICULUM, id => store.sessionsFor(id))
  const startId = pickCurrentExerciseId(initialMap)

  refreshReport()

  const startExercise = (id: string): void => {
    const exercise = findExercise(id)
    runExercise(exercise, deps, engine => {
      // 1. Persist this attempt.
      store.record({ exerciseId: exercise.id, timestamp: Date.now(), summary: engine.summary() })
      // 2. Recompute progress and refresh the report panel.
      refreshReport()
      // 3. Show the summary.
      if (status) status.textContent = formatSummary(engine.summary())
      // 4. Arm a one-time advance handler: tap/key → next exercise (or just-mastered replay).
      const advance = (): void => {
        window.removeEventListener('pointerdown', advance)
        window.removeEventListener('keydown', advance)
        const nextMap = buildMasteryMap(CURRICULUM, sid => store.sessionsFor(sid))
        startExercise(pickCurrentExerciseId(nextMap))
      }
      window.addEventListener('pointerdown', advance, { once: true })
      window.addEventListener('keydown', advance, { once: true })
    })
  }

  startExercise(startId)
}

function setupReportToggle(): void {
  if (typeof document === 'undefined') return
  const toggle = document.getElementById('report-toggle')
  const panel = document.getElementById('report')
  if (!toggle || !panel) return
  toggle.addEventListener('click', () => {
    panel.classList.toggle('open')
  })
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

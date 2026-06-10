import type { InputAdapter, Capabilities } from '../core/input-adapter'
import type { InputEvent } from '../core/events'
import { MidiInputAdapter } from '../core/midi-adapter'
import { perfClock, offsetClock } from '../core/clock'
import { Engine } from '../engine/engine'
import type { Summary } from '../engine/scoring'
import { Renderer, leadInMs, expectedNotesAt } from '../render/renderer'
import { Keyboard } from '../render/keyboard'
import { MelodyMode } from '../modes/melody-mode'
import { ScaleMode, SCALES } from '../modes/scale-mode'
import { SequenceMatcher, ECHO_PHRASES } from '../modes/echo-mode'
import { MemoryGame, MEMORY_NOTES } from '../modes/memory-mode'
import { NoteFindGame, NOTE_FIND_NOTES } from '../modes/note-find-mode'
import type { Mode } from '../modes/mode'
import { Synth } from '../audio/synth'
import { CURRICULUM, type Exercise } from '../content/curriculum'
import { MetricsStore } from '../progress/metrics-store'
import { buildMasteryMap, type MasteryEntry, type MasteryState } from '../progress/mastery'
import { buildProgressReport, renderProgressReport } from '../progress/progress-view'

/** Build-time app version, injected by Vite from package.json. */
declare const __APP_VERSION__: string

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
  const pct = Math.round(s.accuracy * 100)
  const emoji = pct >= 90 ? '🌟' : pct >= 60 ? '👏' : '💪'
  return `Great! ${pct}% ${emoji}`
}

// DOM + collaborators shared by every exercise run within one bootstrap.
interface ExerciseDeps {
  stageCanvas: HTMLCanvasElement | null
  keysCanvas: HTMLCanvasElement | null
  status: HTMLElement | null
  selected: SelectedAdapter
}

/**
 * Set up and drive a single `Mode` to completion. Owns the song-relative
 * clock (with lead-in), the `SongTimeAdapter`, the engine, renderer, keyboard
 * and rAF loop. Calls `onComplete(engine)` once when the run ends so the caller
 * can persist the attempt, refresh progress and advance.
 *
 * Works for any `Mode` (melody or scale): it builds the chart from the mode and
 * runs the identical timeline/feedback pipeline. `title` is shown as the status.
 */
function runChart(
  mode: Mode,
  title: string,
  deps: ExerciseDeps,
  onComplete: (engine: Engine) => void,
): () => void {
  const { stageCanvas, keysCanvas, status, selected } = deps
  const chart = mode.buildChart()

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

  if (status) status.textContent = title

  engine.start()

  const lastEndMs = chart.targets.length
    ? Math.max(...chart.targets.map(t => t.startMs + t.durMs))
    : 0

  let running = true
  let rafId = 0
  const loop = (): void => {
    if (!running) return
    engine.tick()
    const frame = engine.frameState()
    renderer.draw(frame)
    const expected = expectedNotesAt(frame.targets, frame.nowMs, WINDOW_MS)
    keyboard.draw(frame.activeNotes, expected)

    if (songClock.now() >= lastEndMs + 1500) {
      running = false
      engine.stop()
      onComplete(engine)
      return
    }
    rafId = requestAnimationFrame(loop)
  }
  rafId = requestAnimationFrame(loop)

  // Returns a stop() so the caller's ← Menu can abort mid-run.
  return (): void => {
    running = false
    cancelAnimationFrame(rafId)
    engine.stop()
  }
}

/**
 * Real browser entry point. Reads the canvases, selects the input adapter,
 * wires a synth for audio feedback, and shows an activity menu. Each activity
 * (resumable melody curriculum, or a practice scale) drives the engine +
 * renderer to completion — persisting each attempt, tracking mastery and
 * refreshing the parent report. Melody advances to the next exercise on a tap;
 * scales return to the menu. Guarded so importing this module in node never
 * touches the DOM.
 */
export function bootstrap(): void {
  if (typeof document === 'undefined') return

  const stageCanvas = document.getElementById('stage') as HTMLCanvasElement | null
  const keysCanvas = document.getElementById('keys') as HTMLCanvasElement | null
  const status = ensureStatusEl()
  const menu = document.getElementById('menu')
  const menuStatus = document.getElementById('menu-status')

  setupReportToggle()
  const reportEl = document.getElementById('report')

  // Version footer on the start screen (matches the sister apps' format).
  const versionEl = document.getElementById('version')
  if (versionEl) versionEl.textContent = `v${__APP_VERSION__}`

  // Give the status banner a celebratory "pop" every time its text changes.
  if (status) {
    const banner = status
    const obs = new MutationObserver(() => {
      if (!banner.textContent) return
      banner.classList.remove('pop')
      void banner.offsetWidth // force reflow so the animation restarts
      banner.classList.add('pop')
    })
    obs.observe(banner, { childList: true, characterData: true, subtree: true })
  }

  const env: Env = { hasWebMidi: 'requestMIDIAccess' in navigator }
  const selected = selectAdapter(env)

  // Audio feedback: a single synth, driven by the RAW selected adapter so every
  // key press sounds. The engine subscribes separately via its own wrapped
  // (song-time) adapter inside runChart — the two listeners coexist.
  const synth = new Synth()
  selected.onEvent(e => (e.type === 'on' ? synth.noteOn(e.note) : synth.noteOff(e.note)))

  // Start the input adapter ONCE here so EVERY activity (echo, free play, menu)
  // receives MIDI — not just the melody/scale flows whose engine used to be the
  // only caller of start(). Without this, echo's "your turn" got no MIDI events.
  void selected.start()

  // No real input source: show the menu but keep buttons inert and surface the
  // status message on it. Do not crash.
  const noInput = Boolean(selected.statusKey)
  if (noInput && selected.statusKey) {
    if (menuStatus) menuStatus.textContent = statusMessage(selected.statusKey)
    if (status) status.textContent = ''
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

  refreshReport()

  const showMenu = (): void => {
    if (status) status.textContent = ''
    menu?.classList.remove('hidden')
  }
  const hideMenu = (): void => {
    menu?.classList.add('hidden')
  }

  const backBtn = document.getElementById('back-menu')

  // Melody flow: a self-contained chaining activity. The ← Menu button (shown for
  // the whole session, including the result banner) exits at any time; otherwise
  // it auto-advances to the next exercise from stored progress.
  const startMelody = (startId: string): void => {
    let alive = true
    let stopChart: (() => void) | null = null
    let timer = 0
    const exit = (): void => {
      if (!alive) return
      alive = false
      stopChart?.()
      window.clearTimeout(timer)
      backBtn?.removeEventListener('click', exit)
      backBtn?.classList.add('hidden')
      if (status) status.textContent = ''
      showMenu()
    }
    backBtn?.addEventListener('click', exit)
    backBtn?.classList.remove('hidden')

    const playOne = (id: string): void => {
      if (!alive) return
      const exercise = findExercise(id)
      stopChart = runChart(new MelodyMode(exercise), exercise.title, deps, engine => {
        if (!alive) return
        store.record({ exerciseId: exercise.id, timestamp: Date.now(), summary: engine.summary() })
        refreshReport()
        if (status) status.textContent = formatSummary(engine.summary())
        timer = window.setTimeout(() => {
          if (!alive) return
          const nextMap = buildMasteryMap(CURRICULUM, sid => store.sessionsFor(sid))
          playOne(pickCurrentExerciseId(nextMap))
        }, 2800)
      })
    }
    playOne(startId)
  }

  const resumeMelody = (): void => {
    const map = buildMasteryMap(CURRICULUM, id => store.sessionsFor(id))
    startMelody(pickCurrentExerciseId(map))
  }

  // Cycles through ECHO_PHRASES across echo runs (deterministic, no Date.now()).
  let echoIndex = 0

  /**
   * Free-play sandbox: no falling notes, no scoring. Subscribes to the raw
   * selected adapter to track held notes, and draws the keyboard each frame so
   * pressed keys glow in their pitch colour (no expected notes → the keyboard's
   * "free" feedback path). Audio is already produced by the global synth
   * listener, so this does NOT trigger sound. A `running` flag guards the loop
   * and the (un-removable) adapter listener, so a stale write to `activeNotes`
   * after exit is harmless.
   */
  const startFreePlay = (d: ExerciseDeps, s: Synth): void => {
    s.resume()
    const activeNotes = new Set<number>()
    let running = true

    d.selected.onEvent(e => {
      if (!running) return
      if (e.type === 'on') activeNotes.add(e.note)
      else activeNotes.delete(e.note)
    })

    sizeCanvas(d.stageCanvas)
    sizeCanvas(d.keysCanvas)
    const stageCtx = d.stageCanvas?.getContext('2d') ?? null
    const keysCtx = d.keysCanvas?.getContext('2d') ?? null
    if (stageCtx && d.stageCanvas) stageCtx.clearRect(0, 0, d.stageCanvas.width, d.stageCanvas.height)
    const keyboard = new Keyboard(keysCtx)

    if (d.status) d.status.textContent = 'Free play — press any key'

    let rafId = 0
    const loop = (): void => {
      if (!running) return
      keyboard.draw(activeNotes)
      rafId = requestAnimationFrame(loop)
    }
    rafId = requestAnimationFrame(loop)

    const exit = (): void => {
      running = false
      cancelAnimationFrame(rafId)
      backBtn?.removeEventListener('click', exit)
      backBtn?.classList.add('hidden')
      if (d.status) d.status.textContent = ''
      showMenu()
    }
    backBtn?.addEventListener('click', exit)
    backBtn?.classList.remove('hidden')
  }

  /**
   * Echo (call-and-response): play a short phrase (LISTEN), then have the child
   * repeat it (REPEAT). Modeled on free play — a per-session `running` flag
   * guards the rAF loop and the (un-removable) adapter listener so stale events
   * after exit are harmless. Timing does not matter here; we only score the
   * sequence of notes via `SequenceMatcher`. Audio for the child's presses comes
   * from the global synth listener; the LISTEN phase uses `synth.playSequence`.
   */
  const startEcho = (d: ExerciseDeps, s: Synth): void => {
    s.resume()
    let running = true
    let phase: 'listen' | 'repeat' | 'done' = 'listen'
    let phrase = ECHO_PHRASES[echoIndex % ECHO_PHRASES.length]
    echoIndex++
    let matcher: SequenceMatcher | null = null
    let listenIndex = -1 // index into phrase.notes while the app is playing it
    const activeNotes = new Set<number>()

    sizeCanvas(d.stageCanvas)
    sizeCanvas(d.keysCanvas)
    const stageCtx = d.stageCanvas?.getContext('2d') ?? null
    const keysCtx = d.keysCanvas?.getContext('2d') ?? null
    if (stageCtx && d.stageCanvas) stageCtx.clearRect(0, 0, d.stageCanvas.width, d.stageCanvas.height)
    const keyboard = new Keyboard(keysCtx)

    // ONE persistent input listener for the whole echo session (guarded by
    // `running`). During REPEAT it feeds the matcher; otherwise it just tracks
    // held notes for the glow.
    d.selected.onEvent(e => {
      if (!running) return
      if (e.type === 'on') {
        activeNotes.add(e.note)
        if (phase === 'repeat' && matcher && !matcher.done) {
          matcher.press(e.note)
          if (matcher.done) finishRound()
        }
      } else {
        activeNotes.delete(e.note)
      }
    })

    // ONE rAF loop: LISTEN highlights the sounding note; REPEAT shows the next
    // expected note as a guide plus the child's held notes.
    let rafId = 0
    const loop = (): void => {
      if (!running) return
      if (phase === 'listen') {
        const sounding = listenIndex >= 0 && listenIndex < phrase.notes.length
        keyboard.draw(new Set(), sounding ? new Set([phrase.notes[listenIndex]]) : new Set<number>())
      } else {
        const next =
          phase === 'repeat' && matcher && !matcher.done
            ? new Set([phrase.notes[matcher.index]])
            : new Set<number>()
        keyboard.draw(activeNotes, next)
      }
      rafId = requestAnimationFrame(loop)
    }

    const startRepeat = (): void => {
      if (!running) return
      phase = 'repeat'
      matcher = new SequenceMatcher(phrase.notes)
      if (d.status) d.status.textContent = 'Your turn! 🎶'
    }

    // LISTEN: play the phrase, highlighting each note as it sounds, then REPEAT.
    const playRound = (): void => {
      if (!running) return
      phase = 'listen'
      matcher = null
      listenIndex = -1
      activeNotes.clear()
      if (d.status) d.status.textContent = 'Listen… 👂'
      let step = 0
      const advanceListen = (): void => {
        if (!running || phase !== 'listen') return
        listenIndex = step
        step++
        if (step < phrase.notes.length) window.setTimeout(advanceListen, phrase.noteDurMs)
      }
      advanceListen()
      s.playSequence(
        phrase.notes.map(n => ({ midi: n, durMs: phrase.noteDurMs })),
        () => {
          if (!running) return
          listenIndex = -1
          startRepeat()
        },
      )
    }

    // On a completed echo: score it, then chain a NEW phrase automatically so the
    // child keeps playing. The ← Menu button is the only way out.
    function finishRound(): void {
      if (!running) return
      phase = 'done'
      const accuracy = matcher ? matcher.accuracy() : 0
      store.record({
        exerciseId: 'echo:' + phrase.id,
        timestamp: Date.now(),
        summary: { accuracy, meanTimingDevMs: 0, meanFindMs: 0, tempoBpm: 0 },
      })
      refreshReport()
      if (d.status) d.status.textContent = `Great! ${Math.round(accuracy * 100)}% 🌟`
      phrase = ECHO_PHRASES[echoIndex % ECHO_PHRASES.length]
      echoIndex++
      window.setTimeout(() => {
        if (running) playRound()
      }, 1600)
    }

    const exit = (): void => {
      running = false
      cancelAnimationFrame(rafId)
      backBtn?.removeEventListener('click', exit)
      backBtn?.classList.add('hidden')
      if (d.status) d.status.textContent = ''
      showMenu()
    }
    backBtn?.addEventListener('click', exit)
    backBtn?.classList.remove('hidden')

    rafId = requestAnimationFrame(loop)
    playRound()
  }

  /**
   * Memory (Simón): the app plays a growing sequence (LISTEN); the child repeats
   * it (REPEAT). Each won round APPENDS one note and replays the longer sequence,
   * chaining automatically; a wrong press ends the round and restarts from length
   * 1, keeping the best. Modeled on `startEcho`: a per-session `running` flag
   * guards the rAF loop and the (un-removable) adapter listener; the LISTEN phase
   * highlights each sounding note; REPEAT shows the next expected note as a guide
   * plus the child's held notes. `#back-menu` is the only way out.
   *
   * Sessions are recorded with `exerciseId:'memory'` and the standard `Summary`
   * shape — accuracy 1 on a won round / 0 on a lost one — and the reached LEVEL
   * is encoded via `tempoBpm` (won: `sequence.length`, lost: `longest`) so the
   * progress report surfaces progress without changing the `Summary` shape.
   */
  const startMemory = (d: ExerciseDeps, s: Synth): void => {
    s.resume()
    const game = new MemoryGame(() => MEMORY_NOTES[Math.floor(Math.random() * MEMORY_NOTES.length)])
    let running = true
    let phase: 'listen' | 'repeat' | 'done' = 'listen'
    let listenIndex = -1 // index into the sequence while the app is playing it
    let ptr = 0 // local repeat pointer, mirrors the game's internal pointer
    const activeNotes = new Set<number>()

    sizeCanvas(d.stageCanvas)
    sizeCanvas(d.keysCanvas)
    const stageCtx = d.stageCanvas?.getContext('2d') ?? null
    const keysCtx = d.keysCanvas?.getContext('2d') ?? null
    if (stageCtx && d.stageCanvas) stageCtx.clearRect(0, 0, d.stageCanvas.width, d.stageCanvas.height)
    const keyboard = new Keyboard(keysCtx)

    // ONE persistent input listener (guarded by `running`). During REPEAT it
    // feeds the game; otherwise it just tracks held notes for the glow.
    d.selected.onEvent(e => {
      if (!running) return
      if (e.type === 'on') {
        activeNotes.add(e.note)
        if (phase === 'repeat') {
          const r = game.press(e.note)
          if (r === 'correct') {
            ptr++
          } else if (r === 'complete') {
            winRound()
          } else {
            loseRound()
          }
        }
      } else {
        activeNotes.delete(e.note)
      }
    })

    // ONE rAF loop: LISTEN highlights the sounding note; REPEAT shows the next
    // expected note as a guide plus the child's held notes.
    let rafId = 0
    const loop = (): void => {
      if (!running) return
      const seq = game.sequence
      if (phase === 'listen') {
        const sounding = listenIndex >= 0 && listenIndex < seq.length
        keyboard.draw(new Set(), sounding ? new Set([seq[listenIndex]]) : new Set<number>())
      } else {
        const next =
          phase === 'repeat' && ptr < seq.length ? new Set([seq[ptr]]) : new Set<number>()
        keyboard.draw(activeNotes, next)
      }
      rafId = requestAnimationFrame(loop)
    }

    // LISTEN: append a note, play the (longer) sequence highlighting each note as
    // it sounds, then switch to REPEAT.
    const playRound = (): void => {
      if (!running) return
      game.startRound()
      phase = 'listen'
      listenIndex = -1
      ptr = 0
      activeNotes.clear()
      if (d.status) d.status.textContent = 'Watch… 👀'
      const seq = game.sequence
      let step = 0
      const advanceListen = (): void => {
        if (!running || phase !== 'listen') return
        listenIndex = step
        step++
        if (step < seq.length) window.setTimeout(advanceListen, 500)
      }
      advanceListen()
      s.playSequence(
        seq.map(n => ({ midi: n, durMs: 500 })),
        () => {
          if (!running) return
          listenIndex = -1
          phase = 'repeat'
          if (d.status) d.status.textContent = 'Your turn! 🎶'
        },
      )
    }

    // Round won: level up, record, then chain a longer sequence.
    function winRound(): void {
      if (!running) return
      phase = 'done'
      if (d.status) d.status.textContent = `Level ${game.sequence.length}! 🌟`
      store.record({
        exerciseId: 'memory',
        timestamp: Date.now(),
        summary: { accuracy: 1, meanTimingDevMs: 0, meanFindMs: 0, tempoBpm: game.sequence.length },
      })
      refreshReport()
      window.setTimeout(() => {
        if (running) playRound()
      }, 1200)
    }

    // Round lost: record, then restart from length 1 (keep the best).
    function loseRound(): void {
      if (!running) return
      phase = 'done'
      if (d.status) d.status.textContent = `Oops! Best: ${game.longest} 🙈`
      store.record({
        exerciseId: 'memory',
        timestamp: Date.now(),
        summary: { accuracy: 0, meanTimingDevMs: 0, meanFindMs: 0, tempoBpm: game.longest },
      })
      refreshReport()
      window.setTimeout(() => {
        if (!running) return
        game.reset()
        playRound()
      }, 1500)
    }

    const exit = (): void => {
      running = false
      cancelAnimationFrame(rafId)
      backBtn?.removeEventListener('click', exit)
      backBtn?.classList.add('hidden')
      if (d.status) d.status.textContent = ''
      showMenu()
    }
    backBtn?.addEventListener('click', exit)
    backBtn?.classList.remove('hidden')

    rafId = requestAnimationFrame(loop)
    playRound()
  }

  /**
   * Find-the-note: the app lights ONE white key and the child finds and presses
   * it. We measure how long each find takes (find-time, ms) and the accuracy
   * across a set of `total` targets. After the set, record a session and chain a
   * FRESH set automatically so play continues. Modeled on `startMemory`: a
   * per-session `running` flag guards the rAF loop and the (un-removable) adapter
   * listener; the rAF loop draws `keyboard.draw(activeNotes, new Set([target]))`
   * so the target key GLOWS as a "press me" guide. `#back-menu` is the only way out.
   *
   * Sessions are recorded with `exerciseId:'note-find'` and the standard `Summary`
   * shape — `accuracy` from the game, `meanFindMs` from the measured find-times.
   */
  const startNoteFind = (d: ExerciseDeps, s: Synth): void => {
    s.resume()
    let game = new NoteFindGame(
      () => NOTE_FIND_NOTES[Math.floor(Math.random() * NOTE_FIND_NOTES.length)],
      8,
    )
    let running = true
    let findSum = 0 // sum of measured find-times (ms) across this set
    let shownAt = performance.now() // when the current target first appeared
    const activeNotes = new Set<number>()

    sizeCanvas(d.stageCanvas)
    sizeCanvas(d.keysCanvas)
    const stageCtx = d.stageCanvas?.getContext('2d') ?? null
    const keysCtx = d.keysCanvas?.getContext('2d') ?? null
    if (stageCtx && d.stageCanvas) stageCtx.clearRect(0, 0, d.stageCanvas.width, d.stageCanvas.height)
    const keyboard = new Keyboard(keysCtx)

    if (d.status) d.status.textContent = 'Find this key! 🔎'

    // ONE persistent input listener (guarded by `running`): track held notes for
    // the glow and, on note-ON, test the press against the current target.
    d.selected.onEvent(e => {
      if (!running) return
      if (e.type === 'on') {
        activeNotes.add(e.note)
        const r = game.press(e.note)
        if (r === 'correct') {
          findSum += performance.now() - shownAt
          if (game.done) {
            finishSet()
          } else {
            shownAt = performance.now()
            if (d.status) d.status.textContent = 'Yes! ✅'
          }
        }
        // 'wrong' keeps the status as the find prompt — no harsh penalty UI.
      } else {
        activeNotes.delete(e.note)
      }
    })

    // ONE rAF loop: the target key glows as a "press me" guide; held notes show.
    let rafId = 0
    const loop = (): void => {
      if (!running) return
      keyboard.draw(activeNotes, game.done ? new Set<number>() : new Set([game.target]))
      rafId = requestAnimationFrame(loop)
    }

    // Set complete: score it, record a session, then chain a FRESH set.
    function finishSet(): void {
      if (!running) return
      const accuracy = game.accuracy()
      const meanFindMs = game.hits > 0 ? findSum / game.hits : 0
      store.record({
        exerciseId: 'note-find',
        timestamp: Date.now(),
        summary: { accuracy, meanTimingDevMs: 0, meanFindMs, tempoBpm: 0 },
      })
      refreshReport()
      if (d.status) {
        d.status.textContent = `Great! ${Math.round(accuracy * 100)}% · ${Math.round(meanFindMs)}ms 🌟`
      }
      window.setTimeout(() => {
        if (!running) return
        game = new NoteFindGame(
          () => NOTE_FIND_NOTES[Math.floor(Math.random() * NOTE_FIND_NOTES.length)],
          8,
        )
        findSum = 0
        shownAt = performance.now()
        activeNotes.clear()
        if (d.status) d.status.textContent = 'Find this key! 🔎'
      }, 1500)
    }

    const exit = (): void => {
      running = false
      cancelAnimationFrame(rafId)
      backBtn?.removeEventListener('click', exit)
      backBtn?.classList.add('hidden')
      if (d.status) d.status.textContent = ''
      showMenu()
    }
    backBtn?.addEventListener('click', exit)
    backBtn?.classList.remove('hidden')

    rafId = requestAnimationFrame(loop)
  }

  // Scale flow: run the scale once; record a session, then auto-return to the menu.
  // The ← Menu button exits at any time during play or the result banner.
  const startScale = (scaleId: string): void => {
    let alive = true
    let stopChart: (() => void) | null = null
    let timer = 0
    const exit = (): void => {
      if (!alive) return
      alive = false
      stopChart?.()
      window.clearTimeout(timer)
      backBtn?.removeEventListener('click', exit)
      backBtn?.classList.add('hidden')
      if (status) status.textContent = ''
      showMenu()
    }
    backBtn?.addEventListener('click', exit)
    backBtn?.classList.remove('hidden')

    const spec = SCALES.find(s => s.id === scaleId) ?? SCALES[0]
    stopChart = runChart(new ScaleMode(spec), spec.title, deps, engine => {
      if (!alive) return
      store.record({ exerciseId: spec.id, timestamp: Date.now(), summary: engine.summary() })
      refreshReport()
      if (status) status.textContent = formatSummary(engine.summary())
      timer = window.setTimeout(() => exit(), 3000)
    })
  }

  // Wire the menu buttons. A click is the user gesture that may start audio.
  const buttons = document.querySelectorAll<HTMLButtonElement>('.menu-btn')
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      if (noInput) return // buttons inert without a real input source
      synth.resume()
      hideMenu()
      const activity = btn.dataset.activity
      if (activity === 'melody') resumeMelody()
      else if (activity === 'free') startFreePlay(deps, synth)
      else if (activity === 'echo') startEcho(deps, synth)
      else if (activity === 'memory') startMemory(deps, synth)
      else if (activity === 'notefind') startNoteFind(deps, synth)
      else startScale(activity ?? '')
    })
  })
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

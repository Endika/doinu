import type { InputAdapter } from '../core/input-adapter'
import { InputEventType, type InputEvent } from '../core/events'
import type { Clock } from '../core/clock'
import type { Chart, Target } from './chart'
import { Matcher, MatchOutcome } from './matcher'
import { Scorer, ScoreResult, type Summary } from './scoring'

export interface EngineOptions { windowMs: number }

export interface FrameState {
  nowMs: number
  targets: Target[]
  activeNotes: Set<number>
}

export class Engine {
  private readonly chart: Chart
  private readonly adapter: InputAdapter
  private readonly clock: Clock
  private readonly windowMs: number
  private readonly matcher: Matcher
  private readonly scorer: Scorer
  private readonly recordedMissed = new Set<string>()
  private readonly activeNotes = new Set<number>()

  constructor(chart: Chart, adapter: InputAdapter, clock: Clock, opts: EngineOptions) {
    this.chart = chart
    this.adapter = adapter
    this.clock = clock
    this.windowMs = opts.windowMs
    this.matcher = new Matcher(chart, { windowMs: opts.windowMs })
    this.scorer = new Scorer()
  }

  start(): void {
    this.adapter.onEvent(e => this.onInput(e))
    // Fire-and-forget: subscription above is already in place synchronously.
    void this.adapter.start()
  }

  stop(): void {
    this.adapter.stop()
  }

  onInput(e: InputEvent): void {
    if (e.type === InputEventType.On) this.activeNotes.add(e.note)
    else this.activeNotes.delete(e.note)

    const r = this.matcher.handle(e)
    if (r.result === MatchOutcome.Hit) {
      this.scorer.record({
        result: ScoreResult.Hit,
        timingDevMs: r.timingDevMs,
        findMs: this.computeFindMs(r.target!, e),
      })
    } else if (r.result === MatchOutcome.Wrong) {
      this.scorer.record({ result: ScoreResult.Wrong })
    }
    // 'ignored' (note-off) → no scoring.
  }

  tick(): void {
    this.matcher.advanceTo(this.clock.now())
    for (const t of this.matcher.missed()) {
      if (this.recordedMissed.has(t.id)) continue
      this.recordedMissed.add(t.id)
      this.scorer.record({ result: ScoreResult.Missed })
    }
  }

  summary(): Summary {
    return this.scorer.summary(this.chart.bpm)
  }

  /** Targets not yet hit/missed — practice (wait) mode pauses on the earliest. */
  pendingTargets(): Target[] {
    return this.matcher.pending()
  }

  frameState(): FrameState {
    return {
      nowMs: this.clock.now(),
      targets: this.chart.targets,
      activeNotes: new Set(this.activeNotes),
    }
  }

  private computeFindMs(target: Target, e: InputEvent): number {
    return Math.max(0, e.time - (target.startMs - this.windowMs))
  }
}

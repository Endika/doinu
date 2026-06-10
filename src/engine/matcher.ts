import type { InputEvent } from '../core/events'
import type { Chart, Target } from './chart'

type Status = 'pending' | 'hit' | 'missed'

export interface MatcherOptions { windowMs: number }
export interface MatchResult { result: 'hit' | 'wrong' | 'ignored'; target?: Target; timingDevMs?: number }

export class Matcher {
  private readonly windowMs: number
  private readonly targets: Target[]
  private readonly status: Map<string, Status>

  constructor(chart: Chart, opts: MatcherOptions) {
    this.windowMs = opts.windowMs
    this.targets = [...chart.targets]
    this.status = new Map(this.targets.map(t => [t.id, 'pending']))
  }

  handle(e: InputEvent): MatchResult {
    // Note-off events are not scored; they never count as wrong notes.
    if (e.type !== 'on') return { result: 'ignored' }

    let best: Target | undefined
    let bestDev = Number.POSITIVE_INFINITY
    for (const t of this.targets) {
      if (this.status.get(t.id) !== 'pending') continue
      if (t.midi !== e.note) continue
      if (e.time < t.startMs - this.windowMs || e.time > t.startMs + this.windowMs) continue
      const dev = Math.abs(e.time - t.startMs)
      if (dev < bestDev) {
        bestDev = dev
        best = t
      }
    }

    if (best) {
      this.status.set(best.id, 'hit')
      return { result: 'hit', target: best, timingDevMs: e.time - best.startMs }
    }
    return { result: 'wrong' }
  }

  advanceTo(nowMs: number): void {
    for (const t of this.targets) {
      if (this.status.get(t.id) !== 'pending') continue
      if (nowMs > t.startMs + this.windowMs) {
        this.status.set(t.id, 'missed')
      }
    }
  }

  missed(): Target[] {
    return this.targets.filter(t => this.status.get(t.id) === 'missed')
  }

  /** Targets not yet hit and not yet missed — what practice/wait mode waits on. */
  pending(): Target[] {
    return this.targets.filter(t => this.status.get(t.id) === 'pending')
  }
}

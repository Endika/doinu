export interface Clock { now(): number }
export const perfClock: Clock = { now: () => performance.now() }
export class ManualClock implements Clock {
  t = 0
  now() { return this.t }
  advance(ms: number) { this.t += ms }
}

/**
 * A clock that reports time relative to an origin on the base clock.
 * `offsetClock(base, origin).now()` === `base.now() - origin`.
 * Used to build a song-relative timeline: pick `origin = base.now() + leadIn`
 * so playback starts at `-leadIn` (notes fall in before the first beat).
 */
export function offsetClock(base: Clock, origin: number): Clock {
  return { now: () => base.now() - origin }
}

/**
 * A song clock that can be paused and resumed. Time only advances while running;
 * while paused, `now()` is frozen. Powers "practice" (wait) mode, where the score
 * freezes at the hit line until the learner plays the correct note. `setTo` snaps
 * the song time to an exact value (e.g. clamp to a note's start when it reaches
 * the line).
 */
export class PausableClock implements Clock {
  private accumulated = 0
  private lastBase = 0
  private running = false
  constructor(private readonly base: Clock) {}
  now(): number {
    return this.running ? this.accumulated + (this.base.now() - this.lastBase) : this.accumulated
  }
  setTo(ms: number): void {
    this.accumulated = ms
    this.lastBase = this.base.now()
  }
  resume(): void {
    if (this.running) return
    this.running = true
    this.lastBase = this.base.now()
  }
  pause(): void {
    if (!this.running) return
    this.accumulated += this.base.now() - this.lastBase
    this.running = false
  }
  get isRunning(): boolean {
    return this.running
  }
}

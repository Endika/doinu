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

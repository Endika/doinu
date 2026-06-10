export interface Clock { now(): number }
export const perfClock: Clock = { now: () => performance.now() }
export class ManualClock implements Clock {
  t = 0
  now() { return this.t }
  advance(ms: number) { this.t += ms }
}

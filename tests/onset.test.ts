import { describe, it, expect } from 'vitest'
import { OnsetDetector } from '../src/core/onset'

/** Count the onsets fired across a level envelope. */
function onsets(levels: number[]): number {
  const d = new OnsetDetector()
  return levels.reduce((n, l) => n + (d.feed(l) ? 1 : 0), 0)
}

describe('OnsetDetector', () => {
  it('fires once per attack in a two-strike envelope', () => {
    // attack, sustain, release..., second attack, sustain
    expect(onsets([0, 0, 0.3, 0.4, 0.1, 0.05, 0.35, 0.4])).toBe(2)
  })

  it('fires only once for a sustained note (no spurious repeats)', () => {
    expect(onsets([0, 0.3, 0.35, 0.33, 0.34, 0.31, 0.33])).toBe(1)
  })

  it('ignores low ambient noise below the floor', () => {
    expect(onsets([0.01, 0.012, 0.008, 0.011, 0.009])).toBe(0)
  })

  it('fires on a clean attack from silence on the first sound', () => {
    expect(onsets([0, 0, 0.4])).toBe(1)
  })
})

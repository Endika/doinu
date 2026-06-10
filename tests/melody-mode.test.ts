import { describe, it, expect } from 'vitest'
import { MelodyMode } from '../src/modes/melody-mode'
import { CURRICULUM } from '../src/content/curriculum'
describe('melody mode', () => {
  it('builds a playable chart from a curriculum exercise', () => {
    const ex = CURRICULUM.find(e => e.id === 'twinkle-1')!
    const chart = new MelodyMode(ex).buildChart()
    expect(chart.targets.length).toBeGreaterThan(0)
    expect(chart.targets.every(t => t.hand === 'R')).toBe(true)
  })
  it('passes when accuracy >= threshold', () => {
    const ex = CURRICULUM.find(e => e.id === 'twinkle-1')!
    const verdict = new MelodyMode(ex).evaluate({ accuracy: 0.95, meanFindMs: 800, meanTimingDevMs: 30, tempoBpm: 60 })
    expect(verdict.passed).toBe(true)
  })
  it('fails when accuracy is below threshold', () => {
    const ex = CURRICULUM.find(e => e.id === 'twinkle-1')!
    const verdict = new MelodyMode(ex).evaluate({ accuracy: 0.5, meanFindMs: 800, meanTimingDevMs: 30, tempoBpm: 60 })
    expect(verdict.passed).toBe(false)
  })
})

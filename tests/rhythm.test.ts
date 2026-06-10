import { describe, it, expect } from 'vitest'
import { scoreRhythm, beatTimes } from '../src/modes/rhythm'

describe('scoreRhythm', () => {
  it('matches each beat to the nearest tap within the window', () => {
    const r = scoreRhythm([0, 500, 1000], [20, 510, 1100], 150)
    expect(r.hits).toBe(3)
    expect(r.total).toBe(3)
    expect(r.accuracy).toBe(1)
    expect(r.meanDevMs).toBeCloseTo((20 + 10 + 100) / 3)
  })
  it('misses beats with no tap in the window', () => {
    const r = scoreRhythm([0, 500, 1000], [10], 150)
    expect(r.hits).toBe(1)
    expect(r.accuracy).toBeCloseTo(1 / 3)
  })
  it('does not reuse a tap for two beats', () => {
    // one tap near two close beats — only one beat may claim it
    const r = scoreRhythm([100, 140], [120], 150)
    expect(r.hits).toBe(1)
  })
  it('empty beats → accuracy 1', () => {
    expect(scoreRhythm([], [1, 2], 150).accuracy).toBe(1)
  })
})

describe('beatTimes', () => {
  it('spaces beats by the bpm', () => {
    expect(beatTimes(1000, 4, 120)).toEqual([1000, 1500, 2000, 2500])
  })
})

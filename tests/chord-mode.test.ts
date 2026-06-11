import { describe, it, expect } from 'vitest'
import { ChordMode } from '../src/modes/chord-mode'
import { Hand } from '../src/engine/chart'

describe('chord mode', () => {
  it('emits one co-timed target per note of each chord', () => {
    const chart = new ChordMode({
      id: 'x',
      title: 'X',
      bpm: 60, // one beat = 1000ms
      chords: [[60, 64, 67], [60, 64, 67], [60, 64, 67]],
      passAccuracy: 0.6,
    }).buildChart()

    // 3 triads → 9 targets
    expect(chart.targets).toHaveLength(9)
    // 3 distinct start times, one per chord (beat), at 0/1000/2000ms
    expect([...new Set(chart.targets.map(t => t.startMs))].sort((a, b) => a - b)).toEqual([0, 1000, 2000])
    // each chord's notes share the same startMs
    const first = chart.targets.filter(t => t.startMs === 0)
    expect(first.map(t => t.midi)).toEqual([60, 64, 67])
    // ids are unique
    expect(new Set(chart.targets.map(t => t.id)).size).toBe(9)
    // right hand
    expect(chart.targets.every(t => t.hand === Hand.Right)).toBe(true)
  })

  it('supports two-note chords', () => {
    const chart = new ChordMode({ id: 'y', title: 'Y', bpm: 120, chords: [[60, 64]], passAccuracy: 0.6 }).buildChart()
    expect(chart.targets).toHaveLength(2)
    expect(chart.targets.every(t => t.startMs === 0)).toBe(true)
  })

  it('passes/fails on the accuracy threshold', () => {
    const m = new ChordMode({ id: 'z', title: 'Z', bpm: 60, chords: [[60, 64, 67]], passAccuracy: 0.6 })
    expect(m.evaluate({ accuracy: 0.7, meanFindMs: 0, meanTimingDevMs: 0, tempoBpm: 60 }).passed).toBe(true)
    expect(m.evaluate({ accuracy: 0.5, meanFindMs: 0, meanTimingDevMs: 0, tempoBpm: 60 }).passed).toBe(false)
  })
})

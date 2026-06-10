import { describe, it, expect } from 'vitest'
import { ScaleMode, MAJOR_STEPS, SCALES } from '../src/modes/scale-mode'

describe('scale mode', () => {
  it('builds an ascending C major scale chart', () => {
    const chart = new ScaleMode({ id: 'x', title: 'X', rootMidi: 60, steps: MAJOR_STEPS, bpm: 60, passAccuracy: 0.9 }).buildChart()
    expect(chart.targets.map(t => t.midi)).toEqual([60, 62, 64, 65, 67, 69, 71, 72])
    expect(chart.targets.every(t => t.hand === 'R')).toBe(true)
    // one beat apart at 60bpm = 1000ms
    expect(chart.targets[1].startMs - chart.targets[0].startMs).toBe(1000)
  })
  it('appends a descending tail without repeating the top note', () => {
    const chart = new ScaleMode({ id: 'x', title: 'X', rootMidi: 60, steps: MAJOR_STEPS, bpm: 60, passAccuracy: 0.9, descending: true }).buildChart()
    expect(chart.targets.map(t => t.midi)).toEqual([60, 62, 64, 65, 67, 69, 71, 72, 71, 69, 67, 65, 64, 62, 60])
  })
  it('passes/fails on the accuracy threshold', () => {
    const m = new ScaleMode(SCALES[0])
    expect(m.evaluate({ accuracy: 0.95, meanFindMs: 0, meanTimingDevMs: 0, tempoBpm: 60 }).passed).toBe(true)
    expect(m.evaluate({ accuracy: 0.4, meanFindMs: 0, meanTimingDevMs: 0, tempoBpm: 60 }).passed).toBe(false)
  })
  it('ships at least an up and an up/down C major scale', () => {
    expect(SCALES.find(s => s.id === 'c-major-up')).toBeTruthy()
    expect(SCALES.find(s => s.id === 'c-major-updown')?.descending).toBe(true)
  })
})

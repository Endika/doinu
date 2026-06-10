import { describe, it, expect } from 'vitest'
import { Scorer } from '../src/engine/scoring'
describe('scoring', () => {
  it('computes accuracy and mean timing deviation from results', () => {
    const s = new Scorer()
    s.record({ result: 'hit', timingDevMs: 20 })
    s.record({ result: 'hit', timingDevMs: 60 })
    s.record({ result: 'wrong' }); s.record({ result: 'missed' })
    const m = s.summary()
    expect(m.accuracy).toBeCloseTo(0.5)      // 2 hits / 4 targets (hits + wrong + missed)
    expect(m.meanTimingDevMs).toBeCloseTo(40) // mean of |20|,|60|
  })
  it('tracks note-find latency (first-correct after target shown)', () => {
    const s = new Scorer()
    s.record({ result: 'hit', timingDevMs: 0, findMs: 1200 })
    s.record({ result: 'hit', timingDevMs: 0, findMs: 700 })
    expect(s.summary().meanFindMs).toBeCloseTo(950)
  })
})

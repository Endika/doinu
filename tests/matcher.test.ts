import { describe, it, expect } from 'vitest'
import { Matcher } from '../src/engine/matcher'
import type { Chart } from '../src/engine/chart'
const chart: Chart = { bpm: 60, targets: [
  { id: 't1', midi: 60, startMs: 0,    durMs: 500, hand: 'R' },
  { id: 't2', midi: 62, startMs: 500,  durMs: 500, hand: 'R' },
]}
describe('matcher', () => {
  it('counts an on-event within the window as a hit', () => {
    const m = new Matcher(chart, { windowMs: 150 })
    expect(m.handle({ note: 60, type: 'on', time: 40 }).result).toBe('hit')
  })
  it('counts a wrong note as a miss', () => {
    const m = new Matcher(chart, { windowMs: 150 })
    expect(m.handle({ note: 65, type: 'on', time: 40 }).result).toBe('wrong')
  })
  it('marks a target missed when its window passes with no input', () => {
    const m = new Matcher(chart, { windowMs: 150 })
    m.advanceTo(800) // both t1's window closed
    expect(m.missed().map(t => t.id)).toContain('t1')
  })
})

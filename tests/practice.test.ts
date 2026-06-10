import { describe, it, expect } from 'vitest'
import { ManualClock, PausableClock } from '../src/core/clock'
import { Matcher } from '../src/engine/matcher'
import type { Chart } from '../src/engine/chart'

describe('PausableClock — practice/wait mode', () => {
  it('advances while running and freezes while paused', () => {
    const base = new ManualClock()
    const c = new PausableClock(base)
    c.setTo(-3000)
    c.resume()
    base.advance(1000)
    expect(c.now()).toBe(-2000) // ran 1000 from -3000
    c.pause()
    base.advance(500)
    expect(c.now()).toBe(-2000) // frozen while paused
    c.resume()
    base.advance(1000)
    expect(c.now()).toBe(-1000) // resumes from where it froze
  })
  it('setTo snaps the song time (clamp to a note at the hit line)', () => {
    const base = new ManualClock()
    const c = new PausableClock(base)
    c.resume()
    base.advance(123)
    c.setTo(500)
    expect(c.now()).toBe(500)
  })
})

describe('Matcher.pending — what wait mode is waiting on', () => {
  const chart: Chart = {
    bpm: 60,
    targets: [
      { id: 'a', midi: 60, startMs: 0, durMs: 500, hand: 'R' },
      { id: 'b', midi: 62, startMs: 500, durMs: 500, hand: 'R' },
    ],
  }
  it('lists unplayed targets and drops them once hit', () => {
    const m = new Matcher(chart, { windowMs: 150 })
    expect(m.pending().map(t => t.id)).toEqual(['a', 'b'])
    m.handle({ note: 60, type: 'on', time: 0 })
    expect(m.pending().map(t => t.id)).toEqual(['b'])
  })
})

import { describe, it, expect } from 'vitest'
import { ManualClock, offsetClock } from '../src/core/clock'
import { leadInMs, expectedNotesAt } from '../src/render/renderer'

describe('offsetClock', () => {
  it('reports base time minus the origin (negative during lead-in)', () => {
    const base = new ManualClock()
    const lead = 3000
    const origin = base.now() + lead // base.now() === 0 → origin 3000
    const song = offsetClock(base, origin)
    expect(song.now()).toBe(-3000) // song starts at -leadIn
    base.advance(3000)
    expect(song.now()).toBe(0) // first beat reaches the hit line
    base.advance(500)
    expect(song.now()).toBe(500)
  })
})

describe('leadInMs', () => {
  it('is the full-height fall time (hitLineY / pxPerMs)', () => {
    expect(leadInMs(600, 0.15)).toBeCloseTo(4000)
  })
  it('is zero when speed is non-positive (guard)', () => {
    expect(leadInMs(600, 0)).toBe(0)
  })
})

describe('expectedNotesAt', () => {
  const targets = [
    { midi: 60, startMs: 0 },
    { midi: 62, startMs: 1000 },
    { midi: 64, startMs: 2000 },
  ]
  it('returns notes whose window is open at nowMs', () => {
    expect([...expectedNotesAt(targets, 1000, 150)]).toEqual([62])
  })
  it('returns nothing during the lead-in (negative nowMs far from any target)', () => {
    expect(expectedNotesAt(targets, -2000, 150).size).toBe(0)
  })
  it('includes a note exactly at the window boundary', () => {
    expect(expectedNotesAt(targets, 150, 150).has(60)).toBe(true)
    expect(expectedNotesAt(targets, 151, 150).has(60)).toBe(false)
  })
})

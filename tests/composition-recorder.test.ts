import { describe, it, expect } from 'vitest'
import { CompositionRecorder } from '../src/modes/composition-recorder'
import { InputEventType, type InputEvent } from '../src/core/events'

const on = (note: number, time: number): InputEvent => ({ note, time, type: InputEventType.On })
const off = (note: number, time: number): InputEvent => ({ note, time, type: InputEventType.Off })

describe('CompositionRecorder', () => {
  it('captures real timing, normalised so the first note starts at 0', () => {
    const r = new CompositionRecorder()
    ;[on(60, 1000), off(60, 1500), on(62, 2000), off(62, 2200)].forEach(e => r.feed(e))
    expect(r.finish(2200)).toEqual([
      { midi: 60, startMs: 0, durMs: 500 },
      { midi: 62, startMs: 1000, durMs: 200 },
    ])
  })

  it('closes a still-held note at the stop time', () => {
    const r = new CompositionRecorder()
    r.feed(on(60, 1000))
    expect(r.finish(1300)).toEqual([{ midi: 60, startMs: 0, durMs: 300 }])
  })

  it('ignores a note-off with no matching note-on', () => {
    const r = new CompositionRecorder()
    r.feed(off(60, 500))
    expect(r.finish(600)).toEqual([])
  })

  it('returns nothing when nothing was played', () => {
    expect(new CompositionRecorder().finish(0)).toEqual([])
  })

  it('counts notes played (closed and still held)', () => {
    const r = new CompositionRecorder()
    expect(r.count).toBe(0)
    r.feed(on(60, 0))
    expect(r.count).toBe(1) // held
    r.feed(off(60, 100))
    r.feed(on(62, 200))
    expect(r.count).toBe(2) // one closed + one held
  })
})

import { describe, it, expect } from 'vitest'
import { NoteTracker } from '../src/core/note-tracker'
import { InputEventType, type InputEvent } from '../src/core/events'

// Feed a sequence of readings and collect every event emitted (time = frame idx).
function run(readings: (number | null)[], stable = 3): InputEvent[] {
  const tracker = new NoteTracker(stable)
  const out: InputEvent[] = []
  readings.forEach((m, i) => out.push(...tracker.feed(m, i)))
  return out
}

const types = (es: InputEvent[]) => es.map(e => `${e.type}:${e.note}`)

describe('NoteTracker', () => {
  it('commits a note only after it holds for `stableFrames`', () => {
    expect(run([60, 60])).toEqual([]) // not yet stable (needs 3)
    const es = run([60, 60, 60])
    expect(types(es)).toEqual([`${InputEventType.On}:60`])
  })

  it('stops the old note and starts the new one on a stable change', () => {
    const es = run([60, 60, 60, 62, 62, 62])
    expect(types(es)).toEqual([`${InputEventType.On}:60`, `${InputEventType.Off}:60`, `${InputEventType.On}:62`])
  })

  it('emits a note-off when the sound stops (stable silence)', () => {
    const es = run([60, 60, 60, null, null, null])
    expect(types(es)).toEqual([`${InputEventType.On}:60`, `${InputEventType.Off}:60`])
  })

  it('debounces a brief glitch (single stray frame) without spurious events', () => {
    // C4 sounding, one stray E4 frame, back to C4 -> nothing changes.
    const es = run([60, 60, 60, 64, 60, 60, 60])
    expect(types(es)).toEqual([`${InputEventType.On}:60`])
  })

  it('exposes the currently sounding note for stop cleanup', () => {
    const t = new NoteTracker(2)
    t.feed(67, 0); t.feed(67, 1)
    expect(t.sounding).toBe(67)
  })
})

describe('NoteTracker re-attack (repeated same note)', () => {
  it('re-triggers the sounding note on an amplitude onset', () => {
    const t = new NoteTracker(2)
    const out: InputEvent[] = []
    out.push(...t.feed(60, 0)) // commit C
    out.push(...t.feed(60, 1)) // (already commits on 2nd identical with stable=2)
    out.push(...t.feed(60, 2, true)) // re-attack on the same pitch
    expect(types(out)).toEqual([
      `${InputEventType.On}:60`,
      `${InputEventType.Off}:60`,
      `${InputEventType.On}:60`,
    ])
  })

  it('does not re-trigger the same note without an onset', () => {
    const t = new NoteTracker(2)
    const out: InputEvent[] = []
    out.push(...t.feed(60, 0))
    out.push(...t.feed(60, 1))
    out.push(...t.feed(60, 2)) // no onset
    out.push(...t.feed(60, 3))
    expect(types(out)).toEqual([`${InputEventType.On}:60`])
  })
})

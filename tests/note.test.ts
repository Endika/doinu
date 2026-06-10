import { describe, it, expect } from 'vitest'
import { noteFromMidi } from '../src/core/note'
describe('note model', () => {
  it('maps middle C (60) to pitch class 0 and its color', () => {
    const n = noteFromMidi(60)
    expect(n.pitchClass).toBe(0)
    expect(n.octave).toBe(4)
    expect(n.colorClass).toBe('pc-0')
  })
  it('maps A4 (69) to pitch class 9', () => { expect(noteFromMidi(69).pitchClass).toBe(9) })
})

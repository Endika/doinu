import { describe, it, expect } from 'vitest'
import { chord, scale, C4, F4, G4, MINOR_TRIAD } from '../src/core/pitch'

describe('pitch builders', () => {
  it('builds a major triad from a root', () => {
    expect(chord(C4)).toEqual([60, 64, 67]) // C E G
    expect(chord(F4)).toEqual([65, 69, 72]) // F A C5
    expect(chord(G4)).toEqual([67, 71, 74]) // G B D5
  })

  it('builds other chord qualities from an interval recipe', () => {
    expect(chord(C4, MINOR_TRIAD)).toEqual([60, 63, 67]) // C Eb G
  })

  it('builds a major scale (one octave, including the top)', () => {
    expect(scale(C4)).toEqual([60, 62, 64, 65, 67, 69, 71, 72])
    expect(scale(G4)).toEqual([67, 69, 71, 72, 74, 76, 78, 79]) // G major: one sharp (F#)
  })
})

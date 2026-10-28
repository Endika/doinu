import { describe, it, expect } from 'vitest'
import { autoFingers, leftHandFingers, mirrorFingers, isWhiteMidi } from '../src/core/fingering'

const C4 = 60,
  D4 = 62,
  E4 = 64,
  F4 = 65,
  G4 = 67,
  A4 = 69,
  Bb4 = 70,
  C5 = 72,
  Fs4 = 66

describe('fingering: white keys', () => {
  it('knows the black keys', () => {
    expect(isWhiteMidi(C4)).toBe(true)
    expect(isWhiteMidi(Fs4)).toBe(false)
    expect(isWhiteMidi(Bb4)).toBe(false)
  })
})

describe('fingering: five-finger position', () => {
  it('numbers the C position from the thumb', () => {
    expect(autoFingers([C4, D4, E4, F4, G4])).toEqual([1, 2, 3, 4, 5])
  })

  it('keeps the C hand shape when the phrase sits higher up', () => {
    // E-F#-G is still the C-position shape: 3-4-5, not a fresh thumb on E.
    expect(autoFingers([E4, Fs4, G4, Fs4, E4])).toEqual([3, 4, 5, 4, 3])
  })

  it('gives a black key the finger next to it, never the same as its neighbour', () => {
    // A then Bb: A takes the index finger, so Bb moves to the middle finger.
    expect(autoFingers([G4, A4, Bb4, A4, G4])).toEqual([1, 2, 3, 2, 1])
  })
})

describe('fingering: lines that leave the position', () => {
  it('uses the scale pattern for a one-octave scale', () => {
    expect(autoFingers([C4, D4, E4, F4, G4, A4, 71, C5], { scale: true })).toEqual([
      1, 2, 3, 1, 2, 3, 4, 5,
    ])
  })

  it('uses the flat-fourth pattern when the fourth degree is black', () => {
    // F major: F G A Bb C D E F
    expect(autoFingers([65, 67, 69, 70, 72, 74, 76, 77], { scale: true })).toEqual([
      1, 2, 3, 4, 1, 2, 3, 4,
    ])
  })

  it('does not use the scale pattern unless the phrase is a scale', () => {
    // The same line as a melody keeps the C position and leaves A, B, C unmarked.
    expect(autoFingers([C4, D4, E4, F4, G4, A4, 71, C5])).toEqual([
      1,
      2,
      3,
      4,
      5,
      undefined,
      undefined,
      undefined,
    ])
  })

  it('keeps the position that covers the most notes, not the lowest one', () => {
    // A low G under a C-position tune: the tune keeps C-D-E-F-G, the G stays unmarked.
    expect(autoFingers([C4, D4, E4, C4, E4, D4, C4, 55, C4])).toEqual([
      1,
      2,
      3,
      1,
      3,
      2,
      1,
      undefined,
      1,
    ])
  })

  it('gives a black key between two phrase notes the finger below it', () => {
    // E-D#-E as in Für Elise: 5-4-5, not 5-5-5.
    expect(autoFingers([64, 63, 64, 63, 64, 59, 62, 60, 57])).toEqual([5, 4, 5, 4, 5, 2, 4, 3, 1])
  })

  it('numbers leaps by white key so the numbers grow with the pitch', () => {
    expect(autoFingers([C4, E4, G4, E4, C4, G4])).toEqual([1, 3, 5, 3, 1, 5])
  })

  it('leaves leaps past the fifth white key unmarked instead of clamping to 5', () => {
    expect(autoFingers([60, 64, 67, 72, 76])).toEqual([1, 3, 5, undefined, undefined])
    expect(autoFingers([C4, E4, G4, E4, C4, G4, C5])).toEqual([1, 3, 5, 3, 1, 5, undefined])
  })

  it('marks only the notes of Twinkle that the C position covers', () => {
    // La sits one white key above the little finger: no honest number for it.
    expect(autoFingers([C4, C4, G4, G4, A4, A4, G4])).toEqual([1, 1, 5, 5, undefined, undefined, 5])
  })
})

describe('fingering: chords and hands', () => {
  it('numbers a triad as a five-finger shape', () => {
    expect(autoFingers([C4, E4, 67])).toEqual([1, 3, 5])
    expect(autoFingers([F4, A4, C5])).toEqual([1, 3, 5])
  })

  it('mirrors the left hand so its thumb is the highest finger', () => {
    expect(mirrorFingers(autoFingers([48, 50, 52, 53, 55]))).toEqual([5, 4, 3, 2, 1])
  })

  it('leaves notes without an honest answer unmarked', () => {
    expect(autoFingers([])).toEqual([])
    expect(leftHandFingers([])).toEqual([])
  })
})

describe('fingering: left hand', () => {
  const C3 = 48

  it('mirrors a five-finger position', () => {
    expect(leftHandFingers([48, 50, 52, 53, 55])).toEqual([5, 4, 3, 2, 1])
    expect(leftHandFingers([55, 53, 52, 50, 48])).toEqual([1, 2, 3, 4, 5])
  })

  it('plays the C major scale 5-4-3-2-1-3-2-1, not the mirrored right hand', () => {
    const up = [C3, 50, 52, 53, 55, 57, 59, 60]
    expect(leftHandFingers(up, { scale: true })).toEqual([5, 4, 3, 2, 1, 3, 2, 1])
    expect(leftHandFingers([...up].reverse(), { scale: true })).toEqual([1, 2, 3, 1, 2, 3, 4, 5])
  })

  it('uses the same left-hand pattern when the fourth degree is black (F major)', () => {
    expect(leftHandFingers([53, 55, 57, 58, 60, 62, 64, 65], { scale: true })).toEqual([
      5, 4, 3, 2, 1, 3, 2, 1,
    ])
  })

  it('mirrors leaps and leaves the ones past the fifth white key unmarked', () => {
    expect(leftHandFingers([C3, 52, 55, 60])).toEqual([5, 3, 1, undefined])
  })
})

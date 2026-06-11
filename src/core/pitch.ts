/**
 * Single source of truth for note names -> MIDI, plus tiny semantic builders so
 * content reads as music instead of magic numbers. Middle C = 60; octave numbers
 * change at C (so B3 = 59, C4 = 60). This is the ONLY place note values live —
 * songs.ts and the learning path both import from here.
 */

// Low octave (left-hand / bass).
export const C3 = 48, D3 = 50, E3 = 52, F3 = 53, G3 = 55, A3 = 57, B3 = 59
// Middle octave (the home of most lessons). Sharps included where used.
export const C4 = 60, Cs4 = 61, D4 = 62, Ds4 = 63, E4 = 64, F4 = 65, Fs4 = 66
export const G4 = 67, Gs4 = 68, A4 = 69, Bb4 = 70, B4 = 71
// Upper octave.
export const C5 = 72, D5 = 74, E5 = 76, F5 = 77, Fs5 = 78, G5 = 79

// Interval recipes (semitone offsets from the root).
export const MAJOR_TRIAD = [0, 4, 7]
export const MINOR_TRIAD = [0, 3, 7]
export const MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11, 12] // one octave, including the top

/** Build a chord's midi notes from a root and an interval recipe (defaults to a major triad). */
export function chord(rootMidi: number, intervals: number[] = MAJOR_TRIAD): number[] {
  return intervals.map(i => rootMidi + i)
}

/** Build a scale's midi notes from a root and an interval recipe (defaults to a major scale). */
export function scale(rootMidi: number, intervals: number[] = MAJOR_SCALE): number[] {
  return intervals.map(i => rootMidi + i)
}

// Generated practice pieces ("studies"): scales, arpeggios, five-finger patterns
// and broken chords in all twelve keys. Correct BY CONSTRUCTION (built from the
// pitch helpers, not hand-authored), copyright-free, and pedagogically real —
// this is how the library gets genuine volume without faking melodies. Each
// study is a right-hand `Song`, so it plays through the same Songs screen.

import type { Song } from './songs'
import { scale, chord, MAJOR_SCALE, NATURAL_MINOR_SCALE, MAJOR_TRIAD } from '../core/pitch'

interface Key {
  name: string
  root: number // midi of the key's tonic in octave 4
}

// Twelve chromatic keys from middle C up, so every study fits the 61-key range.
const KEYS: Key[] = [
  { name: 'C', root: 60 }, { name: 'C#', root: 61 }, { name: 'D', root: 62 }, { name: 'E♭', root: 63 },
  { name: 'E', root: 64 }, { name: 'F', root: 65 }, { name: 'F#', root: 66 }, { name: 'G', root: 67 },
  { name: 'A♭', root: 68 }, { name: 'A', root: 69 }, { name: 'B♭', root: 70 }, { name: 'B', root: 71 },
]

const piece = (id: string, title: string, midis: number[], bpm = 90, dur = 0.5): Song => ({
  id,
  title,
  bpm,
  right: midis.map(midi => ({ midi, dur })),
})

/** Append the descent of a line (without repeating its top note). */
const upDown = (notes: number[]): number[] => [...notes, ...notes.slice(0, -1).reverse()]

/** Root - third - fifth - octave - fifth - third - root. */
const arpeggio = (root: number): number[] => {
  const triad = chord(root, MAJOR_TRIAD)
  return [...triad, root + 12, ...triad.slice().reverse()]
}

/** Penta (do-re-mi-fa-sol) up and back down. */
const fiveFinger = (root: number): number[] => upDown([0, 2, 4, 5, 7].map(i => root + i))

/** A simple broken-chord pattern over one bar. */
const brokenChord = (root: number): number[] => {
  const [r, third, fifth] = chord(root, MAJOR_TRIAD)
  return [r, third, fifth, root + 12, fifth, third, r, third]
}

export const STUDIES: Song[] = KEYS.flatMap(({ name, root }) => [
  piece(`study-major-${name}`, `${name} major scale 🪜`, upDown(scale(root, MAJOR_SCALE))),
  piece(`study-minor-${name}`, `${name} minor scale 🌙`, upDown(scale(root, NATURAL_MINOR_SCALE))),
  piece(`study-arp-${name}`, `${name} arpeggio 🎵`, arpeggio(root)),
  piece(`study-five-${name}`, `${name} five-finger ✋`, fiveFinger(root)),
  piece(`study-broken-${name}`, `${name} broken chords 🎹`, brokenChord(root)),
])

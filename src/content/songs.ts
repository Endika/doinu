// Public-domain song library. Right-hand melodies are authored as a simple
// sequential list (pitch + duration in beats); start times are derived by
// accumulating durations. An optional left hand carries explicit timing so the
// two hands line up. Everything is public domain (traditional / folk / classical
// / pre-1900, plus "Happy Birthday" which entered the public domain in 2016).
//
// Pitch reference: middle C = 60. C major unless noted.

import { C4, D4, E4, F4, G4, A4, B4, Bb4, C5, A3, B3, Ds4, Gs4, G3 } from '../core/pitch'

/** A right-hand melody note: pitch + duration in beats (sequential). */
export interface MelodyNote {
  midi: number
  dur: number
}

/** A left-hand note with explicit start (beats) so it aligns with the melody. */
export interface HandNote {
  midi: number
  startBeat: number
  dur: number
}

export interface Song {
  id: string
  title: string
  bpm: number
  right: MelodyNote[]
  /** Optional simple left-hand accompaniment (root notes). */
  left?: HandNote[]
}

// Short local aliases over the single source of truth (core/pitch). C5/G3 come
// straight from pitch; the left-hand roots use plain arithmetic (e.g. C - 12).
const C = C4, D = D4, E = E4, F = F4, G = G4, A = A4, B = B4, Bb = Bb4
// Chromatic notes used by the famous classical themes (Eb/D# = the same key).
const Eb = Ds4, Ds = Ds4, Gs = Gs4

export const SONGS: Song[] = [
  {
    id: 'twinkle',
    title: 'Twinkle Twinkle ⭐',
    bpm: 96,
    right: [
      { midi: C, dur: 1 }, { midi: C, dur: 1 }, { midi: G, dur: 1 }, { midi: G, dur: 1 },
      { midi: A, dur: 1 }, { midi: A, dur: 1 }, { midi: G, dur: 2 },
      { midi: F, dur: 1 }, { midi: F, dur: 1 }, { midi: E, dur: 1 }, { midi: E, dur: 1 },
      { midi: D, dur: 1 }, { midi: D, dur: 1 }, { midi: C, dur: 2 },
      { midi: G, dur: 1 }, { midi: G, dur: 1 }, { midi: F, dur: 1 }, { midi: F, dur: 1 },
      { midi: E, dur: 1 }, { midi: E, dur: 1 }, { midi: D, dur: 2 },
      { midi: G, dur: 1 }, { midi: G, dur: 1 }, { midi: F, dur: 1 }, { midi: F, dur: 1 },
      { midi: E, dur: 1 }, { midi: E, dur: 1 }, { midi: D, dur: 2 },
      { midi: C, dur: 1 }, { midi: C, dur: 1 }, { midi: G, dur: 1 }, { midi: G, dur: 1 },
      { midi: A, dur: 1 }, { midi: A, dur: 1 }, { midi: G, dur: 2 },
      { midi: F, dur: 1 }, { midi: F, dur: 1 }, { midi: E, dur: 1 }, { midi: E, dur: 1 },
      { midi: D, dur: 1 }, { midi: D, dur: 1 }, { midi: C, dur: 2 },
    ],
    // Simple LH roots, one chord root per bar (2 beats each), to demo two hands.
    left: [
      { midi: C - 12, startBeat: 0, dur: 2 }, { midi: F - 12, startBeat: 2, dur: 2 },
      { midi: C - 12, startBeat: 4, dur: 2 }, { midi: G - 12, startBeat: 6, dur: 2 },
      { midi: F - 12, startBeat: 8, dur: 2 }, { midi: C - 12, startBeat: 10, dur: 2 },
      { midi: G - 12, startBeat: 12, dur: 2 }, { midi: C - 12, startBeat: 14, dur: 2 },
    ],
  },
  {
    id: 'mary',
    title: 'Mary Had a Little Lamb 🐑',
    bpm: 100,
    right: [
      { midi: E, dur: 1 }, { midi: D, dur: 1 }, { midi: C, dur: 1 }, { midi: D, dur: 1 },
      { midi: E, dur: 1 }, { midi: E, dur: 1 }, { midi: E, dur: 2 },
      { midi: D, dur: 1 }, { midi: D, dur: 1 }, { midi: D, dur: 2 },
      { midi: E, dur: 1 }, { midi: G, dur: 1 }, { midi: G, dur: 2 },
      { midi: E, dur: 1 }, { midi: D, dur: 1 }, { midi: C, dur: 1 }, { midi: D, dur: 1 },
      { midi: E, dur: 1 }, { midi: E, dur: 1 }, { midi: E, dur: 1 }, { midi: E, dur: 1 },
      { midi: D, dur: 1 }, { midi: D, dur: 1 }, { midi: E, dur: 1 }, { midi: D, dur: 1 },
      { midi: C, dur: 4 },
    ],
  },
  {
    id: 'ode',
    title: 'Ode to Joy 🎉',
    bpm: 112,
    right: [
      { midi: E, dur: 1 }, { midi: E, dur: 1 }, { midi: F, dur: 1 }, { midi: G, dur: 1 },
      { midi: G, dur: 1 }, { midi: F, dur: 1 }, { midi: E, dur: 1 }, { midi: D, dur: 1 },
      { midi: C, dur: 1 }, { midi: C, dur: 1 }, { midi: D, dur: 1 }, { midi: E, dur: 1 },
      { midi: E, dur: 1.5 }, { midi: D, dur: 0.5 }, { midi: D, dur: 2 },
      { midi: E, dur: 1 }, { midi: E, dur: 1 }, { midi: F, dur: 1 }, { midi: G, dur: 1 },
      { midi: G, dur: 1 }, { midi: F, dur: 1 }, { midi: E, dur: 1 }, { midi: D, dur: 1 },
      { midi: C, dur: 1 }, { midi: C, dur: 1 }, { midi: D, dur: 1 }, { midi: E, dur: 1 },
      { midi: D, dur: 1.5 }, { midi: C, dur: 0.5 }, { midi: C, dur: 2 },
    ],
    left: [
      { midi: C - 12, startBeat: 0, dur: 4 }, { midi: G3, startBeat: 4, dur: 4 },
      { midi: C - 12, startBeat: 8, dur: 4 }, { midi: G3, startBeat: 12, dur: 4 },
      { midi: C - 12, startBeat: 16, dur: 4 }, { midi: G3, startBeat: 20, dur: 4 },
      { midi: C - 12, startBeat: 24, dur: 4 }, { midi: C - 12, startBeat: 28, dur: 4 },
    ],
  },
  {
    id: 'jingle',
    title: 'Jingle Bells 🔔',
    bpm: 120,
    right: [
      { midi: E, dur: 1 }, { midi: E, dur: 1 }, { midi: E, dur: 2 },
      { midi: E, dur: 1 }, { midi: E, dur: 1 }, { midi: E, dur: 2 },
      { midi: E, dur: 1 }, { midi: G, dur: 1 }, { midi: C, dur: 1 }, { midi: D, dur: 1 },
      { midi: E, dur: 4 },
      { midi: F, dur: 1 }, { midi: F, dur: 1 }, { midi: F, dur: 1 }, { midi: F, dur: 1 },
      { midi: F, dur: 1 }, { midi: E, dur: 1 }, { midi: E, dur: 1 }, { midi: E, dur: 1 },
      { midi: G, dur: 1 }, { midi: G, dur: 1 }, { midi: F, dur: 1 }, { midi: D, dur: 1 },
      { midi: C, dur: 4 },
    ],
  },
  {
    id: 'frere',
    title: 'Frère Jacques 🔁',
    bpm: 104,
    right: [
      { midi: C, dur: 1 }, { midi: D, dur: 1 }, { midi: E, dur: 1 }, { midi: C, dur: 1 },
      { midi: C, dur: 1 }, { midi: D, dur: 1 }, { midi: E, dur: 1 }, { midi: C, dur: 1 },
      { midi: E, dur: 1 }, { midi: F, dur: 1 }, { midi: G, dur: 2 },
      { midi: E, dur: 1 }, { midi: F, dur: 1 }, { midi: G, dur: 2 },
      { midi: G, dur: 0.5 }, { midi: A, dur: 0.5 }, { midi: G, dur: 0.5 }, { midi: F, dur: 0.5 },
      { midi: E, dur: 1 }, { midi: C, dur: 1 },
      { midi: G, dur: 0.5 }, { midi: A, dur: 0.5 }, { midi: G, dur: 0.5 }, { midi: F, dur: 0.5 },
      { midi: E, dur: 1 }, { midi: C, dur: 1 },
      { midi: C, dur: 1 }, { midi: G3, dur: 1 }, { midi: C, dur: 2 },
      { midi: C, dur: 1 }, { midi: G3, dur: 1 }, { midi: C, dur: 2 },
    ],
  },
  {
    id: 'macdonald',
    title: 'Old MacDonald 🐔',
    bpm: 108,
    right: [
      { midi: C, dur: 1 }, { midi: C, dur: 1 }, { midi: C, dur: 1 }, { midi: G, dur: 1 },
      { midi: A, dur: 1 }, { midi: A, dur: 1 }, { midi: G, dur: 2 },
      { midi: E, dur: 1 }, { midi: E, dur: 1 }, { midi: D, dur: 1 }, { midi: D, dur: 1 },
      { midi: C, dur: 4 },
    ],
  },
  {
    id: 'hotcross',
    title: 'Hot Cross Buns 🥐',
    bpm: 100,
    right: [
      { midi: E, dur: 1 }, { midi: D, dur: 1 }, { midi: C, dur: 2 },
      { midi: E, dur: 1 }, { midi: D, dur: 1 }, { midi: C, dur: 2 },
      { midi: C, dur: 0.5 }, { midi: C, dur: 0.5 }, { midi: C, dur: 0.5 }, { midi: C, dur: 0.5 },
      { midi: D, dur: 0.5 }, { midi: D, dur: 0.5 }, { midi: D, dur: 0.5 }, { midi: D, dur: 0.5 },
      { midi: E, dur: 1 }, { midi: D, dur: 1 }, { midi: C, dur: 2 },
    ],
  },
  {
    id: 'birthday',
    title: 'Happy Birthday 🎂',
    bpm: 108,
    right: [
      { midi: C, dur: 0.75 }, { midi: C, dur: 0.25 }, { midi: D, dur: 1 }, { midi: C, dur: 1 },
      { midi: F, dur: 1 }, { midi: E, dur: 2 },
      { midi: C, dur: 0.75 }, { midi: C, dur: 0.25 }, { midi: D, dur: 1 }, { midi: C, dur: 1 },
      { midi: G, dur: 1 }, { midi: F, dur: 2 },
      { midi: C, dur: 0.75 }, { midi: C, dur: 0.25 }, { midi: C5, dur: 1 }, { midi: A, dur: 1 },
      { midi: F, dur: 1 }, { midi: E, dur: 1 }, { midi: D, dur: 2 },
      { midi: Bb, dur: 0.75 }, { midi: Bb, dur: 0.25 }, { midi: A, dur: 1 }, { midi: F, dur: 1 },
      { midi: G, dur: 1 }, { midi: F, dur: 2 },
    ],
  },
  {
    id: 'row',
    title: 'Row Your Boat 🚣',
    bpm: 100,
    right: [
      { midi: C, dur: 1 }, { midi: C, dur: 1 }, { midi: C, dur: 0.75 }, { midi: D, dur: 0.25 }, { midi: E, dur: 1 },
      { midi: E, dur: 0.75 }, { midi: D, dur: 0.25 }, { midi: E, dur: 0.75 }, { midi: F, dur: 0.25 }, { midi: G, dur: 2 },
      { midi: C5, dur: 0.5 }, { midi: C5, dur: 0.5 }, { midi: C5, dur: 0.5 }, { midi: G, dur: 0.5 }, { midi: G, dur: 0.5 }, { midi: G, dur: 0.5 },
      { midi: E, dur: 0.5 }, { midi: E, dur: 0.5 }, { midi: E, dur: 0.5 }, { midi: C, dur: 0.5 }, { midi: C, dur: 0.5 }, { midi: C, dur: 0.5 },
      { midi: G, dur: 0.75 }, { midi: F, dur: 0.25 }, { midi: E, dur: 0.75 }, { midi: D, dur: 0.25 }, { midi: C, dur: 2 },
    ],
  },
  {
    id: 'auclair',
    title: 'Au Clair de la Lune 🌙',
    bpm: 100,
    right: [
      { midi: C, dur: 1 }, { midi: C, dur: 1 }, { midi: C, dur: 1 }, { midi: D, dur: 1 },
      { midi: E, dur: 2 }, { midi: D, dur: 2 },
      { midi: C, dur: 1 }, { midi: E, dur: 1 }, { midi: D, dur: 1 }, { midi: D, dur: 1 }, { midi: C, dur: 4 },
      { midi: D, dur: 1 }, { midi: D, dur: 1 }, { midi: D, dur: 1 }, { midi: D, dur: 1 },
      { midi: A, dur: 2 }, { midi: A, dur: 2 },
      { midi: D, dur: 1 }, { midi: C, dur: 1 }, { midi: B, dur: 1 }, { midi: A, dur: 1 }, { midi: G, dur: 4 },
      { midi: C, dur: 1 }, { midi: C, dur: 1 }, { midi: C, dur: 1 }, { midi: D, dur: 1 },
      { midi: E, dur: 2 }, { midi: D, dur: 2 },
      { midi: C, dur: 1 }, { midi: E, dur: 1 }, { midi: D, dur: 1 }, { midi: D, dur: 1 }, { midi: C, dur: 4 },
    ],
  },
  {
    id: 'lightlyrow',
    title: 'Lightly Row 🎶',
    bpm: 100,
    right: [
      { midi: G, dur: 1 }, { midi: E, dur: 1 }, { midi: E, dur: 2 },
      { midi: F, dur: 1 }, { midi: D, dur: 1 }, { midi: D, dur: 2 },
      { midi: C, dur: 1 }, { midi: D, dur: 1 }, { midi: E, dur: 1 }, { midi: F, dur: 1 }, { midi: G, dur: 2 },
      { midi: G, dur: 1 }, { midi: E, dur: 1 }, { midi: E, dur: 2 },
      { midi: F, dur: 1 }, { midi: D, dur: 1 }, { midi: D, dur: 2 },
      { midi: C, dur: 1 }, { midi: E, dur: 1 }, { midi: G, dur: 1 }, { midi: E, dur: 1 }, { midi: C, dur: 2 },
    ],
  },
  {
    id: 'threemice',
    title: 'Three Blind Mice 🐭',
    bpm: 100,
    right: [
      { midi: E, dur: 1 }, { midi: D, dur: 1 }, { midi: C, dur: 2 },
      { midi: E, dur: 1 }, { midi: D, dur: 1 }, { midi: C, dur: 2 },
      { midi: G, dur: 1 }, { midi: F, dur: 1 }, { midi: F, dur: 1 }, { midi: E, dur: 2 },
      { midi: G, dur: 1 }, { midi: F, dur: 1 }, { midi: F, dur: 1 }, { midi: E, dur: 2 },
    ],
  },
  {
    id: 'london',
    title: 'London Bridge 🌉',
    bpm: 110,
    right: [
      { midi: G, dur: 1 }, { midi: A, dur: 1 }, { midi: G, dur: 1 }, { midi: F, dur: 1 },
      { midi: E, dur: 1 }, { midi: F, dur: 1 }, { midi: G, dur: 2 },
      { midi: D, dur: 1 }, { midi: E, dur: 1 }, { midi: F, dur: 2 },
      { midi: E, dur: 1 }, { midi: F, dur: 1 }, { midi: G, dur: 2 },
      { midi: G, dur: 1 }, { midi: A, dur: 1 }, { midi: G, dur: 1 }, { midi: F, dur: 1 },
      { midi: E, dur: 1 }, { midi: F, dur: 1 }, { midi: G, dur: 2 },
      { midi: D, dur: 2 }, { midi: G, dur: 1 }, { midi: E, dur: 1 }, { midi: C, dur: 2 },
    ],
  },
  {
    id: 'yankee',
    title: 'Yankee Doodle 🎺',
    bpm: 120,
    right: [
      { midi: C, dur: 1 }, { midi: C, dur: 1 }, { midi: D, dur: 1 }, { midi: E, dur: 1 },
      { midi: C, dur: 1 }, { midi: E, dur: 1 }, { midi: D, dur: 2 },
      { midi: C, dur: 1 }, { midi: C, dur: 1 }, { midi: D, dur: 1 }, { midi: E, dur: 1 }, { midi: C, dur: 2 },
      { midi: C, dur: 1 }, { midi: C, dur: 1 }, { midi: D, dur: 1 }, { midi: E, dur: 1 },
      { midi: F, dur: 1 }, { midi: E, dur: 1 }, { midi: D, dur: 1 }, { midi: C, dur: 1 },
      { midi: B, dur: 1 }, { midi: G, dur: 1 }, { midi: A, dur: 1 }, { midi: B, dur: 1 }, { midi: C, dur: 2 },
    ],
  },
  {
    id: 'beethoven5',
    title: "Beethoven's 5th 🎼",
    bpm: 108,
    right: [
      { midi: G, dur: 0.5 }, { midi: G, dur: 0.5 }, { midi: G, dur: 0.5 }, { midi: Eb, dur: 2 },
      { midi: F, dur: 0.5 }, { midi: F, dur: 0.5 }, { midi: F, dur: 0.5 }, { midi: D, dur: 2 },
    ],
  },
  {
    id: 'furelise',
    title: 'Für Elise 🎹',
    bpm: 100,
    right: [
      { midi: E, dur: 0.5 }, { midi: Ds, dur: 0.5 }, { midi: E, dur: 0.5 }, { midi: Ds, dur: 0.5 },
      { midi: E, dur: 0.5 }, { midi: B3, dur: 0.5 }, { midi: D, dur: 0.5 }, { midi: C, dur: 0.5 }, { midi: A3, dur: 1 },
      { midi: C, dur: 0.5 }, { midi: E, dur: 0.5 }, { midi: A, dur: 0.5 }, { midi: B, dur: 1 },
      { midi: E, dur: 0.5 }, { midi: Gs, dur: 0.5 }, { midi: B, dur: 0.5 }, { midi: C5, dur: 1 },
      { midi: E, dur: 0.5 }, { midi: Ds, dur: 0.5 }, { midi: E, dur: 0.5 }, { midi: Ds, dur: 0.5 },
      { midi: E, dur: 0.5 }, { midi: B3, dur: 0.5 }, { midi: D, dur: 0.5 }, { midi: C, dur: 0.5 }, { midi: A3, dur: 1 },
    ],
  },
  {
    id: 'silentnight',
    title: 'Silent Night 🌌',
    bpm: 90,
    right: [
      { midi: G, dur: 1.5 }, { midi: A, dur: 0.5 }, { midi: G, dur: 1 }, { midi: E, dur: 3 },
      { midi: G, dur: 1.5 }, { midi: A, dur: 0.5 }, { midi: G, dur: 1 }, { midi: E, dur: 3 },
      { midi: D, dur: 2 }, { midi: D, dur: 1 }, { midi: B, dur: 3 },
      { midi: C, dur: 2 }, { midi: C, dur: 1 }, { midi: G, dur: 3 },
    ],
  },
  {
    id: 'saints',
    title: 'When the Saints 🎺',
    bpm: 112,
    right: [
      { midi: C, dur: 1 }, { midi: E, dur: 1 }, { midi: F, dur: 1 }, { midi: G, dur: 3 },
      { midi: C, dur: 1 }, { midi: E, dur: 1 }, { midi: F, dur: 1 }, { midi: G, dur: 3 },
      { midi: C, dur: 1 }, { midi: E, dur: 1 }, { midi: F, dur: 1 }, { midi: G, dur: 2 },
      { midi: E, dur: 1 }, { midi: C, dur: 1 }, { midi: E, dur: 1 }, { midi: D, dur: 2 },
      { midi: E, dur: 1 }, { midi: E, dur: 1 }, { midi: D, dur: 1 }, { midi: C, dur: 2 },
      { midi: C, dur: 1 }, { midi: E, dur: 1 }, { midi: G, dur: 2 },
      { midi: G, dur: 1 }, { midi: F, dur: 1 }, { midi: E, dur: 1 }, { midi: C, dur: 2 },
    ],
  },
  {
    id: 'susanna',
    title: 'Oh! Susanna 🪕',
    bpm: 110,
    right: [
      { midi: C, dur: 0.5 }, { midi: D, dur: 0.5 }, { midi: E, dur: 1 }, { midi: G, dur: 1 }, { midi: G, dur: 1 },
      { midi: A, dur: 1 }, { midi: G, dur: 1 }, { midi: E, dur: 1 }, { midi: C, dur: 1 }, { midi: D, dur: 1 },
      { midi: E, dur: 1 }, { midi: E, dur: 1 }, { midi: D, dur: 1 }, { midi: C, dur: 1 }, { midi: D, dur: 2 },
      { midi: C, dur: 0.5 }, { midi: D, dur: 0.5 }, { midi: E, dur: 1 }, { midi: G, dur: 1 }, { midi: G, dur: 1 },
      { midi: A, dur: 1 }, { midi: G, dur: 1 }, { midi: E, dur: 1 }, { midi: C, dur: 1 }, { midi: D, dur: 1 },
      { midi: E, dur: 1 }, { midi: E, dur: 1 }, { midi: D, dur: 1 }, { midi: D, dur: 1 }, { midi: C, dur: 2 },
    ],
  },
]

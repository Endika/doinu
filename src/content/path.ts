// "El idioma del piano" — the learning path (skill tree).
//
// A journey where each step teaches ONE new "word": new notes -> black keys ->
// two notes together -> first chord -> two hands -> (later) more keys, reading.
// The WHOLE ladder is authored here so the path screen can show the full journey
// from day one (far units locked as "soon"); only `milestone: 1` lessons are
// playable. Note values come from the single source of truth in core/pitch — no
// magic numbers here; chords and scales are built semantically.

import type { MelodyNote, HandNote } from './songs'
import {
  C3, D3, E3, F3, G3,
  C4, D4, E4, F4, G4, A4, Fs4, Gs4, Bb4,
  C5,
  chord, scale,
} from '../core/pitch'

export enum LessonKind { Melody = 'melody', NoteFind = 'notefind', Chord = 'chord', TwoHands = 'twohands', Reading = 'reading' }

export interface PathLesson {
  id: string
  title: string
  /** Kid-facing "new word" this lesson teaches. */
  concept: string
  kind: LessonKind
  /** 1 = playable now; higher = visible but not yet built ("soon"). */
  milestone: 1 | 2 | 3
  bpm: number
  passAccuracy: number
  /** Melody lessons: the right-hand note sequence (one per beat). */
  notes?: number[]
  /** Chord lessons: each inner array is one chord played together. */
  chords?: number[][]
  /** Two-hand lessons: a right-hand melody (sequential) and a left hand (explicit timing). */
  right?: MelodyNote[]
  left?: HandNote[]
}

export interface PathUnit {
  id: string
  title: string
  concept: string
  lessons: PathLesson[]
}

/** Repeat one chord n times — for "play this chord several times" lessons. */
const repeat = <T>(value: T, n: number): T[] => Array.from({ length: n }, () => value)

export const PATH: PathUnit[] = [
  {
    id: 'u1',
    title: '🎵 The notes',
    concept: 'White keys, one at a time',
    lessons: [
      { id: 'u1-doremi', title: 'Do Re Mi', concept: 'Your first three notes', kind: LessonKind.Melody, milestone: 1, bpm: 60, passAccuracy: 0.7, notes: [C4, D4, E4] },
      { id: 'u1-hand', title: 'The whole hand', concept: 'Five notes: Do to Sol', kind: LessonKind.Melody, milestone: 1, bpm: 70, passAccuracy: 0.7, notes: [C4, D4, E4, F4, G4] },
      { id: 'u1-octave', title: 'Up to high Do', concept: 'The full octave', kind: LessonKind.Melody, milestone: 1, bpm: 72, passAccuracy: 0.75, notes: scale(C4) },
      { id: 'u1-tune', title: 'A little tune', concept: 'Jumping between notes', kind: LessonKind.Melody, milestone: 1, bpm: 80, passAccuracy: 0.75, notes: [C4, E4, G4, E4, C4, G4, C5] },
    ],
  },
  {
    id: 'u2',
    title: '🎹 Black keys',
    concept: 'New sounds between the white keys',
    lessons: [
      { id: 'u2-fsharp', title: 'Meet Fa#', concept: 'Your first black key', kind: LessonKind.Melody, milestone: 1, bpm: 70, passAccuracy: 0.7, notes: [E4, Fs4, G4, Fs4, E4] },
      { id: 'u2-bflat', title: 'Meet Sib', concept: 'Another black key', kind: LessonKind.Melody, milestone: 1, bpm: 70, passAccuracy: 0.7, notes: [A4, Bb4, A4, G4, A4] },
      { id: 'u2-blacks', title: 'Black-key walk', concept: 'Several black keys', kind: LessonKind.Melody, milestone: 1, bpm: 66, passAccuracy: 0.7, notes: [Fs4, Gs4, Bb4, Gs4, Fs4] },
    ],
  },
  {
    id: 'u3',
    title: '🤝 Playing together',
    concept: 'More than one note at once',
    lessons: [
      { id: 'u3-two', title: 'Two notes together', concept: 'Do and Mi at the same time', kind: LessonKind.Chord, milestone: 1, bpm: 50, passAccuracy: 0.6, chords: repeat([C4, E4], 3) },
      { id: 'u3-triad-c', title: 'Your first chord', concept: 'The C major chord', kind: LessonKind.Chord, milestone: 1, bpm: 45, passAccuracy: 0.6, chords: repeat(chord(C4), 3) },
      { id: 'u3-triad-f', title: 'The F chord', concept: 'A new chord shape', kind: LessonKind.Chord, milestone: 1, bpm: 45, passAccuracy: 0.6, chords: repeat(chord(F4), 2) },
      { id: 'u3-triad-g', title: 'The G chord', concept: 'A new chord shape', kind: LessonKind.Chord, milestone: 1, bpm: 45, passAccuracy: 0.6, chords: repeat(chord(G4), 2) },
      { id: 'u3-changes', title: 'Change chords', concept: 'Move between chords', kind: LessonKind.Chord, milestone: 1, bpm: 40, passAccuracy: 0.6, chords: [chord(C4), chord(F4), chord(G4), chord(C4)] },
    ],
  },
  {
    id: 'u4',
    title: '🙌 Two hands',
    concept: 'The left hand joins in',
    lessons: [
      {
        id: 'u4-lh', title: 'The left hand', concept: 'Playing low notes', kind: LessonKind.TwoHands,
        milestone: 1, bpm: 70, passAccuracy: 0.65,
        right: [],
        left: [
          { midi: C3, startBeat: 0, dur: 1 }, { midi: D3, startBeat: 1, dur: 1 },
          { midi: E3, startBeat: 2, dur: 1 }, { midi: F3, startBeat: 3, dur: 1 },
          { midi: G3, startBeat: 4, dur: 1 },
        ],
      },
      {
        id: 'u4-both', title: 'Melody + bass', concept: 'Both hands together', kind: LessonKind.TwoHands,
        milestone: 1, bpm: 60, passAccuracy: 0.65,
        right: [{ midi: C4, dur: 1 }, { midi: D4, dur: 1 }, { midi: E4, dur: 1 }, { midi: F4, dur: 1 }, { midi: G4, dur: 2 }],
        left: [{ midi: C3, startBeat: 0, dur: 2 }, { midi: F3, startBeat: 2, dur: 2 }, { midi: G3, startBeat: 4, dur: 2 }],
      },
      {
        id: 'u4-song', title: 'A two-hand song', concept: 'A whole song, both hands', kind: LessonKind.TwoHands,
        milestone: 1, bpm: 72, passAccuracy: 0.65,
        right: [
          { midi: C4, dur: 1 }, { midi: C4, dur: 1 }, { midi: G4, dur: 1 }, { midi: G4, dur: 1 },
          { midi: A4, dur: 1 }, { midi: A4, dur: 1 }, { midi: G4, dur: 2 },
        ],
        left: [
          { midi: C3, startBeat: 0, dur: 2 }, { midi: F3, startBeat: 2, dur: 2 },
          { midi: F3, startBeat: 4, dur: 2 }, { midi: C3, startBeat: 6, dur: 2 },
        ],
      },
    ],
  },
  {
    id: 'u5',
    title: '🗝️ More keys',
    concept: 'New home notes',
    lessons: [
      { id: 'u5-gmajor', title: 'G major', concept: 'A scale with one sharp', kind: LessonKind.Melody, milestone: 1, bpm: 72, passAccuracy: 0.75, notes: scale(G4) },
      { id: 'u5-fmajor', title: 'F major', concept: 'A scale with one flat', kind: LessonKind.Melody, milestone: 1, bpm: 72, passAccuracy: 0.75, notes: scale(F4) },
    ],
  },
  {
    id: 'u6',
    title: '📖 Reading music',
    concept: 'Notes on the staff, no colors',
    lessons: [
      { id: 'u6-staff', title: 'The staff', concept: 'Where notes live', kind: LessonKind.Reading, milestone: 1, bpm: 60, passAccuracy: 0.7, notes: [C4, D4, E4] },
      { id: 'u6-read-note', title: 'Read a note', concept: 'Name what you see', kind: LessonKind.Reading, milestone: 1, bpm: 60, passAccuracy: 0.7, notes: [C4, D4, E4, F4, G4] },
      { id: 'u6-read-melody', title: 'Read a melody', concept: 'Play without colors', kind: LessonKind.Reading, milestone: 1, bpm: 60, passAccuracy: 0.7, notes: scale(C4) },
    ],
  },
]

/** Flattened lessons in path order (units then lessons). */
export const PATH_LESSONS: PathLesson[] = PATH.flatMap(u => u.lessons)

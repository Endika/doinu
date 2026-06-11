// "El idioma del piano" — the learning path (skill tree).
//
// A journey where each step teaches ONE new "word": new notes → black keys →
// two notes together → first chord → (later) two hands, more keys, reading.
// The WHOLE ladder is authored here so the path screen can show the full journey
// from day one (far units locked as "soon"); only `milestone: 1` lessons are
// playable in this build. Later milestones (2, 3) exist as data and render as
// "pronto 🔒" until their formats ship.
//
// Pitch reference: middle C = 60. C major unless the lesson is about a black key
// or another key. Lesson/unit titles are plain strings (same as the song library).

import type { MelodyNote, HandNote } from './songs'

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

// Note constants (white = natural, plus the black keys this path introduces).
const C = 60, D = 62, E = 64, F = 65, G = 67, A = 69, B = 71, C5 = 72, D5 = 74
const Fs = 66 // F#
const Gs = 68 // G#
const Bb = 70 // Bb
// Left-hand (low) notes for the two-hand unit.
const C3 = 48, D3 = 50, E3 = 52, F3 = 53, G3 = 55

export const PATH: PathUnit[] = [
  {
    id: 'u1',
    title: '🎵 The notes',
    concept: 'White keys, one at a time',
    lessons: [
      { id: 'u1-doremi', title: 'Do Re Mi', concept: 'Your first three notes', kind: LessonKind.Melody, milestone: 1, bpm: 60, passAccuracy: 0.7, notes: [C, D, E] },
      { id: 'u1-hand', title: 'The whole hand', concept: 'Five notes: Do to Sol', kind: LessonKind.Melody, milestone: 1, bpm: 70, passAccuracy: 0.7, notes: [C, D, E, F, G] },
      { id: 'u1-octave', title: 'Up to high Do', concept: 'The full octave', kind: LessonKind.Melody, milestone: 1, bpm: 72, passAccuracy: 0.75, notes: [C, D, E, F, G, A, B, C5] },
      { id: 'u1-tune', title: 'A little tune', concept: 'Jumping between notes', kind: LessonKind.Melody, milestone: 1, bpm: 80, passAccuracy: 0.75, notes: [C, E, G, E, C, G, C5] },
    ],
  },
  {
    id: 'u2',
    title: '🎹 Black keys',
    concept: 'New sounds between the white keys',
    lessons: [
      { id: 'u2-fsharp', title: 'Meet Fa#', concept: 'Your first black key', kind: LessonKind.Melody, milestone: 1, bpm: 70, passAccuracy: 0.7, notes: [E, Fs, G, Fs, E] },
      { id: 'u2-bflat', title: 'Meet Sib', concept: 'Another black key', kind: LessonKind.Melody, milestone: 1, bpm: 70, passAccuracy: 0.7, notes: [A, Bb, A, G, A] },
      { id: 'u2-blacks', title: 'Black-key walk', concept: 'Several black keys', kind: LessonKind.Melody, milestone: 1, bpm: 66, passAccuracy: 0.7, notes: [Fs, Gs, Bb, Gs, Fs] },
    ],
  },
  {
    id: 'u3',
    title: '🤝 Playing together',
    concept: 'More than one note at once',
    lessons: [
      { id: 'u3-two', title: 'Two notes together', concept: 'Do and Mi at the same time', kind: LessonKind.Chord, milestone: 1, bpm: 50, passAccuracy: 0.6, chords: [[C, E], [C, E], [C, E]] },
      { id: 'u3-triad-c', title: 'Your first chord', concept: 'The C major chord', kind: LessonKind.Chord, milestone: 1, bpm: 45, passAccuracy: 0.6, chords: [[C, E, G], [C, E, G], [C, E, G]] },
      { id: 'u3-triad-f', title: 'The F chord', concept: 'A new chord shape', kind: LessonKind.Chord, milestone: 1, bpm: 45, passAccuracy: 0.6, chords: [[F, A, C5], [F, A, C5]] },
      { id: 'u3-triad-g', title: 'The G chord', concept: 'A new chord shape', kind: LessonKind.Chord, milestone: 1, bpm: 45, passAccuracy: 0.6, chords: [[G, B, D5], [G, B, D5]] },
      { id: 'u3-changes', title: 'Change chords', concept: 'Move between chords', kind: LessonKind.Chord, milestone: 1, bpm: 40, passAccuracy: 0.6, chords: [[C, E, G], [F, A, C5], [G, B, D5], [C, E, G]] },
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
        right: [{ midi: C, dur: 1 }, { midi: D, dur: 1 }, { midi: E, dur: 1 }, { midi: F, dur: 1 }, { midi: G, dur: 2 }],
        left: [{ midi: C3, startBeat: 0, dur: 2 }, { midi: F3, startBeat: 2, dur: 2 }, { midi: G3, startBeat: 4, dur: 2 }],
      },
      {
        id: 'u4-song', title: 'A two-hand song', concept: 'A whole song, both hands', kind: LessonKind.TwoHands,
        milestone: 1, bpm: 72, passAccuracy: 0.65,
        right: [
          { midi: C, dur: 1 }, { midi: C, dur: 1 }, { midi: G, dur: 1 }, { midi: G, dur: 1 },
          { midi: A, dur: 1 }, { midi: A, dur: 1 }, { midi: G, dur: 2 },
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
      { id: 'u5-gmajor', title: 'G major', concept: 'A scale with one sharp', kind: LessonKind.Melody, milestone: 3, bpm: 72, passAccuracy: 0.75, notes: [G, A, B, C5, D5, 76, 78, 79] },
      { id: 'u5-fmajor', title: 'F major', concept: 'A scale with one flat', kind: LessonKind.Melody, milestone: 3, bpm: 72, passAccuracy: 0.75, notes: [F, G, A, Bb, C5, D5, 76, 77] },
    ],
  },
  {
    id: 'u6',
    title: '📖 Reading music',
    concept: 'Notes on the staff, no colors',
    lessons: [
      { id: 'u6-staff', title: 'The staff', concept: 'Where notes live', kind: LessonKind.Reading, milestone: 3, bpm: 60, passAccuracy: 0.7 },
      { id: 'u6-read-note', title: 'Read a note', concept: 'Name what you see', kind: LessonKind.Reading, milestone: 3, bpm: 60, passAccuracy: 0.7 },
      { id: 'u6-read-melody', title: 'Read a melody', concept: 'Play without colors', kind: LessonKind.Reading, milestone: 3, bpm: 60, passAccuracy: 0.7 },
    ],
  },
]

/** Flattened lessons in path order (units then lessons). */
export const PATH_LESSONS: PathLesson[] = PATH.flatMap(u => u.lessons)

import { describe, it, expect } from 'vitest'
import { buildPathProgress, isPassed, PathLessonState } from '../src/progress/path-progress'
import type { Session } from '../src/progress/metrics-store'
import { LessonKind, type PathLesson } from '../src/content/path'

function ses(accuracy: number, meanFindMs: number, timestamp: number): Session {
  return { id: `s${timestamp}`, exerciseId: 'x', timestamp, accuracy, meanFindMs, meanTimingDevMs: 0, tempoBpm: 60 }
}

// Minimal fixture: 3 buildable lessons + 1 future (soon) lesson.
const lessons: PathLesson[] = [
  { id: 'a', title: 'A', concept: '', kind: LessonKind.Melody, milestone: 1, bpm: 60, passAccuracy: 0.7, notes: [60] },
  { id: 'b', title: 'B', concept: '', kind: LessonKind.Melody, milestone: 1, bpm: 60, passAccuracy: 0.7, notes: [62] },
  { id: 'c', title: 'C', concept: '', kind: LessonKind.Chord, milestone: 1, bpm: 60, passAccuracy: 0.6, chords: [[60, 64]] },
  { id: 'd', title: 'D', concept: '', kind: LessonKind.TwoHands, milestone: 2, bpm: 60, passAccuracy: 0.7 },
]

function progress(map: Record<string, Session[]>): string[] {
  return buildPathProgress(lessons, id => map[id] ?? []).map(p => p.state)
}

describe('isPassed', () => {
  it('is true when any session met the accuracy bar', () => {
    expect(isPassed([ses(0.4, 0, 1), ses(0.8, 0, 2)], 0.7)).toBe(true)
    expect(isPassed([ses(0.4, 0, 1)], 0.7)).toBe(false)
  })
})

describe('buildPathProgress', () => {
  it('starts with only the first lesson current; later ones locked, future ones soon', () => {
    expect(progress({})).toEqual([PathLessonState.Current, PathLessonState.Locked, PathLessonState.Locked, PathLessonState.Soon])
  })

  it('passing a lesson ONCE unlocks the next (it becomes current)', () => {
    expect(progress({ a: [ses(0.9, 100, 1)] })).toEqual([PathLessonState.Passed, PathLessonState.Current, PathLessonState.Locked, PathLessonState.Soon])
  })

  it('awards mastery (⭐) after three passing sessions', () => {
    const three = [ses(0.9, 100, 1), ses(0.9, 100, 2), ses(0.9, 100, 3)]
    expect(progress({ a: three })).toEqual([PathLessonState.Mastered, PathLessonState.Current, PathLessonState.Locked, PathLessonState.Soon])
  })

  it('a low-accuracy session does not unlock the next', () => {
    expect(progress({ a: [ses(0.4, 100, 1)] })).toEqual([PathLessonState.Current, PathLessonState.Locked, PathLessonState.Locked, PathLessonState.Soon])
  })

  it('milestone-2 lessons are always soon, even with sessions recorded', () => {
    expect(progress({ a: [ses(0.9, 1, 1)], b: [ses(0.9, 1, 2)], c: [ses(0.9, 1, 3)], d: [ses(0.9, 1, 4)] }))
      .toEqual([PathLessonState.Passed, PathLessonState.Passed, PathLessonState.Passed, PathLessonState.Soon])
  })
})

import { describe, it, expect } from 'vitest'
import { availableHands, HandSelection } from '../src/modes/song-mode'
import { lessonNeedsPolyphony } from '../src/progress/path-progress'
import { LessonKind, type PathLesson } from '../src/content/path'
import type { Song } from '../src/content/songs'

const rightOnly: Song = { id: 'r', title: 'R', bpm: 100, right: [{ midi: 60, dur: 1 }] }
const twoHand: Song = { ...rightOnly, id: 't', left: [{ midi: 48, startBeat: 0, dur: 1 }] }

const lesson = (kind: LessonKind): PathLesson =>
  ({ id: 'x', title: 'X', concept: '', kind, milestone: 1, bpm: 100, passAccuracy: 0.7 })

describe('availableHands', () => {
  it('offers all of a two-hand song on a polyphonic input', () => {
    expect(availableHands(twoHand, true)).toEqual([HandSelection.Right, HandSelection.Left, HandSelection.Both])
  })
  it('drops "both" on a monophonic input but keeps single hands', () => {
    expect(availableHands(twoHand, false)).toEqual([HandSelection.Right, HandSelection.Left])
  })
  it('a right-hand-only song is unaffected', () => {
    expect(availableHands(rightOnly, false)).toEqual([HandSelection.Right])
  })
})

describe('lessonNeedsPolyphony', () => {
  it('is true for chord and two-hand lessons', () => {
    expect(lessonNeedsPolyphony(lesson(LessonKind.Chord))).toBe(true)
    expect(lessonNeedsPolyphony(lesson(LessonKind.TwoHands))).toBe(true)
  })
  it('is false for monophonic lesson kinds', () => {
    expect(lessonNeedsPolyphony(lesson(LessonKind.Melody))).toBe(false)
    expect(lessonNeedsPolyphony(lesson(LessonKind.Reading))).toBe(false)
    expect(lessonNeedsPolyphony(lesson(LessonKind.NoteFind))).toBe(false)
  })
})

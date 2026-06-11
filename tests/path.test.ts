import { describe, it, expect } from 'vitest'
import { PATH, PATH_LESSONS } from '../src/content/path'

describe('learning path content', () => {
  it('has all six units of the ladder', () => {
    expect(PATH.map(u => u.id)).toEqual(['u1', 'u2', 'u3', 'u4', 'u5', 'u6'])
  })

  it('has globally unique lesson ids', () => {
    const ids = PATH_LESSONS.map(l => l.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('every milestone-1 lesson is playable (has melody notes or chords)', () => {
    const m1 = PATH_LESSONS.filter(l => l.milestone === 1)
    expect(m1.length).toBeGreaterThan(0)
    for (const l of m1) {
      if (l.kind === 'melody') expect(l.notes && l.notes.length > 0).toBe(true)
      else if (l.kind === 'chord') expect(l.chords && l.chords.length > 0).toBe(true)
      else throw new Error(`milestone-1 lesson ${l.id} has non-playable kind ${l.kind}`)
    }
  })

  it('introduces at least one black key and at least two chords in milestone 1', () => {
    const m1 = PATH_LESSONS.filter(l => l.milestone === 1)
    const blackKeys = new Set([1, 3, 6, 8, 10]) // C#, D#, F#, G#, A# pitch classes
    const hasBlack = m1.some(l => (l.notes ?? []).some(n => blackKeys.has(n % 12)))
    expect(hasBlack).toBe(true)
    const chordCount = m1.filter(l => l.kind === 'chord').length
    expect(chordCount).toBeGreaterThanOrEqual(2)
  })

  it('keeps later milestones present as data (the visible-but-locked roadmap)', () => {
    expect(PATH_LESSONS.some(l => l.milestone === 2)).toBe(true)
    expect(PATH_LESSONS.some(l => l.milestone === 3)).toBe(true)
  })
})

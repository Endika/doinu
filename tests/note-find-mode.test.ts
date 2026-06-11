import { describe, it, expect } from 'vitest'
import { NoteFindGame, NOTE_FIND_NOTES, PressResult } from '../src/modes/note-find-mode'

describe('NoteFindGame', () => {
  it('advances on a correct press and tracks accuracy', () => {
    const targets = [60, 64, 67]; let i = 0
    const g = new NoteFindGame(() => targets[i++ % targets.length], 3)
    expect(g.target).toBe(60)
    expect(g.press(60)).toBe(PressResult.Correct)
    expect(g.target).toBe(64)
    expect(g.press(62)).toBe(PressResult.Wrong)   // wrong, target unchanged
    expect(g.target).toBe(64)
    expect(g.press(64)).toBe(PressResult.Correct)
    expect(g.press(67)).toBe(PressResult.Correct) // 3rd hit → done
    expect(g.done).toBe(true)
    expect(g.hits).toBe(3)
    expect(g.wrongs).toBe(1)
    expect(g.accuracy()).toBeCloseTo(3 / 4)
  })
  it('starts with accuracy 1 before any press', () => {
    expect(new NoteFindGame(() => 60).accuracy()).toBe(1)
  })
  it('ships the white-key note bank', () => {
    expect(NOTE_FIND_NOTES).toEqual([60, 62, 64, 65, 67, 69, 71, 72])
  })
})

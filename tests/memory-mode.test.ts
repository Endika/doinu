import { describe, it, expect } from 'vitest'
import { MemoryGame, MEMORY_NOTES } from '../src/modes/memory-mode'

describe('MemoryGame', () => {
  it('grows the sequence and tracks the longest completed run', () => {
    const notes = [60, 62, 64]; let i = 0
    const g = new MemoryGame(() => notes[i++ % notes.length])
    g.startRound()                      // seq [60]
    expect(g.press(60)).toBe('complete')
    expect(g.longest).toBe(1)
    g.startRound()                      // seq [60,62]
    expect(g.press(60)).toBe('correct')
    expect(g.press(62)).toBe('complete')
    expect(g.longest).toBe(2)
  })
  it('a wrong press loses the round', () => {
    const g = new MemoryGame(() => 60)
    g.startRound()                      // [60]
    expect(g.press(64)).toBe('wrong')
  })
  it('reset keeps the best length', () => {
    const notes = [60, 62]; let i = 0
    const g = new MemoryGame(() => notes[i++ % notes.length])
    g.startRound(); g.press(60)         // complete len 1
    g.reset()
    expect(g.sequence).toEqual([])
    expect(g.longest).toBe(1)
  })
  it('ships the white-key note bank', () => {
    expect(MEMORY_NOTES).toEqual([60, 62, 64, 65, 67, 69, 71, 72])
  })
})

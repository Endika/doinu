import { describe, it, expect } from 'vitest'
import { SequenceMatcher, ECHO_PHRASES } from '../src/modes/echo-mode'

describe('SequenceMatcher', () => {
  it('matches a perfect echo with accuracy 1', () => {
    const m = new SequenceMatcher([60, 62, 64])
    expect(m.press(60)).toBe('correct')
    expect(m.press(62)).toBe('correct')
    expect(m.press(64)).toBe('correct')
    expect(m.done).toBe(true)
    expect(m.accuracy()).toBe(1)
  })
  it('counts wrong presses without advancing and lowers accuracy', () => {
    const m = new SequenceMatcher([60, 62])
    expect(m.press(61)).toBe('wrong') // wrong, no advance
    expect(m.index).toBe(0)
    expect(m.press(60)).toBe('correct')
    expect(m.press(62)).toBe('correct')
    expect(m.done).toBe(true)
    expect(m.wrongs).toBe(1)
    expect(m.accuracy()).toBeCloseTo(2 / 3)
  })
  it('ships a few phrases', () => {
    expect(ECHO_PHRASES.length).toBeGreaterThanOrEqual(3)
    expect(ECHO_PHRASES.every(p => p.notes.length > 0 && p.noteDurMs > 0)).toBe(true)
  })
})

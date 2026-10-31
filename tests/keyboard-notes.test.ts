import { describe, it, expect } from 'vitest'
import { Keyboard } from '../src/render/keyboard'

describe('Keyboard.notes — the keys a player can press', () => {
  it('lists every drawn key, low to high', () => {
    const notes = new Keyboard(null).notes()
    expect(notes).toHaveLength(61)
    expect(notes[0]).toBe(36)
    expect(notes[notes.length - 1]).toBe(96)
  })
  it('follows a custom range', () => {
    expect(new Keyboard(null, { midiLow: 60, midiHigh: 64 }).notes()).toEqual([60, 61, 62, 63, 64])
  })
})

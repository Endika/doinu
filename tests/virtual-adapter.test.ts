import { describe, it, expect } from 'vitest'
import { noteForKeyX } from '../src/core/virtual-adapter'

// Same white-key count as the renderer layout for 36..96: five octaves + C7.
const W = 1080
const WW = W / 36

describe('virtual keyboard hit-test', () => {
  it('maps the centre of the first white key to C (36)', () => {
    expect(noteForKeyX(WW / 2, W)).toBe(36)
  })

  it('maps a point between C and D to the black key 37 (smallest rect wins)', () => {
    const blackCentre = WW - 0.3 * WW
    expect(noteForKeyX(blackCentre, W)).toBe(37)
  })

  it('maps a point past the black key onto D (38)', () => {
    expect(noteForKeyX(WW + 0.6 * WW, W)).toBe(38)
  })

  it('returns null outside every key', () => {
    expect(noteForKeyX(-1, W)).toBeNull()
    expect(noteForKeyX(W, W)).toBeNull()
  })
})

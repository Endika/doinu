import { describe, it, expect } from 'vitest'
import { noteForKeyX, noteForKeyPoint } from '../src/core/virtual-adapter'

// Same white-key count as the renderer layout for 36..96: five octaves + C7.
const W = 1080
const H = 200
const WW = W / 36

describe('virtual keyboard hit-test (x only, legacy)', () => {
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

describe('virtual keyboard hit-test (2D, matches what is drawn)', () => {
  const blackCentre = WW - 0.3 * WW // inside the C# black key column

  it('hits the black key inside its drawn region (top 60%)', () => {
    expect(noteForKeyPoint(blackCentre, H * 0.2, W, H)).toBe(37)
  })

  it('hits the white key below the black key (bottom band)', () => {
    // The black key only spans the top 60%; below it the white key continues.
    expect(noteForKeyPoint(blackCentre, H * 0.9, W, H)).toBe(36)
  })

  it('hits the white key top area away from black columns', () => {
    expect(noteForKeyPoint(WW * 1.6, H * 0.2, W, H)).toBe(38)
  })

  it('returns null outside the keyboard', () => {
    expect(noteForKeyPoint(-1, H * 0.2, W, H)).toBeNull()
    expect(noteForKeyPoint(W, H * 0.2, W, H)).toBeNull()
    expect(noteForKeyPoint(WW / 2, H + 1, W, H)).toBeNull()
  })
})

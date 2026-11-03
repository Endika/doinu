import { describe, it, expect } from 'vitest'
import { keyRect, noteForKeyPoint, KEYBOARD_LOW, KEYBOARD_HIGH } from '../src/render/keyboard'
import { barRect } from '../src/render/renderer'

// Range 60..72 over an 800px canvas: 8 white keys → whiteWidth = 100.
describe('keyRect — notes line up over real piano keys', () => {
  it('places white keys edge-to-edge', () => {
    expect(keyRect(60, 800, 60, 72)).toEqual({ x: 0, width: 100, isBlack: false })
    expect(keyRect(62, 800, 60, 72)).toEqual({ x: 100, width: 100, isBlack: false })
    expect(keyRect(72, 800, 60, 72)).toEqual({ x: 700, width: 100, isBlack: false })
  })
  it('overlays black keys at 60% width between neighbours', () => {
    // C#4 (61) sits between C (index 0) and D: x = 100 - 30 = 70, width 60.
    expect(keyRect(61, 800, 60, 72)).toEqual({ x: 70, width: 60, isBlack: true })
  })
  it('returns null outside the range', () => {
    expect(keyRect(59, 800, 60, 72)).toBeNull()
    expect(keyRect(73, 800, 60, 72)).toBeNull()
  })
})

describe('barRect — falling note centred over its key', () => {
  it('a falling note bar sits centred within the white key it belongs to', () => {
    const bar = barRect(62, 800, 60, 72) // key x=100..200
    expect(bar.x).toBeGreaterThanOrEqual(100)
    expect(bar.x + bar.width).toBeLessThanOrEqual(200)
    // centred: equal margins on both sides of the 100px key
    expect(bar.x - 100).toBeCloseTo(200 - (bar.x + bar.width))
  })
})

describe('noteForKeyPoint — tap targets match the drawn keys', () => {
  // Default range 36..96: five octaves + C7 = 36 white keys.
  const W = 1080
  const H = 200
  const WW = W / 36
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

  it('maps the centre of every drawn key back to that key', () => {
    for (let midi = KEYBOARD_LOW; midi <= KEYBOARD_HIGH; midi++) {
      const rect = keyRect(midi, W)
      if (!rect) throw new Error(`no rect for ${midi}`)
      // Black keys: middle of their drawn height; white keys: below the black keys.
      const y = rect.isBlack ? H * 0.3 : H * 0.9
      expect(noteForKeyPoint(rect.x + rect.width / 2, y, W, H)).toBe(midi)
    }
  })

  it('follows a custom range the same way keyRect does', () => {
    // Range 60..72 over 800px: C#4 is drawn at x 70..130.
    expect(noteForKeyPoint(90, 10, 800, 100, 60, 72)).toBe(61)
    expect(noteForKeyPoint(90, 90, 800, 100, 60, 72)).toBe(60)
  })
})

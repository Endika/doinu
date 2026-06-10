import { describe, it, expect } from 'vitest'
import { keyRect } from '../src/render/keyboard'
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

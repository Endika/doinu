import { describe, it, expect } from 'vitest'
import { staffStep } from '../src/render/staff'

describe('staffStep (treble, naturals)', () => {
  it('puts E4 on the bottom line (step 0)', () => {
    expect(staffStep(64)).toBe(0) // E4
  })
  it('puts middle C two steps below the bottom line (ledger)', () => {
    expect(staffStep(60)).toBe(-2) // C4
  })
  it('places the white keys in ascending diatonic order', () => {
    // C4 D4 E4 F4 G4 A4 B4 C5
    expect([60, 62, 64, 65, 67, 69, 71, 72].map(staffStep)).toEqual([-2, -1, 0, 1, 2, 3, 4, 5])
  })
  it('treats a sharp as its natural letter position (F#4 sits on F4)', () => {
    expect(staffStep(66)).toBe(staffStep(65)) // F#4 == F4 line
  })
})

import { describe, it, expect } from 'vitest'
import { STUDIES } from '../src/content/studies'

describe('generated studies', () => {
  it('produces five studies in each of twelve keys (60 pieces)', () => {
    expect(STUDIES).toHaveLength(60)
  })

  it('has globally unique ids and a right hand on every piece', () => {
    const ids = STUDIES.map(s => s.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(STUDIES.every(s => s.right.length > 0)).toBe(true)
  })

  it('builds correct, in-range notes (C major scale, G has F#, C arpeggio)', () => {
    const cMajor = STUDIES.find(s => s.id === 'study-major-C')!
    expect(cMajor.right.map(n => n.midi)).toEqual(
      [60, 62, 64, 65, 67, 69, 71, 72, 71, 69, 67, 65, 64, 62, 60],
    )
    const gMajor = STUDIES.find(s => s.id === 'study-major-G')!
    expect(gMajor.right.map(n => n.midi)).toContain(78) // F#5 — G major's sharp
    const cArp = STUDIES.find(s => s.id === 'study-arp-C')!
    expect(cArp.right.map(n => n.midi)).toEqual([60, 64, 67, 72, 67, 64, 60])
    // everything fits the 61-key range (C2..C6 = 36..84)
    expect(STUDIES.every(s => s.right.every(n => n.midi >= 36 && n.midi <= 84))).toBe(true)
  })
})

import { describe, it, expect } from 'vitest'
import { noteY } from '../src/render/renderer'

describe('falling-notes geometry', () => {
  it('puts a note at the hit-line exactly at its start time', () => {
    expect(noteY({ startMs: 1000 }, 1000, { hitLineY: 600, pxPerMs: 0.2 })).toBeCloseTo(600)
  })
  it('puts a future note above the hit-line', () => {
    expect(noteY({ startMs: 1500 }, 1000, { hitLineY: 600, pxPerMs: 0.2 })).toBeLessThan(600)
  })
  it('puts a past note below the hit-line', () => {
    expect(noteY({ startMs: 800 }, 1000, { hitLineY: 600, pxPerMs: 0.2 })).toBeGreaterThan(600)
  })
})

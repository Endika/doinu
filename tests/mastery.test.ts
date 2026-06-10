import { describe, it, expect } from 'vitest'
import { isMastered, buildMasteryMap } from '../src/progress/mastery'
import type { Session } from '../src/progress/metrics-store'
import type { Exercise } from '../src/content/curriculum'

function ses(accuracy: number, meanFindMs: number, timestamp: number): Session {
  return { id: `s${timestamp}`, exerciseId: 'x', timestamp, accuracy, meanFindMs, meanTimingDevMs: 0, tempoBpm: 60 }
}

describe('isMastered', () => {
  it('is false with fewer than 3 sessions', () => {
    expect(isMastered([ses(1, 500, 1), ses(1, 500, 2)], 0.9)).toBe(false)
  })
  it('is true when the last 3 meet accuracy and find-time', () => {
    expect(isMastered([ses(0.5, 9999, 1), ses(0.95, 800, 2), ses(0.92, 700, 3), ses(0.91, 600, 4)], 0.9)).toBe(true)
  })
  it('is false if a recent session regressed below accuracy', () => {
    expect(isMastered([ses(0.95, 800, 1), ses(0.95, 800, 2), ses(0.5, 800, 3)], 0.9)).toBe(false)
  })
  it('is false if find-time is above threshold', () => {
    expect(isMastered([ses(0.95, 3000, 1), ses(0.95, 3000, 2), ses(0.95, 3000, 3)], 0.9, 2000)).toBe(false)
  })
})

describe('buildMasteryMap', () => {
  const ex: Exercise[] = [
    { id: 'a', title: 'A', bpm: 60, notes: [60], passAccuracy: 0.9 },
    { id: 'b', title: 'B', bpm: 60, notes: [62], passAccuracy: 0.9 },
    { id: 'c', title: 'C', bpm: 60, notes: [64], passAccuracy: 0.9 },
  ]
  it('locks everything after the first when nothing is mastered', () => {
    const map = buildMasteryMap(ex, () => [])
    expect(map.map(e => e.state)).toEqual(['inProgress', 'locked', 'locked'])
  })
  it('unlocks the next exercise when the previous is mastered', () => {
    const mastered = [ses(1, 500, 1), ses(1, 500, 2), ses(1, 500, 3)]
    const map = buildMasteryMap(ex, id => (id === 'a' ? mastered : []))
    expect(map.map(e => e.state)).toEqual(['mastered', 'inProgress', 'locked'])
  })
})

import { describe, it, expect } from 'vitest'
import { buildProgressReport } from '../src/progress/progress-view'
import type { Session } from '../src/progress/metrics-store'
import type { Exercise } from '../src/content/curriculum'
import { MasteryState } from '../src/progress/mastery'

const ex: Exercise[] = [
  { id: 'a', title: 'A', bpm: 60, notes: [60], passAccuracy: 0.9 },
  { id: 'b', title: 'B', bpm: 60, notes: [62], passAccuracy: 0.9 },
]
function ses(accuracy: number, meanFindMs: number, tempoBpm: number, timestamp: number): Session {
  return { id: `s${timestamp}`, exerciseId: 'a', timestamp, accuracy, meanFindMs, meanTimingDevMs: 0, tempoBpm }
}

describe('buildProgressReport', () => {
  const sessions: Record<string, Session[]> = {
    a: [ses(0.7, 1500, 60, 1), ses(0.95, 900, 70, 2), ses(0.9, 800, 80, 3)],
    b: [],
  }
  const states: Record<string, MasteryState> = { a: MasteryState.Mastered, b: MasteryState.InProgress }
  const report = buildProgressReport(ex, id => sessions[id] ?? [], id => states[id])

  it('summarizes measured metrics per exercise', () => {
    const a = report[0]
    expect(a.sessions).toBe(3)
    expect(a.bestAccuracy).toBeCloseTo(0.95)
    expect(a.latestAccuracy).toBeCloseTo(0.9)
    expect(a.bestTempoBpm).toBe(80)
    expect(a.firstFindMs).toBe(1500)
    expect(a.latestFindMs).toBe(800)  // find-time dropped → improvement
    expect(a.state).toBe(MasteryState.Mastered)
  })
  it('handles an exercise with no sessions (all zeros, state preserved)', () => {
    const b = report[1]
    expect(b.sessions).toBe(0)
    expect(b.bestAccuracy).toBe(0)
    expect(b.firstFindMs).toBe(0)
    expect(b.state).toBe(MasteryState.InProgress)
  })
})

import { uuidv7 } from 'uuidv7'
import type { Summary } from '../engine/scoring'

export interface Session {
  id: string // uuidv7
  exerciseId: string
  timestamp: number // epoch ms (caller-supplied so it is testable)
  accuracy: number
  meanTimingDevMs: number
  meanFindMs: number
  tempoBpm: number
}

// Minimal storage seam (matches the Web Storage API subset we use).
export interface KeyValueStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

const STORAGE_KEY = 'doinu.sessions'

export class MetricsStore {
  constructor(
    private readonly storage: KeyValueStorage,
    private readonly makeId: () => string = uuidv7,
  ) {}

  record(input: { exerciseId: string; timestamp: number; summary: Summary }): Session {
    const { exerciseId, timestamp, summary } = input
    const session: Session = {
      id: this.makeId(),
      exerciseId,
      timestamp,
      accuracy: summary.accuracy,
      meanTimingDevMs: summary.meanTimingDevMs,
      meanFindMs: summary.meanFindMs,
      tempoBpm: summary.tempoBpm,
    }
    const sessions = this.all()
    sessions.push(session)
    this.storage.setItem(STORAGE_KEY, JSON.stringify(sessions))
    return session
  }

  all(): Session[] {
    const raw = this.storage.getItem(STORAGE_KEY)
    if (raw === null) return []
    try {
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? (parsed as Session[]) : []
    } catch {
      return []
    }
  }

  sessionsFor(exerciseId: string): Session[] {
    return this.all()
      .filter((s) => s.exerciseId === exerciseId)
      .sort((a, b) => a.timestamp - b.timestamp)
  }
}

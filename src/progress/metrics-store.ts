import { uuidv7 } from 'uuidv7'
import type { Summary } from '../engine/scoring'
import { readArray, writeArray, type KeyValueStorage } from './array-storage'

export type { KeyValueStorage }

export interface Session {
  id: string // uuidv7
  exerciseId: string
  timestamp: number // epoch ms (caller-supplied so it is testable)
  accuracy: number
  meanTimingDevMs: number
  meanFindMs: number
  tempoBpm: number
}

const STORAGE_KEY = 'doinu.sessions'

export class MetricsStore {
  constructor(
    private readonly storage: KeyValueStorage,
    private readonly makeId: () => string = uuidv7,
    private readonly onWriteFailed?: () => void,
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
    if (!writeArray(this.storage, STORAGE_KEY, sessions)) this.onWriteFailed?.()
    return session
  }

  all(): Session[] {
    return readArray<Session>(this.storage, STORAGE_KEY)
  }

  sessionsFor(exerciseId: string): Session[] {
    return this.all()
      .filter((s) => s.exerciseId === exerciseId)
      .sort((a, b) => a.timestamp - b.timestamp)
  }
}

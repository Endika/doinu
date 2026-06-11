export enum ScoreResult { Hit = 'hit', Wrong = 'wrong', Missed = 'missed' }

export interface ScoreRecord {
  result: ScoreResult
  timingDevMs?: number
  findMs?: number
}

export interface Summary {
  accuracy: number          // hits / total records (raw ratio, 0 if no records)
  meanTimingDevMs: number   // mean of |timingDevMs| over hits with it defined (0 if none)
  meanFindMs: number        // mean of findMs over hits with it defined (0 if none)
  tempoBpm: number          // passed via summary(tempoBpm?), default 0
}

export class Scorer {
  private readonly records: ScoreRecord[] = []

  record(r: ScoreRecord): void {
    this.records.push(r)
  }

  summary(tempoBpm = 0): Summary {
    const total = this.records.length
    const hits = this.records.filter(r => r.result === 'hit').length

    const devs = this.records
      .filter(r => r.result === 'hit' && r.timingDevMs !== undefined)
      .map(r => Math.abs(r.timingDevMs as number))

    const finds = this.records
      .filter(r => r.result === 'hit' && r.findMs !== undefined)
      .map(r => r.findMs as number)

    return {
      accuracy: total === 0 ? 0 : hits / total,
      meanTimingDevMs: mean(devs),
      meanFindMs: mean(finds),
      tempoBpm,
    }
  }
}

function mean(xs: number[]): number {
  if (xs.length === 0) return 0
  return xs.reduce((a, b) => a + b, 0) / xs.length
}

import type { Chart, Target } from '../engine/chart'
import type { Summary } from '../engine/scoring'
import type { Mode, Verdict } from './mode'

/**
 * A chord exercise: the learner plays each chord's notes TOGETHER, one chord per
 * beat. A chord is just several co-timed `Target`s (same `startMs`), which the
 * matcher already handles note-by-note and which wait-mode pauses on until every
 * note of the chord is played. No engine change is needed.
 */
export interface ChordSpec {
  id: string
  title: string
  bpm: number
  chords: number[][] // each inner array = the midi notes of one chord, played together
  passAccuracy: number
}

export class ChordMode implements Mode {
  constructor(private readonly spec: ChordSpec) {}

  buildChart(): Chart {
    const beatMs = 60000 / this.spec.bpm
    const targets: Target[] = []
    this.spec.chords.forEach((chord, i) => {
      chord.forEach((midi, j) => {
        targets.push({
          id: `c${i}-${j}`,
          midi,
          startMs: i * beatMs,
          durMs: beatMs,
          hand: 'R',
        })
      })
    })
    return { bpm: this.spec.bpm, targets }
  }

  evaluate(summary: Summary): Verdict {
    return {
      passed: summary.accuracy >= this.spec.passAccuracy,
      accuracy: summary.accuracy,
    }
  }
}

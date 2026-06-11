import { Hand, type Chart, type Target } from '../engine/chart'
import type { Summary } from '../engine/scoring'
import type { Exercise } from '../content/curriculum'
import type { Mode, Verdict } from './mode'

// A single-hand melody: the learner plays a sequence of notes as the bars fall.
export class MelodyMode implements Mode {
  constructor(private readonly exercise: Exercise) {}

  buildChart(): Chart {
    const beatMs = 60000 / this.exercise.bpm
    const targets: Target[] = this.exercise.notes.map((midi, i) => ({
      id: `n${i}`,
      midi,
      startMs: i * beatMs,
      durMs: beatMs,
      hand: Hand.Right,
    }))
    return { bpm: this.exercise.bpm, targets }
  }

  evaluate(summary: Summary): Verdict {
    return {
      passed: summary.accuracy >= this.exercise.passAccuracy,
      accuracy: summary.accuracy,
    }
  }
}

import type { Chart, Target } from '../engine/chart'
import type { Summary } from '../engine/scoring'
import type { Mode, Verdict } from './mode'

/** Semitone offsets of a one-octave major scale, ascending including the octave. */
export const MAJOR_STEPS = [0, 2, 4, 5, 7, 9, 11, 12]

export interface ScaleSpec {
  id: string
  title: string
  rootMidi: number // e.g. 60 (middle C)
  steps: number[] // semitone offsets from root, e.g. MAJOR_STEPS
  bpm: number
  passAccuracy: number // mastery threshold, e.g. 0.9
  descending?: boolean // if true, append the scale back down (excluding the duplicated top note)
}

// A practice scale: play the notes of a scale up (and optionally back down), one beat apart.
export class ScaleMode implements Mode {
  constructor(private readonly spec: ScaleSpec) {}

  buildChart(): Chart {
    const { rootMidi, steps, bpm, descending } = this.spec
    const ascending = steps.map(s => rootMidi + s)
    const notes = descending
      ? [...ascending, ...ascending.slice(0, -1).reverse()]
      : ascending

    const beatMs = 60000 / bpm
    const targets: Target[] = notes.map((midi, i) => ({
      id: `n${i}`,
      midi,
      startMs: i * beatMs,
      durMs: beatMs,
      hand: 'R',
    }))
    return { bpm, targets }
  }

  evaluate(summary: Summary): Verdict {
    return {
      passed: summary.accuracy >= this.spec.passAccuracy,
      accuracy: summary.accuracy,
    }
  }
}

export const SCALES: ScaleSpec[] = [
  { id: 'c-major-up', title: 'C Major (up)', rootMidi: 60, steps: MAJOR_STEPS, bpm: 72, passAccuracy: 0.9 },
  { id: 'c-major-updown', title: 'C Major (up/down)', rootMidi: 60, steps: MAJOR_STEPS, bpm: 72, passAccuracy: 0.9, descending: true },
]

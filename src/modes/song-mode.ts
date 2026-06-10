import type { Chart, Target } from '../engine/chart'
import type { Summary } from '../engine/scoring'
import type { Mode, Verdict } from './mode'
import type { Song } from '../content/songs'

export type HandSelection = 'R' | 'L' | 'both'

const PASS_ACCURACY = 0.8

/** Which hand selections a song offers (always R; L/both only if it has a left hand). */
export function songHands(song: Song): HandSelection[] {
  return song.left ? ['R', 'L', 'both'] : ['R']
}

/**
 * Turns a `Song` into a playable `Chart` for the chosen hand(s). The right hand
 * is sequential (start times accumulated from durations); the left hand carries
 * explicit timing so the hands line up. Beats are converted to ms via the bpm.
 */
export class SongMode implements Mode {
  constructor(
    private readonly song: Song,
    private readonly selection: HandSelection = 'R',
  ) {}

  buildChart(): Chart {
    const beatMs = 60000 / this.song.bpm
    const targets: Target[] = []
    let id = 0

    if (this.selection === 'R' || this.selection === 'both') {
      let beat = 0
      for (const n of this.song.right) {
        targets.push({ id: `r${id++}`, midi: n.midi, startMs: beat * beatMs, durMs: n.dur * beatMs, hand: 'R' })
        beat += n.dur
      }
    }
    if ((this.selection === 'L' || this.selection === 'both') && this.song.left) {
      for (const n of this.song.left) {
        targets.push({ id: `l${id++}`, midi: n.midi, startMs: n.startBeat * beatMs, durMs: n.dur * beatMs, hand: 'L' })
      }
    }

    targets.sort((a, b) => a.startMs - b.startMs)
    return { bpm: this.song.bpm, targets }
  }

  evaluate(summary: Summary): Verdict {
    return { passed: summary.accuracy >= PASS_ACCURACY, accuracy: summary.accuracy }
  }
}

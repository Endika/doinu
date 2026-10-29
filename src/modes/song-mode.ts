import { Hand, type Chart, type Target } from '../engine/chart'
import type { Summary } from '../engine/scoring'
import type { Mode, Verdict } from './mode'
import type { Song } from '../content/songs'
import { autoFingers, mirrorFingers } from '../core/fingering'

export enum HandSelection {
  Right = 'R',
  Left = 'L',
  Both = 'both',
}

const PASS_ACCURACY = 0.8

/** Which hand selections a song offers (always R; L/both only if it has a left hand). */
export function songHands(song: Song): HandSelection[] {
  return song.left
    ? [HandSelection.Right, HandSelection.Left, HandSelection.Both]
    : [HandSelection.Right]
}

/**
 * Hand options playable on the current input. A monophonic source (the mic)
 * can't play 'both' (two simultaneous lines); single-hand R/L stay playable.
 */
export function availableHands(song: Song, polyphonic: boolean): HandSelection[] {
  const hands = songHands(song)
  return polyphonic ? hands : hands.filter((h) => h !== HandSelection.Both)
}

/**
 * Turns a `Song` into a playable `Chart` for the chosen hand(s). The right hand
 * is sequential (start times accumulated from durations); the left hand carries
 * explicit timing so the hands line up. Beats are converted to ms via the bpm.
 */
export class SongMode implements Mode {
  constructor(
    private readonly song: Song,
    private readonly selection: HandSelection = HandSelection.Right,
  ) {}

  buildChart(): Chart {
    const beatMs = 60000 / this.song.bpm
    const targets: Target[] = []
    let id = 0

    if (this.selection === HandSelection.Right || this.selection === HandSelection.Both) {
      const fingers = autoFingers(this.song.right.map((n) => n.midi))
      let beat = 0
      this.song.right.forEach((n, i) => {
        targets.push({
          id: `r${id++}`,
          midi: n.midi,
          startMs: beat * beatMs,
          durMs: n.dur * beatMs,
          hand: Hand.Right,
          finger: n.finger ?? fingers[i],
        })
        beat += n.dur
      })
    }
    if (
      (this.selection === HandSelection.Left || this.selection === HandSelection.Both) &&
      this.song.left
    ) {
      // The left hand reads the same way, but its thumb is the highest finger.
      const fingers = mirrorFingers(autoFingers(this.song.left.map((n) => n.midi)))
      this.song.left.forEach((n, i) => {
        targets.push({
          id: `l${id++}`,
          midi: n.midi,
          startMs: n.startBeat * beatMs,
          durMs: n.dur * beatMs,
          hand: Hand.Left,
          finger: n.finger ?? fingers[i],
        })
      })
    }

    targets.sort((a, b) => a.startMs - b.startMs)
    return { bpm: this.song.bpm, targets }
  }

  evaluate(summary: Summary): Verdict {
    return { passed: summary.accuracy >= PASS_ACCURACY, accuracy: summary.accuracy }
  }
}

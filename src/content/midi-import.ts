import { Midi } from '@tonejs/midi'
import type { Chart, Target, Hand } from '../engine/chart'
import type { Mode, Verdict } from '../modes/mode'
import type { Summary } from '../engine/scoring'

export interface ImportedSong {
  title: string
  chart: Chart
  hasLeft: boolean
}

/** Thrown for any rejected import (oversize, malformed); never crashes the app. */
export class MidiImportError extends Error {}

/** Hard upper bound on input size — a cheap guard against pathological files. */
export const MAX_MIDI_BYTES = 512 * 1024 // 512 KB

/** Keyboard render range (see render/keyboard.ts). Notes are transposed into it. */
const MIDI_LOW = 36
const MIDI_HIGH = 96

/** Cap on imported targets, so a pathological file cannot flood the engine. */
const MAX_TARGETS = 2000

/** Floor on a note's duration so very short notes still register / render. */
const MIN_DUR_MS = 60

/** Title length cap (shown via textContent only — never innerHTML). */
const MAX_TITLE_LEN = 60

/** Transpose by whole octaves until the note lands inside [MIDI_LOW, MIDI_HIGH]. */
function clampMidiByOctave(midi: number): number {
  let m = Math.round(midi)
  while (m < MIDI_LOW) m += 12
  while (m > MIDI_HIGH) m -= 12
  // After transposing, an extreme/garbage value could still sit just outside;
  // pin it defensively so a target never renders off-screen.
  if (m < MIDI_LOW) m = MIDI_LOW
  if (m > MIDI_HIGH) m = MIDI_HIGH
  return m
}

interface RawNote {
  midi: number
  time: number // seconds
  duration: number // seconds
}

/**
 * Parse a MIDI file into an `ImportedSong`. Defensive by design: oversize or
 * malformed input throws `MidiImportError` (so callers can show a friendly
 * message) instead of letting a bad file crash the app. The note total is
 * capped, durations are floored, and pitches are transposed into the visible
 * keyboard range.
 */
export function parseMidi(data: ArrayBuffer, fallbackTitle: string): ImportedSong {
  if (data.byteLength > MAX_MIDI_BYTES) {
    throw new MidiImportError('File too large')
  }

  let midi: Midi
  try {
    midi = new Midi(data)
  } catch {
    throw new MidiImportError('Not a valid MIDI file')
  }

  // Collect note-bearing tracks with their average pitch, to decide the split.
  const noteTracks = midi.tracks
    .map(t => t.notes.map((n): RawNote => ({ midi: n.midi, time: n.time, duration: n.duration })))
    .filter(notes => notes.length > 0)

  if (noteTracks.length === 0) {
    throw new MidiImportError('No notes in this MIDI file')
  }

  // Hand split.
  //  - >=2 note tracks: the single track with the HIGHEST average pitch is the
  //    right hand; every other note track is the left hand.
  //  - exactly 1 note track: split by pitch (midi >= 60 -> right, else left).
  const handForNote: (track: number, midi: number) => Hand = (() => {
    if (noteTracks.length >= 2) {
      const avgs = noteTracks.map(notes => notes.reduce((a, n) => a + n.midi, 0) / notes.length)
      let rightTrack = 0
      for (let i = 1; i < avgs.length; i++) if (avgs[i] > avgs[rightTrack]) rightTrack = i
      return (track: number): Hand => (track === rightTrack ? 'R' : 'L')
    }
    return (_track: number, m: number): Hand => (m >= 60 ? 'R' : 'L')
  })()

  // Flatten to targets (clamped + floored), keeping the source hand.
  interface Built {
    target: Target
    hand: Hand
  }
  const built: Built[] = []
  for (let ti = 0; ti < noteTracks.length; ti++) {
    for (const n of noteTracks[ti]) {
      const hand = handForNote(ti, n.midi)
      built.push({
        target: {
          id: 'm' + built.length,
          midi: clampMidiByOctave(n.midi),
          startMs: n.time * 1000,
          durMs: Math.max(MIN_DUR_MS, n.duration * 1000),
          hand,
        },
        hand,
      })
    }
  }

  built.sort((a, b) => a.target.startMs - b.target.startMs)
  const capped = built.slice(0, MAX_TARGETS)
  const targets = capped.map(b => b.target)
  const hasLeft = capped.some(b => b.hand === 'L')

  const bpm = midi.header.tempos[0]?.bpm ?? 100

  const rawTitle = (midi.name || fallbackTitle || 'Imported song').trim()
  const title = rawTitle.slice(0, MAX_TITLE_LEN) || 'Imported song'

  return { title, chart: { bpm, targets }, hasLeft }
}

/** Filter a chart down to a single hand, or pass it through unchanged. */
export function filterChartByHand(chart: Chart, sel: 'R' | 'L' | 'both'): Chart {
  if (sel === 'both') return chart
  return { bpm: chart.bpm, targets: chart.targets.filter(t => t.hand === sel) }
}

/** Wrap a prebuilt chart as a `Mode` so it can run through `runChartWaiting`. */
export function chartMode(chart: Chart): Mode {
  return {
    buildChart: () => chart,
    evaluate: (s: Summary): Verdict => ({ passed: s.accuracy >= 0.6, accuracy: s.accuracy }),
  }
}

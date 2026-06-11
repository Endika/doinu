import { describe, it, expect } from 'vitest'
import { Midi } from '@tonejs/midi'
import {
  parseMidi,
  filterChartByHand,
  chartMode,
  MidiImportError,
  MAX_MIDI_BYTES,
} from '../src/content/midi-import'
import { Hand } from '../src/engine/chart'
import { HandSelection } from '../src/modes/song-mode'

function buildTwoHandMidi(): ArrayBuffer {
  const midi = new Midi()
  const rh = midi.addTrack()
  rh.addNote({ midi: 72, time: 0, duration: 0.5 })
  rh.addNote({ midi: 74, time: 0.5, duration: 0.5 })
  const lh = midi.addTrack()
  lh.addNote({ midi: 48, time: 0, duration: 1 })
  return midi.toArray().buffer as ArrayBuffer
}

function buildSingleTrackMidi(): ArrayBuffer {
  const midi = new Midi()
  const t = midi.addTrack()
  t.addNote({ midi: 64, time: 0, duration: 0.5 }) // >=60 -> right
  t.addNote({ midi: 50, time: 0.5, duration: 0.5 }) // <60 -> left
  return midi.toArray().buffer as ArrayBuffer
}

function buildOutOfRangeMidi(): ArrayBuffer {
  const midi = new Midi()
  const t = midi.addTrack()
  t.addNote({ midi: 12, time: 0, duration: 0.5 }) // far below 36
  t.addNote({ midi: 120, time: 0.5, duration: 0.5 }) // far above 96
  return midi.toArray().buffer as ArrayBuffer
}

describe('parseMidi', () => {
  it('splits into right (higher) and left (lower) hands', () => {
    const s = parseMidi(buildTwoHandMidi(), 'song')
    expect(s.hasLeft).toBe(true)
    expect(s.chart.targets.some(t => t.hand === Hand.Right && t.midi === 72)).toBe(true)
    expect(s.chart.targets.some(t => t.hand === Hand.Left && t.midi === 48)).toBe(true)
    // sorted by start
    const starts = s.chart.targets.map(t => t.startMs)
    expect(starts).toEqual([...starts].sort((a, b) => a - b))
  })

  it('splits a single track by pitch (>=60 right, <60 left)', () => {
    const s = parseMidi(buildSingleTrackMidi(), 'song')
    expect(s.chart.targets.find(t => t.midi === 64)?.hand).toBe(Hand.Right)
    expect(s.chart.targets.find(t => t.midi === 50)?.hand).toBe(Hand.Left)
    expect(s.hasLeft).toBe(true)
  })

  it('clamps out-of-range notes into [36, 96] by octave transposition', () => {
    const s = parseMidi(buildOutOfRangeMidi(), 'song')
    for (const t of s.chart.targets) {
      expect(t.midi).toBeGreaterThanOrEqual(36)
      expect(t.midi).toBeLessThanOrEqual(96)
    }
  })

  it('uses the file name fallback and trims the title', () => {
    const s = parseMidi(buildTwoHandMidi(), 'my-tune')
    expect(s.title.length).toBeGreaterThan(0)
    expect(s.title.length).toBeLessThanOrEqual(60)
  })

  it('enforces a minimum note duration', () => {
    const s = parseMidi(buildTwoHandMidi(), 'song')
    expect(s.chart.targets.every(t => t.durMs >= 60)).toBe(true)
  })

  it('rejects oversize input', () => {
    const big = new ArrayBuffer(MAX_MIDI_BYTES + 1)
    expect(() => parseMidi(big, 'x')).toThrow(MidiImportError)
  })

  it('rejects a non-midi buffer', () => {
    expect(() => parseMidi(new TextEncoder().encode('not midi').buffer as ArrayBuffer, 'x')).toThrow(
      MidiImportError,
    )
  })

  it('filterChartByHand keeps only the selected hand', () => {
    const s = parseMidi(buildTwoHandMidi(), 'song')
    expect(filterChartByHand(s.chart, HandSelection.Left).targets.every(t => t.hand === Hand.Left)).toBe(true)
    expect(filterChartByHand(s.chart, HandSelection.Right).targets.every(t => t.hand === Hand.Right)).toBe(true)
    expect(filterChartByHand(s.chart, HandSelection.Both).targets.length).toBe(s.chart.targets.length)
  })

  it('chartMode wraps a prebuilt chart into a runnable Mode', () => {
    const s = parseMidi(buildTwoHandMidi(), 'song')
    const mode = chartMode(s.chart)
    expect(mode.buildChart()).toBe(s.chart)
    expect(
      mode.evaluate({ accuracy: 0.8, meanTimingDevMs: 0, meanFindMs: 0, tempoBpm: 0 }).passed,
    ).toBe(true)
    expect(
      mode.evaluate({ accuracy: 0.5, meanTimingDevMs: 0, meanFindMs: 0, tempoBpm: 0 }).passed,
    ).toBe(false)
  })
})

import { describe, it, expect } from 'vitest'
import { SongMode, songHands, HandSelection } from '../src/modes/song-mode'
import { Hand } from '../src/engine/chart'
import { SONGS, type Song } from '../src/content/songs'

const twinkle = SONGS.find(s => s.id === 'twinkle')!
const mary = SONGS.find(s => s.id === 'mary')!

describe('songHands', () => {
  it('offers R/L/both when a song has a left hand', () => {
    expect(songHands(twinkle)).toEqual<HandSelection[]>([HandSelection.Right, HandSelection.Left, HandSelection.Both])
  })
  it('offers only R for a right-hand-only song', () => {
    expect(songHands(mary)).toEqual<HandSelection[]>([HandSelection.Right])
  })
})

describe('SongMode.buildChart', () => {
  it('builds the right-hand melody with accumulated start times', () => {
    const chart = new SongMode(twinkle, HandSelection.Right).buildChart()
    expect(chart.targets.length).toBe(twinkle.right.length)
    expect(chart.targets.every(t => t.hand === Hand.Right)).toBe(true)
    const beatMs = 60000 / twinkle.bpm
    expect(chart.targets[0].startMs).toBe(0)
    expect(chart.targets[1].startMs).toBeCloseTo(twinkle.right[0].dur * beatMs)
  })
  it('"both" includes left-hand targets, sorted by start time', () => {
    const r = new SongMode(twinkle, HandSelection.Right).buildChart()
    const both = new SongMode(twinkle, HandSelection.Both).buildChart()
    expect(both.targets.length).toBe(r.targets.length + (twinkle.left?.length ?? 0))
    expect(both.targets.some(t => t.hand === Hand.Left)).toBe(true)
    const starts = both.targets.map(t => t.startMs)
    expect(starts).toEqual([...starts].sort((a, b) => a - b))
  })
  it('"L" yields only left-hand targets', () => {
    const chart = new SongMode(twinkle, HandSelection.Left).buildChart()
    expect(chart.targets.every(t => t.hand === Hand.Left)).toBe(true)
    expect(chart.targets.length).toBe(twinkle.left?.length)
  })
})

describe('SongMode.evaluate', () => {
  it('passes at or above 80% accuracy', () => {
    const m = new SongMode(mary, HandSelection.Right)
    expect(m.evaluate({ accuracy: 0.8, meanFindMs: 0, meanTimingDevMs: 0, tempoBpm: 0 }).passed).toBe(true)
    expect(m.evaluate({ accuracy: 0.5, meanFindMs: 0, meanTimingDevMs: 0, tempoBpm: 0 }).passed).toBe(false)
  })
})

describe('song library sanity', () => {
  it('every song has a non-empty right hand and unique id', () => {
    const ids = new Set<string>()
    for (const s of SONGS as Song[]) {
      expect(s.right.length).toBeGreaterThan(0)
      expect(ids.has(s.id)).toBe(false)
      ids.add(s.id)
    }
    expect(SONGS.length).toBeGreaterThanOrEqual(8)
  })
})

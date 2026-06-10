import { describe, it, expect } from 'vitest'
import { Synth, midiToFreq } from '../src/audio/synth'

describe('midiToFreq', () => {
  it('maps A4 (69) to 440 Hz', () => { expect(midiToFreq(69)).toBeCloseTo(440) })
  it('maps middle C (60) to ~261.63 Hz', () => { expect(midiToFreq(60)).toBeCloseTo(261.63, 1) })
  it('is an octave (2x) up at +12 semitones', () => { expect(midiToFreq(81)).toBeCloseTo(880) })
})

describe('Synth without an audio context (node-safe)', () => {
  it('constructs and no-ops audio methods when context is null', () => {
    const s = new Synth({ createContext: () => null })
    expect(() => { s.resume(); s.noteOn(60); s.noteOff(60) }).not.toThrow()
  })
  it('playSequence visits notes in order and calls onDone (injected scheduler)', () => {
    const visited: number[] = []
    let done = false
    // Synchronous scheduler: run the scheduled fn immediately.
    const s = new Synth({ createContext: () => null, schedule: (fn) => fn() })
    // Spy on noteOn to record order without real audio:
    const orig = s.noteOn.bind(s)
    s.noteOn = (midi: number, v?: number) => { visited.push(midi); orig(midi, v) }
    s.playSequence([{ midi: 60, durMs: 100 }, { midi: 62, durMs: 100 }, { midi: 64, durMs: 100 }], () => { done = true })
    expect(visited).toEqual([60, 62, 64])
    expect(done).toBe(true)
  })
})

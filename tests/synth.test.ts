import { describe, it, expect } from 'vitest'
import { Synth, midiToFreq } from '../src/audio/synth'

describe('midiToFreq', () => {
  it('maps A4 (69) to 440 Hz', () => {
    expect(midiToFreq(69)).toBeCloseTo(440)
  })
  it('maps middle C (60) to ~261.63 Hz', () => {
    expect(midiToFreq(60)).toBeCloseTo(261.63, 1)
  })
  it('is an octave (2x) up at +12 semitones', () => {
    expect(midiToFreq(81)).toBeCloseTo(880)
  })
})

describe('Synth without an audio context (node-safe)', () => {
  it('constructs and no-ops audio methods when context is null', () => {
    const s = new Synth({ createContext: () => null })
    expect(() => {
      s.resume()
      s.noteOn(60)
      s.noteOff(60)
    }).not.toThrow()
  })
  it('playSequence visits notes in order and calls onDone (injected scheduler)', () => {
    const visited: number[] = []
    let done = false
    // Synchronous scheduler: run the scheduled fn immediately.
    const s = new Synth({ createContext: () => null, schedule: (fn) => fn() })
    // Spy on noteOn to record order without real audio:
    const orig = s.noteOn.bind(s)
    s.noteOn = (midi: number, v?: number) => {
      visited.push(midi)
      orig(midi, v)
    }
    s.playSequence(
      [
        { midi: 60, durMs: 100 },
        { midi: 62, durMs: 100 },
        { midi: 64, durMs: 100 },
      ],
      () => {
        done = true
      },
    )
    expect(visited).toEqual([60, 62, 64])
    expect(done).toBe(true)
  })
})

describe('Synth sampler hook', () => {
  function fakeContext() {
    const oscillators: number[] = []
    const ctx = {
      currentTime: 0,
      destination: {},
      resume() {},
      createGain: () => ({
        gain: {
          value: 0,
          setValueAtTime() {},
          linearRampToValueAtTime() {},
          cancelScheduledValues() {},
        },
        connect() {},
      }),
      createOscillator() {
        oscillators.push(0)
        return { type: '', frequency: { value: 0 }, connect() {}, start() {}, stop() {} }
      },
    }
    return { ctx: ctx as unknown as AudioContext, oscillators }
  }

  it('plays the oscillator when the sampler declines and skips it when the sampler plays', () => {
    const f = fakeContext()
    const ready = new Set<number>()
    const calls: string[] = []
    const s = new Synth({
      createContext: () => f.ctx,
      sampler: {
        noteOn: (_ctx, midi) => {
          calls.push(`on:${midi}`)
          return ready.has(midi)
        },
        noteOff: (midi) => calls.push(`off:${midi}`),
      },
    })
    s.noteOn(60)
    expect(f.oscillators).toHaveLength(1)
    ready.add(60)
    s.noteOn(60)
    expect(f.oscillators).toHaveLength(1)
    s.noteOff(60)
    expect(calls).toEqual(['off:60', 'on:60', 'off:60', 'on:60', 'off:60'])
  })
})

import { describe, it, expect } from 'vitest'
import { detectPitchHz, detectPitchMidi, freqToMidi } from '../src/core/pitch-detect'

const SR = 44100
const N = 2048 // ~46 ms frame at 44.1 kHz (what an AnalyserNode fftSize=2048 gives)

function sine(freqHz: number, amp = 0.5, n = N, sr = SR): Float32Array {
  const buf = new Float32Array(n)
  for (let i = 0; i < n; i++) buf[i] = amp * Math.sin((2 * Math.PI * freqHz * i) / sr)
  return buf
}

// A more piano-like tone: fundamental + a couple of harmonics (octave errors test).
function tone(freqHz: number, n = N, sr = SR): Float32Array {
  const buf = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const t = i / sr
    buf[i] = 0.5 * Math.sin(2 * Math.PI * freqHz * t) + 0.25 * Math.sin(2 * Math.PI * 2 * freqHz * t) + 0.12 * Math.sin(2 * Math.PI * 3 * freqHz * t)
  }
  return buf
}

describe('freqToMidi', () => {
  it('maps A4=440 to 69 and middle C to 60', () => {
    expect(freqToMidi(440)).toBe(69)
    expect(freqToMidi(261.626)).toBe(60)
  })
})

describe('detectPitchHz on pure sines across the piano range', () => {
  const cases: [string, number, number][] = [
    ['C3', 130.813, 48],
    ['C4 (middle)', 261.626, 60],
    ['E4', 329.628, 64],
    ['A4', 440.0, 69],
    ['A5', 880.0, 81],
    ['C6', 1046.5, 84],
  ]
  for (const [name, hz, midi] of cases) {
    it(`detects ${name} (${hz} Hz) within a few cents`, () => {
      const f = detectPitchHz(sine(hz), SR)
      expect(f).not.toBeNull()
      expect(Math.abs((f as number) - hz)).toBeLessThan(hz * 0.01) // <1% error
      expect(detectPitchMidi(sine(hz), SR)).toBe(midi)
    })
  }
})

describe('detectPitchMidi on harmonically rich (piano-like) tones', () => {
  it('reports the FUNDAMENTAL, not an octave, with overtones present', () => {
    expect(detectPitchMidi(tone(261.626), SR)).toBe(60) // C4
    expect(detectPitchMidi(tone(440), SR)).toBe(69) // A4
  })
})

describe('silence and noise gating', () => {
  it('returns null on silence', () => {
    expect(detectPitchHz(new Float32Array(N), SR)).toBeNull()
  })
  it('returns null on a sub-threshold (too quiet) tone', () => {
    expect(detectPitchHz(sine(440, 0.001), SR)).toBeNull()
  })
})

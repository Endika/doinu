/**
 * Monophonic pitch detection (YIN algorithm) — the core of the future iPad
 * microphone input. Pure and synchronous so it is fully testable with synthetic
 * tone buffers; the mic adapter just feeds it time-domain audio frames.
 *
 * YIN (de Cheveigné & Kawahara 2002) = autocorrelation refined with a cumulative
 * mean normalised difference function, which suppresses the octave errors that
 * plague raw autocorrelation on harmonically rich sources like a piano.
 */

export interface PitchOptions {
  /** Below this RMS the frame is treated as silence (no pitch). */
  minRms?: number
  /** YIN absolute threshold; lower = stricter (fewer false notes). */
  threshold?: number
  /** Search range (Hz). Defaults span a piano-friendly C2..C7. */
  minHz?: number
  maxHz?: number
}

/** Detect the fundamental frequency (Hz) of a time-domain frame, or null if none. */
export function detectPitchHz(buf: Float32Array, sampleRate: number, opts: PitchOptions = {}): number | null {
  const minRms = opts.minRms ?? 0.01
  const threshold = opts.threshold ?? 0.15
  const minHz = opts.minHz ?? 65
  const maxHz = opts.maxHz ?? 1100
  const n = buf.length

  // Silence gate.
  let rms = 0
  for (let i = 0; i < n; i++) rms += buf[i] * buf[i]
  rms = Math.sqrt(rms / n)
  if (rms < minRms) return null

  const maxTau = Math.min(Math.floor(sampleRate / minHz), Math.floor(n / 2))
  const minTau = Math.max(2, Math.floor(sampleRate / maxHz))
  if (maxTau <= minTau) return null

  // Difference function d(tau).
  const d = new Float32Array(maxTau + 1)
  for (let tau = 1; tau <= maxTau; tau++) {
    let sum = 0
    for (let i = 0; i + tau < n; i++) {
      const diff = buf[i] - buf[i + tau]
      sum += diff * diff
    }
    d[tau] = sum
  }

  // Cumulative mean normalised difference d'(tau).
  const cmnd = new Float32Array(maxTau + 1)
  cmnd[0] = 1
  let running = 0
  for (let tau = 1; tau <= maxTau; tau++) {
    running += d[tau]
    cmnd[tau] = running === 0 ? 1 : (d[tau] * tau) / running
  }

  // Absolute threshold: first dip below `threshold` in range, walked to its min.
  let bestTau = -1
  for (let tau = minTau; tau < maxTau; tau++) {
    if (cmnd[tau] < threshold) {
      while (tau + 1 < maxTau && cmnd[tau + 1] < cmnd[tau]) tau++
      bestTau = tau
      break
    }
  }
  if (bestTau === -1) return null // no confident pitch

  // Parabolic interpolation around the minimum for sub-sample precision.
  let betterTau = bestTau
  if (bestTau > 1 && bestTau < maxTau) {
    const s0 = cmnd[bestTau - 1]
    const s1 = cmnd[bestTau]
    const s2 = cmnd[bestTau + 1]
    const denom = 2 * (2 * s1 - s2 - s0)
    if (denom !== 0) {
      const adjust = (s2 - s0) / denom
      if (Number.isFinite(adjust) && Math.abs(adjust) < 1) betterTau = bestTau + adjust
    }
  }

  const freq = sampleRate / betterTau
  return freq >= minHz && freq <= maxHz ? freq : null
}

/** Nearest MIDI note number for a frequency (A4 = 440 Hz = 69). */
export function freqToMidi(hz: number): number {
  return Math.round(69 + 12 * Math.log2(hz / 440))
}

/** Convenience: detect a frame straight to a MIDI note, or null. */
export function detectPitchMidi(buf: Float32Array, sampleRate: number, opts?: PitchOptions): number | null {
  const hz = detectPitchHz(buf, sampleRate, opts)
  return hz === null ? null : freqToMidi(hz)
}

/** Root-mean-square level of a frame (the loudness, 0..~1). */
export function rms(buf: Float32Array): number {
  let sum = 0
  for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i]
  return Math.sqrt(sum / buf.length)
}

export interface FrameAnalysis {
  rms: number
  hz: number | null
  midi: number | null
}

/** Everything the live mic readout needs from one frame: loudness + pitch. */
export function analyzeFrame(buf: Float32Array, sampleRate: number, opts?: PitchOptions): FrameAnalysis {
  const hz = detectPitchHz(buf, sampleRate, opts)
  return { rms: rms(buf), hz, midi: hz === null ? null : freqToMidi(hz) }
}

import type { InputAdapter, Capabilities } from './input-adapter'
import { InputSource } from './input-adapter'
import type { InputEvent } from './events'
import { analyzeFrame } from './pitch-detect'
import { NoteTracker } from './note-tracker'
import { OnsetDetector } from './onset'

const GATE_KEY = 'doinu.micGate'
const DEFAULT_GATE = 0.01

/** One frame's worth of analysis, surfaced for the live mic-test readout. */
export interface MicFrame {
  rms: number
  hz: number | null
  midi: number | null
  onset: boolean
  gate: number
}

/**
 * Microphone input for iPad / any device without Web MIDI. Captures the mic, runs
 * YIN pitch detection per frame, discretises it into note-on/off via NoteTracker
 * (with amplitude re-attack for repeated notes), and emits the same `InputEvent`s
 * as the MIDI adapter — so every monophonic mode works unchanged.
 *
 * Monophonic by nature — chords / two hands stay MIDI-only. The DSP, onset and
 * tracker are unit-tested; this class is the Web Audio glue (validated on device).
 * The constructor touches no DOM, so it is safe to construct in a node test.
 */
export class MicInputAdapter implements InputAdapter {
  capabilities: Capabilities = { polyphonic: false, source: InputSource.Mic }
  private readonly listeners: ((e: InputEvent) => void)[] = []
  private readonly frameListeners: ((f: MicFrame) => void)[] = []
  private ctx: AudioContext | null = null
  private stream: MediaStream | null = null
  private running = false
  private rafId = 0
  private minRms = DEFAULT_GATE

  onEvent(cb: (e: InputEvent) => void): void {
    this.listeners.push(cb)
  }

  /** Subscribe to the raw per-frame analysis (for the live mic-test screen). */
  onFrame(cb: (f: MicFrame) => void): void {
    this.frameListeners.push(cb)
  }

  /** The current noise gate (RMS). */
  get sensitivity(): number {
    return this.minRms
  }

  /** Adjust the noise gate live and persist it. */
  setSensitivity(minRms: number): void {
    this.minRms = minRms
    try {
      window.localStorage.setItem(GATE_KEY, String(minRms))
    } catch {
      /* no storage (node) — ignore */
    }
  }

  async start(): Promise<void> {
    if (this.running) return
    try {
      const stored = window.localStorage.getItem(GATE_KEY)
      const v = stored === null ? NaN : parseFloat(stored)
      if (Number.isFinite(v)) this.minRms = v
    } catch {
      /* no storage — keep default */
    }

    // Disable the browser's voice-processing — it mangles musical pitch.
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
    })
    this.ctx = new AudioContext()
    const source = this.ctx.createMediaStreamSource(this.stream)
    const analyser = this.ctx.createAnalyser()
    analyser.fftSize = 2048 // ~46 ms frame — enough for the piano range
    source.connect(analyser)

    const buf = new Float32Array(analyser.fftSize)
    const tracker = new NoteTracker()
    const onset = new OnsetDetector()
    const sampleRate = this.ctx.sampleRate
    this.running = true

    const loop = (): void => {
      if (!this.running) return
      analyser.getFloatTimeDomainData(buf)
      const a = analyzeFrame(buf, sampleRate, { minRms: this.minRms })
      const attack = onset.feed(a.rms)
      const time = performance.now()
      for (const e of tracker.feed(a.midi, time, attack)) this.emit(e)
      this.emitFrame({ rms: a.rms, hz: a.hz, midi: a.midi, onset: attack, gate: this.minRms })
      this.rafId = requestAnimationFrame(loop)
    }
    this.rafId = requestAnimationFrame(loop)
  }

  stop(): void {
    this.running = false
    cancelAnimationFrame(this.rafId)
    this.stream?.getTracks().forEach(t => t.stop())
    void this.ctx?.close()
    this.ctx = null
    this.stream = null
  }

  private emit(e: InputEvent): void {
    for (const cb of this.listeners) cb(e)
  }

  private emitFrame(f: MicFrame): void {
    for (const cb of this.frameListeners) cb(f)
  }
}

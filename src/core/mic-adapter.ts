import type { InputAdapter, Capabilities } from './input-adapter'
import { InputSource } from './input-adapter'
import type { InputEvent } from './events'
import { detectPitchMidi } from './pitch-detect'
import { NoteTracker } from './note-tracker'

/**
 * PROTOTYPE (spike): microphone input for iPad / any device without Web MIDI.
 * Captures the mic, runs YIN pitch detection per frame, and turns the pitch
 * stream into note-on/off events via NoteTracker — emitting the same `InputEvent`s
 * as the MIDI adapter, so every monophonic mode works unchanged.
 *
 * Monophonic by nature (one note at a time) — chords / two hands stay MIDI-only.
 * The DSP (detectPitchMidi) and the discretiser (NoteTracker) are unit-tested;
 * this class is the Web Audio glue, validated on a real device, not in CI.
 */
export class MicInputAdapter implements InputAdapter {
  capabilities: Capabilities = { polyphonic: false, source: InputSource.Mic }
  private readonly listeners: ((e: InputEvent) => void)[] = []
  private ctx: AudioContext | null = null
  private stream: MediaStream | null = null
  private running = false
  private rafId = 0

  onEvent(cb: (e: InputEvent) => void): void {
    this.listeners.push(cb)
  }

  async start(): Promise<void> {
    if (this.running) return
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
    const sampleRate = this.ctx.sampleRate
    this.running = true

    const loop = (): void => {
      if (!this.running) return
      analyser.getFloatTimeDomainData(buf)
      const midi = detectPitchMidi(buf, sampleRate)
      const time = performance.now()
      for (const e of tracker.feed(midi, time)) this.emit(e)
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
}

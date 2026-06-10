/** Equal-tempered frequency of a midi note (A4=69→440Hz). Pure. */
export function midiToFreq(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12)
}

export interface SynthOptions {
  /**
   * Injectable factory so node tests never construct a real AudioContext.
   * In the browser, defaults to () => new AudioContext().
   */
  createContext?: () => AudioContext | null
  /**
   * Injectable scheduler so playSequence is testable without real timers.
   * Defaults to setTimeout.
   */
  schedule?: (fn: () => void, delayMs: number) => void
}

interface Voice {
  osc: OscillatorNode
  gain: GainNode
}

const ATTACK_S = 0.005
const RELEASE_S = 0.05

export class Synth {
  private readonly createContext: () => AudioContext | null
  private readonly schedule: (fn: () => void, delayMs: number) => void
  private ctx: AudioContext | null = null
  private started = false
  private readonly voices = new Map<number, Voice>()

  constructor(opts: SynthOptions = {}) {
    this.createContext =
      opts.createContext ??
      (typeof AudioContext !== 'undefined' ? () => new AudioContext() : () => null)
    this.schedule = opts.schedule ?? ((fn, ms) => setTimeout(fn, ms))
  }

  /** Lazily create the AudioContext on first use (needs a user gesture in browsers). Safe no-op if unavailable. */
  resume(): void {
    if (!this.started) {
      this.started = true
      this.ctx = this.createContext()
    }
    void this.ctx?.resume?.()
  }

  /** Start a voice for this midi (no-op if no context). */
  noteOn(midi: number, velocity = 1): void {
    this.resume()
    const ctx = this.ctx
    if (!ctx) return
    this.noteOff(midi)

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'triangle'
    osc.frequency.value = midiToFreq(midi)

    const now = ctx.currentTime
    const peak = Math.max(0, Math.min(1, velocity)) * 0.3
    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(peak, now + ATTACK_S)

    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(now)

    this.voices.set(midi, { osc, gain })
  }

  /** Stop the voice for this midi. */
  noteOff(midi: number): void {
    const ctx = this.ctx
    const voice = this.voices.get(midi)
    if (!ctx || !voice) return
    this.voices.delete(midi)

    const now = ctx.currentTime
    const { osc, gain } = voice
    gain.gain.cancelScheduledValues(now)
    gain.gain.setValueAtTime(gain.gain.value, now)
    gain.gain.linearRampToValueAtTime(0, now + RELEASE_S)
    osc.stop(now + RELEASE_S)
  }

  /**
   * Play a sequence of notes one after another (for echo / memory / ear).
   * Each note plays for its durMs then the next starts. `onDone` fires after the last.
   * Driven by the injected scheduler so it is testable without real audio.
   */
  playSequence(notes: { midi: number; durMs: number }[], onDone?: () => void): void {
    const step = (index: number): void => {
      if (index >= notes.length) {
        onDone?.()
        return
      }
      const { midi, durMs } = notes[index]
      this.noteOn(midi)
      this.schedule(() => {
        this.noteOff(midi)
        step(index + 1)
      }, durMs)
    }
    step(0)
  }
}

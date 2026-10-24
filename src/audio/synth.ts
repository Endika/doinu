import { PIANO_SAMPLES } from './piano-map.generated'

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
  /**
   * midi -> sample file map. Defaults to the bundled 88-key grand piano.
   * Tests can inject an empty map to avoid any fetch.
   */
  samples?: Record<number, string>
}

interface Voice {
  src: AudioBufferSourceNode
  gain: GainNode
}

const MASTER_GAIN = 0.85
const NOTE_OFF_FADE_S = 0.25
const RETRIGGER_FADE_S = 0.05

/**
 * Piano-voice synth driven by the bundled grand-piano samples (Musyng Kite,
 * 88 keys). Interface matches the old oscillator synth (resume / noteOn /
 * noteOff / playSequence) so no caller changed.
 *
 * Decoding happens in `warmup()` — an OfflineAudioContext is allowed without a
 * user gesture, so the instruments are ready by the time the child taps a key.
 */
export class Synth {
  private readonly createContext: () => AudioContext | null
  private readonly schedule: (fn: () => void, delayMs: number) => void
  private readonly samples: Record<number, string>
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private warmUpStarted = false
  private readonly buffers = new Map<number, AudioBuffer>()
  private readonly voices = new Map<number, Voice[]>()

  constructor(opts: SynthOptions = {}) {
    this.createContext =
      opts.createContext ??
      (typeof AudioContext !== 'undefined' ? () => new AudioContext() : () => null)
    this.schedule = opts.schedule ?? ((fn, ms) => setTimeout(fn, ms))
    this.samples = opts.samples ?? PIANO_SAMPLES
  }

  /**
   * Begin decoding every piano sample. No AudioContext (and therefore no user
   * gesture) needed: an offline context can decode files freely.
   */
  warmup(): void {
    if (this.warmUpStarted) return
    this.warmUpStarted = true
    if (typeof OfflineAudioContext === 'undefined') return
    const ctx = new OfflineAudioContext(2, 1, 44100)
    const tasks: Promise<void>[] = []
    for (const [midi, url] of Object.entries(this.samples)) {
      tasks.push(
        fetch(url)
          .then((res) => (res.ok ? res.arrayBuffer() : null))
          .then(
            (bytes) => {
              if (!bytes) return undefined
              return ctx.decodeAudioData(bytes)
            },
            () => undefined,
          )
          .then(
            (buffer) => {
              if (buffer) this.buffers.set(Number(midi), buffer)
            },
            () => undefined,
          ),
      )
    }
    void Promise.allSettled(tasks).then(() => {
      // Surfaced to logcat on device; confirms the bundled samples decoded.
      console.log('[piano] decoded ' + this.buffers.size + ' of ' + tasks.length)
    })
  }

  /** Lazily create the AudioContext on first use (needs a user gesture in browsers). Safe no-op if unavailable. */
  resume(): void {
    if (this.ctx) {
      void this.ctx.resume?.()
      return
    }
    this.warmup()
    const ctx = this.createContext()
    this.ctx = ctx
    if (!ctx) return
    const master = ctx.createGain()
    master.gain.value = MASTER_GAIN
    master.connect(ctx.destination)
    this.master = master
    void ctx.resume?.()
  }

  /** Start a piano voice for this midi (no-op if the samples are not decoded yet). */
  noteOn(midi: number, velocity = 1): void {
    this.resume()
    const ctx = this.ctx
    const master = this.master
    if (!ctx || !master) return
    const buffer = this.buffers.get(midi)
    if (!buffer) return

    // Retrigger: the old voice for the same note is faded out quickly.
    this.stopVoices(midi, RETRIGGER_FADE_S)

    const src = ctx.createBufferSource()
    src.buffer = buffer
    const gain = ctx.createGain()
    const now = ctx.currentTime
    const peak = 0.15 + Math.max(0, Math.min(1, velocity)) * (MASTER_GAIN - 0.15)

    // The sample already has a piano attack; just fade in enough to avoid clicks.
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(peak, now + 0.02)

    src.connect(gain)
    gain.connect(master)
    src.start(now)

    const voice: Voice = { src, gain }
    const list = this.voices.get(midi) ?? []
    list.push(voice)
    this.voices.set(midi, list)
    src.onended = () => this.settleVoice(midi, voice)
  }

  /** Fade the voice(s) for this midi out like a released piano key. */
  noteOff(midi: number): void {
    if (!this.ctx) return
    this.stopVoices(midi, NOTE_OFF_FADE_S)
  }

  private stopVoices(midi: number, fadeS: number): void {
    const ctx = this.ctx
    const list = this.voices.get(midi)
    if (!ctx || !list) return
    this.schedulesFade(ctx, list, fadeS)
    this.voices.set(midi, []) // voices detach; onended cleans them from the array
  }

  private schedulesFade(ctx: AudioContext, list: Voice[], fadeS: number): void {
    const now = ctx.currentTime
    for (const voice of list) {
      try {
        voice.gain.gain.cancelScheduledValues(now)
        voice.gain.gain.setValueAtTime(voice.gain.gain.value, now)
        voice.gain.gain.linearRampToValueAtTime(0.0001, now + fadeS)
        voice.src.stop(now + fadeS + 0.02)
      } catch {
        /* already stopped */
      }
    }
  }

  private settleVoice(midi: number, voice: Voice): void {
    const list = this.voices.get(midi)
    if (!list) return
    const index = list.indexOf(voice)
    if (index >= 0) list.splice(index, 1)
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

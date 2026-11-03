/**
 * Grand-piano sample playback for `Synth`.
 *
 * Nothing is fetched or decoded at startup. When a chart or a listen-and-repeat
 * exercise starts, `preload` loads just the notes it uses, so the whole piece
 * plays with one timbre. Any other key loads on its first `noteOn`, which
 * returns false so `Synth` sounds its oscillator for that one press. Only the
 * notes actually used are ever held in memory, and a missing or undecodable
 * file simply keeps the oscillator for that note.
 */

/** Peak level of the `Synth` oscillator at full velocity; samples are scaled to match it. */
const OSCILLATOR_PEAK = 0.3
const ATTACK_S = 0.005
/** Samples ring, so let a released key fade a little longer than the oscillator. */
const RELEASE_S = 0.25

interface Sample {
  buffer: AudioBuffer
  /** Gain that brings this buffer's peak to OSCILLATOR_PEAK at velocity 1. */
  scale: number
}

interface Voice {
  source: AudioBufferSourceNode
  gain: GainNode
}

/** Largest absolute sample value across all channels. Pure. */
export function bufferPeak(buffer: AudioBuffer): number {
  let peak = 0
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const data = buffer.getChannelData(c)
    for (let i = 0; i < data.length; i++) {
      const v = Math.abs(data[i])
      if (v > peak) peak = v
    }
  }
  return peak
}

const fetchBytes = (url: string): Promise<ArrayBuffer> =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error(`sample ${url}: ${res.status}`)
    return res.arrayBuffer()
  })

export class Sampler {
  private readonly samples = new Map<number, Sample>()
  /** Notes whose file was requested, by midi; settles once it is loaded or has failed. */
  private readonly requested = new Map<number, Promise<void>>()
  private readonly voices = new Map<number, Voice>()

  /**
   * @param urls midi -> sample file.
   * @param load injectable loader so tests never touch the network.
   */
  constructor(
    private readonly urls: Record<number, string>,
    private readonly load: (url: string) => Promise<ArrayBuffer> = fetchBytes,
  ) {}

  /** True once this midi's sample is decoded and ready to play. */
  isReady(midi: number): boolean {
    return this.samples.has(midi)
  }

  /**
   * Load and decode these notes (each file at most once). Resolves when every
   * one is ready or has failed; it never rejects.
   */
  preload(ctx: AudioContext, midis: Iterable<number>): Promise<void> {
    const pending: Promise<void>[] = []
    for (const midi of new Set(midis)) {
      const loading = this.request(ctx, midi)
      if (loading) pending.push(loading)
    }
    return Promise.all(pending).then(() => undefined)
  }

  /**
   * Play this midi's sample and return true, or start loading it and return
   * false so the caller plays its own fallback.
   */
  noteOn(ctx: AudioContext, midi: number, velocity: number): boolean {
    const sample = this.samples.get(midi)
    if (!sample) {
      void this.request(ctx, midi)
      return false
    }
    this.noteOff(midi)

    const source = ctx.createBufferSource()
    source.buffer = sample.buffer
    const gain = ctx.createGain()
    const now = ctx.currentTime
    const peak = Math.max(0, Math.min(1, velocity)) * sample.scale
    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(peak, now + ATTACK_S)

    source.connect(gain)
    gain.connect(ctx.destination)
    source.start(now)

    const voice: Voice = { source, gain }
    source.onended = () => {
      if (this.voices.get(midi) === voice) this.voices.delete(midi)
    }
    this.voices.set(midi, voice)
    return true
  }

  /** Fade out this midi's sample voice, if one is sounding. */
  noteOff(midi: number): void {
    const voice = this.voices.get(midi)
    if (!voice) return
    this.voices.delete(midi)

    const now = voice.source.context.currentTime
    const { source, gain } = voice
    gain.gain.cancelScheduledValues(now)
    gain.gain.setValueAtTime(gain.gain.value, now)
    gain.gain.linearRampToValueAtTime(0, now + RELEASE_S)
    source.stop(now + RELEASE_S)
  }

  /** Start loading this midi's file once; returns the pending load, if there is a file. */
  private request(ctx: AudioContext, midi: number): Promise<void> | undefined {
    const url = this.urls[midi]
    if (url === undefined) return undefined
    const existing = this.requested.get(midi)
    if (existing) return existing
    const loading = this.load(url)
      .then((bytes) => ctx.decodeAudioData(bytes))
      .then((buffer) => {
        const peak = bufferPeak(buffer)
        if (peak > 0) this.samples.set(midi, { buffer, scale: OSCILLATOR_PEAK / peak })
      })
      .catch(() => {
        // Missing or undecodable file: this note keeps using the oscillator.
      })
    this.requested.set(midi, loading)
    return loading
  }
}

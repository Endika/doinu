/**
 * Grand-piano sample playback for `Synth`.
 *
 * Nothing is fetched or decoded up front. The first `noteOn` for a midi starts
 * loading that one file and returns false, so `Synth` sounds its oscillator;
 * once the buffer is decoded, later presses of that key play the sample. Only
 * the notes actually played are ever held in memory.
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
  /** Notes whose file was requested (loading, loaded or failed); never requested twice. */
  private readonly requested = new Set<number>()
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
   * Play this midi's sample and return true, or start loading it and return
   * false so the caller plays its own fallback.
   */
  noteOn(ctx: AudioContext, midi: number, velocity: number): boolean {
    const sample = this.samples.get(midi)
    if (!sample) {
      this.request(ctx, midi)
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

  private request(ctx: AudioContext, midi: number): void {
    const url = this.urls[midi]
    if (url === undefined || this.requested.has(midi)) return
    this.requested.add(midi)
    this.load(url)
      .then((bytes) => ctx.decodeAudioData(bytes))
      .then((buffer) => {
        const peak = bufferPeak(buffer)
        if (peak > 0) this.samples.set(midi, { buffer, scale: OSCILLATOR_PEAK / peak })
      })
      .catch(() => {
        // Missing or undecodable file: this note keeps using the oscillator.
      })
  }
}

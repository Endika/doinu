import { describe, it, expect } from 'vitest'
import { Sampler, bufferPeak } from '../src/audio/sampler'

function fakeBuffer(channels: number[][]): AudioBuffer {
  return {
    numberOfChannels: channels.length,
    getChannelData: (c: number) => Float32Array.from(channels[c]),
  } as unknown as AudioBuffer
}

function fakeContext(buffer: AudioBuffer) {
  const ramps: number[] = []
  const started: AudioBuffer[] = []
  const stopped: number[] = []
  let decodes = 0
  const ctx = {
    currentTime: 0,
    destination: {},
    decodeAudioData: () => {
      decodes++
      return Promise.resolve(buffer)
    },
    createGain: () => ({
      gain: {
        value: 0,
        setValueAtTime() {},
        linearRampToValueAtTime(v: number) {
          ramps.push(v)
        },
        cancelScheduledValues() {},
      },
      connect() {},
    }),
    createBufferSource() {
      const src = {
        buffer: null as AudioBuffer | null,
        context: { currentTime: 0 },
        onended: null as (() => void) | null,
        connect() {},
        start() {
          started.push(src.buffer as AudioBuffer)
        },
        stop(t: number) {
          stopped.push(t)
        },
      }
      return src
    },
  }
  return {
    ctx: ctx as unknown as AudioContext,
    ramps,
    started,
    stopped,
    decodes: () => decodes,
  }
}

const flush = () => new Promise((r) => setTimeout(r, 0))

describe('bufferPeak', () => {
  it('returns the largest absolute value across channels', () => {
    expect(
      bufferPeak(
        fakeBuffer([
          [0.1, -0.5],
          [0.25, 0.4],
        ]),
      ),
    ).toBeCloseTo(0.5)
  })
})

describe('Sampler', () => {
  it('declines a note until its sample is decoded, then plays it', async () => {
    const loaded: string[] = []
    const f = fakeContext(fakeBuffer([[0.6, -0.2]]))
    const s = new Sampler({ 60: 'c4.mp3', 62: 'd4.mp3' }, (url) => {
      loaded.push(url)
      return Promise.resolve(new ArrayBuffer(8))
    })
    expect(loaded).toEqual([])
    expect(s.noteOn(f.ctx, 60, 1)).toBe(false)
    expect(s.noteOn(f.ctx, 60, 1)).toBe(false)
    expect(loaded).toEqual(['c4.mp3'])
    await flush()
    expect(s.isReady(60)).toBe(true)
    expect(s.isReady(62)).toBe(false)
    expect(f.decodes()).toBe(1)
    expect(s.noteOn(f.ctx, 60, 1)).toBe(true)
    expect(f.started).toHaveLength(1)
  })

  it('scales the sample so its peak matches the oscillator (0.3 at velocity 1)', async () => {
    const f = fakeContext(fakeBuffer([[0.6, -0.2]]))
    const s = new Sampler({ 60: 'c4.mp3' }, () => Promise.resolve(new ArrayBuffer(8)))
    s.noteOn(f.ctx, 60, 1)
    await flush()
    s.noteOn(f.ctx, 60, 1)
    expect(f.ramps[0] * 0.6).toBeCloseTo(0.3)
    s.noteOn(f.ctx, 60, 0.5)
    expect(f.ramps.at(-1)! * 0.6).toBeCloseTo(0.15)
  })

  it('fades out on noteOff and ignores notes without a file or a failed load', async () => {
    const f = fakeContext(fakeBuffer([[0.5]]))
    const s = new Sampler({ 60: 'c4.mp3', 61: 'bad.mp3' }, (url) =>
      url === 'bad.mp3' ? Promise.reject(new Error('404')) : Promise.resolve(new ArrayBuffer(8)),
    )
    s.noteOn(f.ctx, 60, 1)
    expect(s.noteOn(f.ctx, 61, 1)).toBe(false)
    expect(s.noteOn(f.ctx, 99, 1)).toBe(false)
    await flush()
    expect(s.isReady(61)).toBe(false)
    s.noteOn(f.ctx, 60, 1)
    s.noteOff(60)
    expect(f.stopped).toHaveLength(1)
    expect(() => s.noteOff(60)).not.toThrow()
  })
})

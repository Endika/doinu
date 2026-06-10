import { describe, it, expect } from 'vitest'
import { MidiInputAdapter } from '../src/core/midi-adapter'
import { FakeMidiAccess } from './helpers/fake-midi'
describe('midi adapter', () => {
  it('normalizes 0x90/0x80 messages into on/off events', async () => {
    const access = new FakeMidiAccess()
    const a = new MidiInputAdapter(() => Promise.resolve(access as unknown as MIDIAccess))
    const got: string[] = []
    a.onEvent(e => got.push(`${e.type}:${e.note}`))
    await a.start()
    access.fire([0x90, 60, 100]); access.fire([0x80, 60, 0])
    expect(got).toEqual(['on:60', 'off:60'])
  })
  it('treats note-on with velocity 0 as note-off', async () => {
    const access = new FakeMidiAccess()
    const a = new MidiInputAdapter(() => Promise.resolve(access as unknown as MIDIAccess))
    const got: string[] = []
    a.onEvent(e => got.push(`${e.type}:${e.note}`))
    await a.start()
    access.fire([0x90, 64, 0])
    expect(got).toEqual(['off:64'])
  })
})

import { describe, it, expect } from 'vitest'
import { SONGS } from '../src/content/songs'
import { CURRICULUM } from '../src/content/curriculum'
import { SongMode, HandSelection } from '../src/modes/song-mode'
import { MelodyMode } from '../src/modes/melody-mode'
import { ScaleMode, SCALES } from '../src/modes/scale-mode'

const _ = undefined

function songFingers(id: string): (number | undefined)[] {
  const song = SONGS.find((s) => s.id === id)
  if (!song) throw new Error(`no song ${id}`)
  return new SongMode(song, HandSelection.Right).buildChart().targets.map((t) => t.finger)
}

describe('fingering in songs: one five-finger position, the rest unmarked', () => {
  it('Twinkle keeps the C position: La is unmarked and Fa takes the ring finger', () => {
    const f = songFingers('twinkle')
    // C C G G A A G | F F E E D D C
    expect(f.slice(0, 14)).toEqual([1, 1, 5, 5, _, _, 5, 4, 4, 3, 3, 2, 2, 1])
  })

  it('Happy Birthday keeps the C position and leaves the high notes unmarked', () => {
    const f = songFingers('birthday')
    // C C D C F E | C C D C G F | C C C5 A F E D | Bb Bb A F G F
    expect(f).toEqual([1, 1, 2, 1, 4, 3, 1, 1, 2, 1, 5, 4, 1, 1, _, _, 4, 3, 2, _, _, _, 4, 5, 4])
  })

  it('London Bridge sits in the D position and leaves the final C unmarked', () => {
    const f = songFingers('london')
    // G A G F E F G | D E F | E F G
    expect(f.slice(0, 13)).toEqual([4, 5, 4, 3, 2, 3, 4, 1, 2, 3, 2, 3, 4])
    expect(f[f.length - 1]).toBeUndefined()
  })

  it('Frère Jacques keeps the C position: the high A and the low G are unmarked', () => {
    const f = songFingers('frere')
    expect(f.slice(0, 8)).toEqual([1, 2, 3, 1, 1, 2, 3, 1])
    expect(f.slice(14, 20)).toEqual([5, _, 5, 4, 3, 1])
    expect(f.slice(26)).toEqual([1, _, 1, 1, _, 1])
  })

  it('Yankee Doodle keeps the C position and leaves the B and A unmarked', () => {
    const f = songFingers('yankee')
    expect(f.slice(0, 20)).toEqual([1, 1, 2, 3, 1, 3, 2, 1, 1, 2, 3, 1, 1, 1, 2, 3, 4, 3, 2, 1])
    expect(f.slice(20)).toEqual([_, 5, _, _, 1])
  })

  it('never gives a song pitch two different fingers', () => {
    for (const song of SONGS) {
      const targets = new SongMode(song, HandSelection.Right).buildChart().targets
      const seen = new Map<number, number>()
      for (const t of targets) {
        if (t.finger === undefined) continue
        const before = seen.get(t.midi)
        if (before !== undefined) expect([song.id, t.finger]).toEqual([song.id, before])
        seen.set(t.midi, t.finger)
      }
    }
  })
})

describe('fingering in exercises', () => {
  it('uses the usual beginner fingering for the Twinkle opening', () => {
    const twinkle = CURRICULUM.find((e) => e.id === 'twinkle-1')
    if (!twinkle) throw new Error('no twinkle-1')
    const f = new MelodyMode(twinkle).buildChart().targets.map((t) => t.finger)
    expect(f).toEqual([1, 1, 4, 4, 5, 5, 4])
  })

  it('still fingers scales with the scale pattern', () => {
    const f = new ScaleMode(SCALES[0]).buildChart().targets.map((t) => t.finger)
    expect(f.slice(0, 8)).toEqual([1, 2, 3, 1, 2, 3, 4, 5])
  })
})

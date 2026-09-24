import { uuidv7 } from 'uuidv7'
import type { Chart, Target } from '../engine/chart'
import { Hand } from '../engine/chart'
import type { RecordedNote } from '../modes/composition-recorder'
import { readArray, writeArray, type KeyValueStorage } from './array-storage'

/** A saved, named melody the learner composed. */
export interface Composition {
  id: string // uuidv7
  name: string
  createdAt: number // epoch ms (caller-supplied so it is testable)
  notes: RecordedNote[]
}

const STORAGE_KEY = 'doinu.compositions'

export class CompositionStore {
  constructor(
    private readonly storage: KeyValueStorage,
    private readonly makeId: () => string = uuidv7,
    private readonly onWriteFailed?: () => void,
  ) {}

  save(input: { name: string; createdAt: number; notes: RecordedNote[] }): Composition {
    const composition: Composition = { id: this.makeId(), ...input }
    const all = this.all()
    all.push(composition)
    if (!writeArray(this.storage, STORAGE_KEY, all)) this.onWriteFailed?.()
    return composition
  }

  all(): Composition[] {
    return readArray<Composition>(this.storage, STORAGE_KEY)
  }

  remove(id: string): void {
    const remaining = this.all().filter((c) => c.id !== id)
    if (!writeArray(this.storage, STORAGE_KEY, remaining)) this.onWriteFailed?.()
  }
}

/** Turn a recorded melody into a playable Chart (real timing preserved, right hand). */
export function compositionChart(notes: RecordedNote[]): Chart {
  const targets: Target[] = notes.map((n, i) => ({
    id: `n${i}`,
    midi: n.midi,
    startMs: n.startMs,
    durMs: n.durMs,
    hand: Hand.Right,
  }))
  return { bpm: 100, targets }
}

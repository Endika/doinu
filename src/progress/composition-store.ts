import { uuidv7 } from 'uuidv7'
import type { Chart, Target } from '../engine/chart'
import { Hand } from '../engine/chart'
import type { RecordedNote } from '../modes/composition-recorder'
import type { KeyValueStorage } from './metrics-store'

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
  ) {}

  save(input: { name: string; createdAt: number; notes: RecordedNote[] }): Composition {
    const composition: Composition = { id: this.makeId(), ...input }
    const all = this.all()
    all.push(composition)
    this.storage.setItem(STORAGE_KEY, JSON.stringify(all))
    return composition
  }

  all(): Composition[] {
    const raw = this.storage.getItem(STORAGE_KEY)
    if (raw === null) return []
    try {
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? (parsed as Composition[]) : []
    } catch {
      return []
    }
  }

  remove(id: string): void {
    this.storage.setItem(STORAGE_KEY, JSON.stringify(this.all().filter(c => c.id !== id)))
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

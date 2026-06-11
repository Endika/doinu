import { describe, it, expect } from 'vitest'
import { CompositionStore, compositionChart } from '../src/progress/composition-store'
import type { RecordedNote } from '../src/modes/composition-recorder'

class FakeStorage {
  private map = new Map<string, string>()
  getItem(k: string): string | null { return this.map.get(k) ?? null }
  setItem(k: string, v: string): void { this.map.set(k, v) }
}

const ids = () => { let n = 0; return () => `id${++n}` }
const notes: RecordedNote[] = [{ midi: 60, startMs: 0, durMs: 500 }, { midi: 62, startMs: 600, durMs: 400 }]

describe('CompositionStore', () => {
  it('saves and lists a composition', () => {
    const store = new CompositionStore(new FakeStorage(), ids())
    const c = store.save({ name: 'My tune', createdAt: 123, notes })
    expect(c.id).toBe('id1')
    expect(store.all()).toEqual([{ id: 'id1', name: 'My tune', createdAt: 123, notes }])
  })

  it('persists across store instances sharing storage, and removes by id', () => {
    const storage = new FakeStorage()
    const a = new CompositionStore(storage, ids())
    a.save({ name: 'One', createdAt: 1, notes })
    const saved = a.save({ name: 'Two', createdAt: 2, notes })
    const b = new CompositionStore(storage)
    expect(b.all().map(c => c.name)).toEqual(['One', 'Two'])
    b.remove(saved.id)
    expect(b.all().map(c => c.name)).toEqual(['One'])
  })

  it('returns [] when storage is empty or corrupt', () => {
    const storage = new FakeStorage()
    expect(new CompositionStore(storage).all()).toEqual([])
    storage.setItem('doinu.compositions', 'not json')
    expect(new CompositionStore(storage).all()).toEqual([])
  })
})

describe('compositionChart', () => {
  it('maps recorded notes to co-timed right-hand targets, preserving timing', () => {
    const chart = compositionChart(notes)
    expect(chart.targets).toEqual([
      { id: 'n0', midi: 60, startMs: 0, durMs: 500, hand: 'R' },
      { id: 'n1', midi: 62, startMs: 600, durMs: 400, hand: 'R' },
    ])
    expect(new Set(chart.targets.map(t => t.id)).size).toBe(2)
  })
})

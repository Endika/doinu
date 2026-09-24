import { describe, it, expect } from 'vitest'
import { MetricsStore } from '../src/progress/metrics-store'
import { FakeStorage } from './helpers/fake-storage'

const summary = { accuracy: 0.9, meanTimingDevMs: 30, meanFindMs: 800, tempoBpm: 60 }

/** Seeds bypass setItem, so a read that writes anything back throws and fails the test. */
class NoWriteStorage {
  private map = new Map<string, string>()
  seed(k: string, v: string): void {
    this.map.set(k, v)
  }
  getItem(k: string): string | null {
    return this.map.get(k) ?? null
  }
  setItem(): never {
    throw new Error('reading must never write')
  }
}

class ThrowingReadStorage {
  getItem(): never {
    throw new Error('storage unavailable')
  }
  setItem(): void {}
}

class ThrowingWriteStorage {
  private map = new Map<string, string>()
  getItem(k: string): string | null {
    return this.map.get(k) ?? null
  }
  setItem(): never {
    throw new Error('quota exceeded')
  }
}

describe('metrics store', () => {
  it('records a session and reads it back', () => {
    let n = 0
    const store = new MetricsStore(new FakeStorage(), () => `id-${++n}`)
    const s = store.record({ exerciseId: 'twinkle-1', timestamp: 1000, summary })
    expect(s.id).toBe('id-1')
    expect(s.exerciseId).toBe('twinkle-1')
    expect(s.accuracy).toBe(0.9)
    expect(store.all()).toHaveLength(1)
  })

  it('returns sessions for an exercise in chronological order', () => {
    let n = 0
    const store = new MetricsStore(new FakeStorage(), () => `id-${++n}`)
    store.record({ exerciseId: 'a', timestamp: 3000, summary })
    store.record({ exerciseId: 'a', timestamp: 1000, summary })
    store.record({ exerciseId: 'b', timestamp: 2000, summary })
    expect(store.sessionsFor('a').map((s) => s.timestamp)).toEqual([1000, 3000])
  })

  it('survives corrupt storage without throwing', () => {
    const fake = new FakeStorage()
    fake.setItem('doinu.sessions', 'not json')
    const store = new MetricsStore(fake, () => 'x')
    expect(store.all()).toEqual([])
  })

  it('loads back a fixture built via the current save path, complete (format guard)', () => {
    const storage = new FakeStorage()
    const writer = new MetricsStore(storage, () => 'id-1')
    writer.record({ exerciseId: 'twinkle-1', timestamp: 1000, summary })

    const reader = new MetricsStore(storage)
    expect(reader.all()).toEqual([
      {
        id: 'id-1',
        exerciseId: 'twinkle-1',
        timestamp: 1000,
        accuracy: 0.9,
        meanTimingDevMs: 30,
        meanFindMs: 800,
        tempoBpm: 60,
      },
    ])
  })

  it('never writes to storage while reading, whether missing or corrupt', () => {
    const storage = new NoWriteStorage()
    expect(() => new MetricsStore(storage).all()).not.toThrow()
    storage.seed('doinu.sessions', 'not json')
    expect(() => new MetricsStore(storage).all()).not.toThrow()
    expect(new MetricsStore(storage).all()).toEqual([])
  })

  it('treats a throwing storage as empty, without crashing', () => {
    expect(new MetricsStore(new ThrowingReadStorage()).all()).toEqual([])
  })

  it('reports a failed record instead of throwing or claiming success', () => {
    let reported = false
    const store = new MetricsStore(
      new ThrowingWriteStorage(),
      () => 'id-1',
      () => {
        reported = true
      },
    )
    const s = store.record({ exerciseId: 'twinkle-1', timestamp: 1000, summary })
    expect(s.id).toBe('id-1')
    expect(reported).toBe(true)
  })
})

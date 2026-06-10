import { describe, it, expect } from 'vitest'
import { MetricsStore } from '../src/progress/metrics-store'
import { FakeStorage } from './helpers/fake-storage'

const summary = { accuracy: 0.9, meanTimingDevMs: 30, meanFindMs: 800, tempoBpm: 60 }

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
})

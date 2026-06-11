import { describe, it, expect } from 'vitest'
import { FakeInputAdapter } from '../src/core/fake-adapter'
import { InputEventType } from '../src/core/events'
describe('fake adapter', () => {
  it('emits scripted events to a listener in order', () => {
    const got: number[] = []
    const a = new FakeInputAdapter([
      { note: 60, type: InputEventType.On, time: 0 }, { note: 60, type: InputEventType.Off, time: 100 },
    ])
    a.onEvent(e => got.push(e.note))
    a.play()
    expect(got).toEqual([60, 60])
    expect(a.capabilities.polyphonic).toBe(true)
  })
})

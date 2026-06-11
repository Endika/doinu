import { describe, it, expect } from 'vitest'
import { Engine } from '../src/engine/engine'
import { FakeInputAdapter } from '../src/core/fake-adapter'
import { ManualClock } from '../src/core/clock'
import { Hand } from '../src/engine/chart'
import { InputEventType } from '../src/core/events'
const chart = { bpm: 60, targets: [
  { id: 'a', midi: 60, startMs: 0, durMs: 400, hand: Hand.Right },
  { id: 'b', midi: 62, startMs: 400, durMs: 400, hand: Hand.Right },
]}
describe('engine', () => {
  it('plays a chart and reports a correct summary', () => {
    const clock = new ManualClock()
    const adapter = new FakeInputAdapter([
      { note: 60, type: InputEventType.On, time: 30 }, { note: 62, type: InputEventType.On, time: 430 },
    ])
    const engine = new Engine(chart, adapter, clock, { windowMs: 150 })
    engine.start(); adapter.play(); clock.t = 1000; engine.tick()
    const m = engine.summary()
    expect(m.accuracy).toBeCloseTo(1)
  })
})

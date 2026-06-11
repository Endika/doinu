import { describe, it, expect } from 'vitest'
import { selectAdapter, pickCurrentExerciseId } from '../src/ui/app'
import { InputSource } from '../src/core/input-adapter'
import { MasteryState } from '../src/progress/mastery'
describe('adapter selection', () => {
  it('uses midi when web midi is available', () => {
    expect(selectAdapter({ hasWebMidi: true }).capabilities.source).toBe(InputSource.Midi)
  })
  it('falls back to the microphone (monophonic) when no midi', () => {
    const a = selectAdapter({ hasWebMidi: false })
    expect(a.capabilities.source).toBe(InputSource.Mic)
    expect(a.capabilities.polyphonic).toBe(false)
  })
  it('honours a stored preference: mic even with midi, midi when available', () => {
    expect(selectAdapter({ hasWebMidi: true }, 'mic').capabilities.source).toBe(InputSource.Mic)
    expect(selectAdapter({ hasWebMidi: true }, 'midi').capabilities.source).toBe(InputSource.Midi)
    expect(selectAdapter({ hasWebMidi: false }, 'midi').capabilities.source).toBe(InputSource.Mic)
  })
})

describe('pickCurrentExerciseId', () => {
  it('returns the first inProgress exercise', () => {
    expect(pickCurrentExerciseId([
      { exerciseId: 'a', state: MasteryState.Mastered },
      { exerciseId: 'b', state: MasteryState.InProgress },
      { exerciseId: 'c', state: MasteryState.Locked },
    ])).toBe('b')
  })
  it('falls back to the last exercise when all are mastered', () => {
    expect(pickCurrentExerciseId([
      { exerciseId: 'a', state: MasteryState.Mastered },
      { exerciseId: 'b', state: MasteryState.Mastered },
    ])).toBe('b')
  })
})

import { describe, it, expect } from 'vitest'
import { selectAdapter, pickCurrentExerciseId } from '../src/ui/app'
import { InputSource } from '../src/core/input-adapter'
import { MasteryState } from '../src/progress/mastery'
describe('adapter selection', () => {
  it('uses midi when web midi is available', () => {
    expect(selectAdapter({ hasWebMidi: true }).capabilities.source).toBe(InputSource.Midi)
  })
  it('falls back to a null adapter with a clear status when no midi', () => {
    const a = selectAdapter({ hasWebMidi: false })
    expect(a.capabilities.source).toBe(InputSource.Fake)   // null/idle adapter
    expect(a.statusKey).toBe('input.noMidiMicLater')
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

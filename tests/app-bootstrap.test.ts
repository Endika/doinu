import { describe, it, expect } from 'vitest'
import { selectAdapter, pickCurrentExerciseId } from '../src/ui/app'
describe('adapter selection', () => {
  it('uses midi when web midi is available', () => {
    expect(selectAdapter({ hasWebMidi: true }).capabilities.source).toBe('midi')
  })
  it('falls back to a null adapter with a clear status when no midi', () => {
    const a = selectAdapter({ hasWebMidi: false })
    expect(a.capabilities.source).toBe('fake')   // null/idle adapter
    expect(a.statusKey).toBe('input.noMidiMicLater')
  })
})

describe('pickCurrentExerciseId', () => {
  it('returns the first inProgress exercise', () => {
    expect(pickCurrentExerciseId([
      { exerciseId: 'a', state: 'mastered' },
      { exerciseId: 'b', state: 'inProgress' },
      { exerciseId: 'c', state: 'locked' },
    ])).toBe('b')
  })
  it('falls back to the last exercise when all are mastered', () => {
    expect(pickCurrentExerciseId([
      { exerciseId: 'a', state: 'mastered' },
      { exerciseId: 'b', state: 'mastered' },
    ])).toBe('b')
  })
})

import { describe, it, expect } from 'vitest'
import { selectAdapter } from '../src/ui/app'
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

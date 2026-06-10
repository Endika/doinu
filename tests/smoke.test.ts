import { describe, it, expect } from 'vitest'
import { appVersion } from '../src/main'

describe('scaffold', () => {
  it('exposes a version string', () => {
    expect(appVersion).toMatch(/\d+\.\d+\.\d+/)
  })
})

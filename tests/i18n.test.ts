import { describe, it, expect } from 'vitest'
import { resolveLocale, createI18n } from '../src/i18n'
describe('resolveLocale', () => {
  it('prefers a valid stored override', () => {
    expect(resolveLocale('en-US', 'es')).toBe('es')
    expect(resolveLocale('es-ES', 'en')).toBe('en')
  })
  it('falls back to navigator language', () => {
    expect(resolveLocale('es-ES', null)).toBe('es')
    expect(resolveLocale('en-GB', null)).toBe('en')
    expect(resolveLocale(undefined, null)).toBe('en')
  })
  it('ignores an invalid stored value', () => {
    expect(resolveLocale('es-ES', 'xx')).toBe('es')
  })
})
describe('createI18n', () => {
  it('translates and switches', () => {
    const i = createI18n('en')
    expect(i.t('act.melody')).toBe('🎵 Melody')
    i.set('es')
    expect(i.t('act.melody')).toBe('🎵 Melodía')
  })
})

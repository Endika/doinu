import { describe, it, expect } from 'vitest'
import { resolveLocale, createI18n, Locale } from '../src/i18n'
describe('resolveLocale', () => {
  it('prefers a valid stored override', () => {
    expect(resolveLocale('en-US', 'es')).toBe(Locale.Es)
    expect(resolveLocale('es-ES', 'en')).toBe(Locale.En)
  })
  it('falls back to navigator language', () => {
    expect(resolveLocale('es-ES', null)).toBe(Locale.Es)
    expect(resolveLocale('zh-CN', null)).toBe(Locale.Zh)
    expect(resolveLocale('zh-Hant', null)).toBe(Locale.Zh)
    expect(resolveLocale('en-GB', null)).toBe(Locale.En)
    expect(resolveLocale(undefined, null)).toBe(Locale.En)
  })
  it('honours a stored Chinese override', () => {
    expect(resolveLocale('en-US', 'zh')).toBe(Locale.Zh)
  })
  it('ignores an invalid stored value', () => {
    expect(resolveLocale('es-ES', 'xx')).toBe(Locale.Es)
  })
})
describe('createI18n', () => {
  it('translates and switches', () => {
    const i = createI18n(Locale.En)
    expect(i.t('act.melody')).toBe('🎵 Melody')
    i.set(Locale.Es)
    expect(i.t('act.melody')).toBe('🎵 Melodía')
    i.set(Locale.Zh)
    expect(i.t('act.melody')).toBe('🎵 旋律')
    expect(i.t('lang.toggle')).toBe('ES')
  })
})

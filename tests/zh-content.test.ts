import { describe, it, expect } from 'vitest'
import { lookupZhTitle, lookupZhConcept, localizeStudyTitle } from '../src/content/zh'

describe('zh content', () => {
  it('returns the zh title for a known lesson id', () => {
    expect(lookupZhTitle('u1-doremi', 'Do Re Mi')).toBe('Do Re Mi')
    expect(lookupZhTitle('u1-hand', 'The whole hand')).toBe('五指全开')
    expect(lookupZhTitle('twinkle', 'Twinkle Twinkle')).toBe('一闪一闪亮晶晶')
  })

  it('falls back to the original title for unknown ids', () => {
    expect(lookupZhTitle('nope', 'Original')).toBe('Original')
  })

  it('localizes concepts', () => {
    expect(lookupZhConcept('u1-doremi', 'fallback')).toBe('你的前三个音')
    expect(lookupZhConcept('unknown', 'fallback')).toBe('fallback')
  })

  it('localizes generated study titles by pattern', () => {
    expect(localizeStudyTitle('C major scale 🪜')).toBe('C 大调音阶 🪜')
    expect(localizeStudyTitle('C# minor scale 🌙')).toBe('C# 小调音阶 🌙')
    expect(localizeStudyTitle('D arpeggio 🎵')).toBe('D 琶音 🎵')
    expect(localizeStudyTitle('E five-finger ✋')).toBe('E 五指练习 ✋')
    expect(localizeStudyTitle('F broken chords 🎹')).toBe('F 分解和弦 🎹')
  })
})

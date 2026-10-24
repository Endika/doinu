/**
 * Chinese titles for authored content (lessons, songs, exercises).
 *
 * The content data stays bilingual-safe English (matching the upstream project);
 * this map supplies zh overrides keyed by content id. `lookupZhTitle` is pure so
 * it can be tested and used on both the path and songs screens.
 */

export const ZH_CONTENT: Record<string, { title?: string; concept?: string }> = {
  // ---- learning-path units ----
  u1: { title: '🎵 认识音符' },
  u2: { title: '🎹 黑键' },
  u3: { title: '🤝 一起弹奏' },
  u4: { title: '🙌 双手' },
  u5: { title: '🗝️ 更多琴键' },
  u6: { title: '📖 读谱' },

  // ---- learning-path lessons ----
  'u1-doremi': { title: 'Do Re Mi', concept: '你的前三个音' },
  'u1-hand': { title: '五指全开', concept: '五个音：Do 到 Sol' },
  'u1-octave': { title: '高音 Do', concept: '完整八度' },
  'u1-tune': { title: '小曲子', concept: '音符跳来跳去' },
  'u2-fsharp': { title: '认识 Fa#', concept: '你的第一个黑键' },
  'u2-bflat': { title: '认识 Sib', concept: '又一个黑键' },
  'u2-blacks': { title: '黑键散步', concept: '连弹好几个黑键' },
  'u3-two': { title: '两个音一起', concept: '同时弹 Do 和 Mi' },
  'u3-triad-c': { title: '第一个和弦', concept: 'C 大三和弦' },
  'u3-triad-f': { title: 'F 和弦', concept: '新的和弦手型' },
  'u3-triad-g': { title: 'G 和弦', concept: '新的和弦手型' },
  'u3-changes': { title: '换和弦', concept: '在和弦之间移动' },
  'u4-lh': { title: '左手来了', concept: '弹低音' },
  'u4-both': { title: '旋律 + 低音', concept: '双手一起弹' },
  'u4-song': { title: '双手小曲', concept: '一首完整的双手曲子' },
  'u5-gmajor': { title: 'G 大调', concept: '带一个升号的音阶' },
  'u5-fmajor': { title: 'F 大调', concept: '带一个降号的音阶' },
  'u6-staff': { title: '五线谱', concept: '音符住在哪里' },
  'u6-read-note': { title: '认音符', concept: '说出你看到的音' },
  'u6-read-melody': { title: '读一段旋律', concept: '不看颜色弹' },

  // ---- melody curriculum exercises ----
  'first-three': { title: '前三个音' },
  'twinkle-1': { title: '一闪一闪（开头）' },
  'five-finger': { title: '五指音阶' },

  // ---- scales (menu) ----
  'c-major-up': { title: 'C 大调（上行）' },
  'c-major-updown': { title: 'C 大调（上行+下行）' },

  // ---- songs ----
  twinkle: { title: '一闪一闪亮晶晶' },
  mary: { title: '玛丽有只小羊羔' },
  ode: { title: '欢乐颂' },
  jingle: { title: '铃儿响叮当' },
  frere: { title: '两只老虎' },
  macdonald: { title: '老麦克唐纳' },
  hotcross: { title: '热十字面包' },
  birthday: { title: '生日快乐' },
  row: { title: '划船歌' },
  auclair: { title: '月光下' },
  lightlyrow: { title: '轻轻划' },
  threemice: { title: '三只瞎老鼠' },
  london: { title: '伦敦桥' },
  yankee: { title: '扬基歌' },
  furelise: { title: '致爱丽丝' },
  silentnight: { title: '平安夜' },
  saints: { title: '圣徒进行曲' },
  susanna: { title: '哦！苏珊娜' },
}

/** zh override for a content title, falling back to the original English. */
export function lookupZhTitle(id: string, fallback: string): string {
  return ZH_CONTENT[id]?.title ?? fallback
}

/** zh override for a lesson concept line, falling back to the original. */
export function lookupZhConcept(id: string, fallback: string): string {
  return ZH_CONTENT[id]?.concept ?? fallback
}

const STUDY_ZH: Record<string, string> = {
  'major scale': '大调音阶',
  'minor scale': '小调音阶',
  arpeggio: '琶音',
  'five-finger': '五指练习',
  'broken chords': '分解和弦',
}

/**
 * Localize a generated study title (e.g. "C major scale 🪜" -> "C 大调音阶 🪜").
 * Study names are built by pattern, so we translate the descriptor only.
 */
export function localizeStudyTitle(title: string): string {
  const match = title.match(/^(.+?) (major scale|minor scale|arpeggio|five-finger|broken chords)/)
  if (!match) return title
  const zh = STUDY_ZH[match[2]]
  if (!zh) return title
  return `${match[1]} ${zh}${title.slice(match[0].length)}`
}

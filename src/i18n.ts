/**
 * Minimal flat-dictionary i18n for the Doinu PWA (English + Spanish).
 *
 * Node-safe: no DOM access at import time. `resolveLocale` is pure (testable
 * without a browser); `createI18n` holds a mutable locale and a `t(key)` lookup.
 * Emojis live inside the strings so the UI keeps its playful labels in both
 * languages.
 */

export enum Locale { En = 'en', Es = 'es' }

const MESSAGES = {
  en: {
    'menu.sub': "Let's play! 🎶",
    'act.melody': '🎵 Melody',
    'act.songs': '🎶 Songs',
    'act.import': '📂 Load MIDI',
    'act.practice': '🐢 Practice (wait)',
    'act.progress': '📊 Progress',
    'act.echo': '🔁 Echo',
    'act.memory': '🧠 Memory',
    'act.notefind': '🔎 Find the note',
    'act.ear': '👂 Listen & play',
    'act.rhythm': '🥁 Tap the beat',
    'act.scaleup': '🪜 Scale up',
    'act.scaleupdown': '🎢 Scale up & down',
    'act.free': '✨ Free play',
    'act.path': '🗺️ Path',
    'nav.back': '← Menu',
    'songs.title': '🎶 Songs',
    'songs.pick': 'Pick a song 🎹',
    'songs.studies': '🎹 Scales & studies',
    'path.title': '🗺️ Learning path',
    'path.sub': 'Learn step by step 🎹',
    'path.soon': 'Soon',
    'progress.title': '📊 Progress',
    'progress.sub': "How you're doing 🌟",
    'progress.empty': 'Play a little and your progress shows up here ✨',
    'hand.play': '▶ Play',
    'hand.right': '👉 Right',
    'hand.left': '👈 Left',
    'hand.both': '🙌 Both',
    'st.listen': 'Listen… 👂',
    'st.yourTurn': 'Your turn! 🎶',
    'st.watch': 'Watch… 👀',
    'st.find': 'Find this key! 🔎',
    'st.read': 'Read this note 🎼',
    'st.yes': 'Yes! ✅',
    'st.tryAgainEar': 'Try again 👂',
    'st.getReady': 'Get ready… 🥁',
    'st.freePlay': 'Free play — press any key',
    'st.midiError': 'Could not read that MIDI file 🙈',
    'st.noMidi': 'No MIDI keyboard detected. Microphone input is coming soon.',
    'st.level': 'Level',
    'st.best': 'Best',
    'st.tap': 'Tap!',
    'praise.amazing': 'Amazing!',
    'praise.great': 'Great!',
    'praise.good': 'Good try!',
    'praise.keep': 'Keep going!',
    'praise.again': "Let's try again! 🙈",
    'lang.toggle': 'ES',
  },
  es: {
    'menu.sub': '¡A jugar! 🎶',
    'act.melody': '🎵 Melodía',
    'act.songs': '🎶 Canciones',
    'act.import': '📂 Cargar MIDI',
    'act.practice': '🐢 Práctica (espera)',
    'act.progress': '📊 Progreso',
    'act.echo': '🔁 Eco',
    'act.memory': '🧠 Memoria',
    'act.notefind': '🔎 Encuentra la nota',
    'act.ear': '👂 Escucha y toca',
    'act.rhythm': '🥁 Sigue el ritmo',
    'act.scaleup': '🪜 Escala (sube)',
    'act.scaleupdown': '🎢 Escala (sube y baja)',
    'act.free': '✨ Juego libre',
    'act.path': '🗺️ Camino',
    'nav.back': '← Menú',
    'songs.title': '🎶 Canciones',
    'songs.pick': 'Elige una canción 🎹',
    'songs.studies': '🎹 Escalas y estudios',
    'path.title': '🗺️ El camino',
    'path.sub': 'Aprende paso a paso 🎹',
    'path.soon': 'Pronto',
    'progress.title': '📊 Progreso',
    'progress.sub': 'Cómo lo llevas 🌟',
    'progress.empty': 'Juega un poco y tu progreso aparece aquí ✨',
    'hand.play': '▶ Tocar',
    'hand.right': '👉 Derecha',
    'hand.left': '👈 Izquierda',
    'hand.both': '🙌 Ambas',
    'st.listen': 'Escucha… 👂',
    'st.yourTurn': '¡Tu turno! 🎶',
    'st.watch': 'Mira… 👀',
    'st.find': '¡Encuentra esta tecla! 🔎',
    'st.read': 'Lee esta nota 🎼',
    'st.yes': '¡Sí! ✅',
    'st.tryAgainEar': 'Otra vez 👂',
    'st.getReady': 'Prepárate… 🥁',
    'st.freePlay': 'Juego libre — pulsa cualquier tecla',
    'st.midiError': 'No pude leer ese MIDI 🙈',
    'st.noMidi': 'No se detecta teclado MIDI. La entrada por micrófono llega pronto.',
    'st.level': 'Nivel',
    'st.best': 'Mejor',
    'st.tap': '¡Toca!',
    'praise.amazing': '¡Increíble!',
    'praise.great': '¡Genial!',
    'praise.good': '¡Bien!',
    'praise.keep': '¡Sigue!',
    'praise.again': '¡Inténtalo otra vez! 🙈',
    'lang.toggle': 'EN',
  },
} as const

export type MessageKey = keyof typeof MESSAGES.en

/**
 * Pure locale resolution. A valid stored override ('en' | 'es') wins; otherwise
 * a navigator language starting with 'es' selects Spanish, and everything else
 * (including an unknown stored value or absent navigator) falls back to English.
 */
export function resolveLocale(navLang: string | undefined, stored: string | null): Locale {
  if (stored === Locale.En || stored === Locale.Es) return stored
  if (navLang?.toLowerCase().startsWith('es')) return Locale.Es
  return Locale.En
}

export function createI18n(initial: Locale): {
  locale: Locale
  t: (key: MessageKey) => string
  set: (l: Locale) => void
} {
  const api = {
    locale: initial,
    t(key: MessageKey): string {
      return MESSAGES[api.locale][key] ?? MESSAGES.en[key]
    },
    set(l: Locale): void {
      api.locale = l
    },
  }
  return api
}

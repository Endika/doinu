/**
 * Suggested fingering (1 = thumb … 5 = little finger) for the falling notes.
 *
 * Beginner piano material lives in a *five-finger position*: five neighbouring
 * white keys under the five fingers, C-D-E-F-G from the thumb. So most of the
 * time the finger is a property of the phrase's shape rather than of a single
 * note: pick the five-key window the phrase lives in and number it 1..5 from the
 * bottom. A black key borrows the finger of the white key immediately below it
 * (F# with the finger of F, Bb with the finger of A) — that is how these
 * positions are actually played.
 *
 * A phrase that does not fit one position keeps the position that covers the
 * most of its notes, and every note outside it stays unmarked: one hand
 * position cannot cover them, and where the hand shifts is a choice for the
 * teacher (or for authored data).
 *
 * Scales are the one exception, and only when the caller says the phrase is a
 * scale (`{ scale: true }`, used by ScaleMode): a stepwise line is then numbered
 * with the scale pattern, 1-2-3-1-2-3-4-5 for major and 1-2-3-4-1-2-3-4 when
 * the fourth degree is a black key (F major). A song or melody that only looks
 * stepwise is not fingered that way, because its pitches come in melody order.
 *
 * Left hand (`leftHandFingers`): a five-finger position is the mirror image of
 * the right hand (the thumb is the *highest* finger, so 1<->5, 2<->4), but a
 * scale has its own pattern: 5-4-3-2-1-3-2-1 going up.
 *
 * Everything here is a default. Authored data always wins: a mode that already
 * knows the finger for a note sets `Target.finger` itself.
 */

const WHITE_PITCH_CLASSES = new Set([0, 2, 4, 5, 7, 9, 11])

/** True for the white keys (C D E F G A B). */
export function isWhiteMidi(midi: number): boolean {
  return WHITE_PITCH_CLASSES.has(((midi % 12) + 12) % 12)
}

/** Five consecutive white keys starting at `low` (which must be a white key). */
function fiveWhiteKeys(low: number): number[] {
  const keys: number[] = []
  for (let m = low; keys.length < 5; m++) if (isWhiteMidi(m)) keys.push(m)
  return keys
}

/** Finger for `midi` inside a five-finger window, or undefined if it is outside. */
function windowFinger(
  keys: number[],
  midi: number,
  phrase: ReadonlySet<number>,
): number | undefined {
  if (isWhiteMidi(midi)) {
    const index = keys.indexOf(midi)
    return index < 0 ? undefined : index + 1
  }
  // A black key borrows a neighbouring white key: the one below it (F# with the
  // finger of F) unless only that white key is in the phrase — then the hand
  // has already spent that finger and the key above is the free one (Bb next to
  // A takes the finger of B). With both neighbours in the phrase it keeps the
  // one below, so it never shares the finger of the key above (E-D#-E: 5-4-5).
  const upperFirst = phrase.has(midi - 1) && !phrase.has(midi + 1)
  const order = upperFirst ? [midi + 1, midi - 1] : [midi - 1, midi + 1]
  for (const white of order) {
    const index = keys.indexOf(white)
    if (index >= 0) return index + 1
  }
  return undefined
}

/** True when every note has a finger inside that window. */
function fitsWindow(keys: number[], notes: number[], phrase: ReadonlySet<number>): boolean {
  return notes.every((n) => windowFinger(keys, n, phrase) !== undefined)
}

/** Right-hand fingering of one octave of a major scale, by degree 1..7. */
const MAJOR_FINGERS = [1, 2, 3, 1, 2, 3, 4]
/** With a flattened fourth (F major): the fourth degree takes the ring finger. */
const MAJOR_FINGERS_FLAT_FOURTH = [1, 2, 3, 4, 1, 2, 3, 4]

/** Finger for a diatonic degree (1 = the phrase's own lowest note). */
function scaleFinger(degree: number, flatFourth: boolean): number {
  if (degree < 1) return 1
  const pattern = flatFourth ? MAJOR_FINGERS_FLAT_FOURTH : MAJOR_FINGERS
  const octave = Math.floor((degree - 1) / 7)
  const step = (degree - 1) % 7
  if (octave === 0) return pattern[step]
  // The octave above the starting note is played with the little finger (or the
  // ring finger when the hand has shifted to a flat-fourth pattern).
  if (step === 0) return flatFourth ? 4 : 5
  return pattern[step]
}

/**
 * Left-hand finger for a diatonic degree (1 = the phrase's own lowest note):
 * 5-4-3-2-1-3-2-1 for the first octave, then 4-3-2-1-3-2-1 for each octave
 * after it (the thumb passes under on the way up).
 */
function leftScaleFinger(degree: number): number {
  if (degree <= 1) return 5
  return LEFT_SCALE_CYCLE[(degree - 2) % LEFT_SCALE_CYCLE.length]
}
const LEFT_SCALE_CYCLE = [4, 3, 2, 1, 3, 2, 1]

/** Sorted unique notes of a phrase. */
function uniqueSorted(notes: number[]): number[] {
  return Array.from(new Set(notes)).sort((a, b) => a - b)
}

/** True when the unique notes form a stepwise (scale-like) ladder. */
function isStepwise(unique: number[]): boolean {
  if (unique.length < 5) return false
  for (let i = 1; i < unique.length; i++) {
    const step = unique[i] - unique[i - 1]
    if (step < 1 || step > 2) return false
  }
  return true
}

/** Highest C at or below `midi`. */
function cAtOrBelow(midi: number): number {
  return midi - ((((midi - 60) % 12) + 12) % 12)
}

/** How a phrase was fingered: the hand shape decides how the left hand reads it. */
type Fingering =
  | { kind: 'position' | 'leaps'; fingers: (number | undefined)[] }
  | { kind: 'scale'; fingers: (number | undefined)[]; degrees: (number | undefined)[] }

/** Options for the fingering functions. */
export interface FingeringOptions {
  /** The phrase is a scale (ScaleMode): number a stepwise line with the scale pattern. */
  scale?: boolean
}

function fingerPhrase(notes: number[], options: FingeringOptions): Fingering {
  const pitched = notes.filter((n) => Number.isInteger(n) && n > 0)
  if (pitched.length === 0) return { kind: 'position', fingers: notes.map(() => undefined) }

  const lowest = Math.min(...pitched)
  let anchored = lowest
  while (!isWhiteMidi(anchored)) anchored--
  const phrase = new Set(pitched)

  // 1. A five-finger position. C position comes first because the whole beginner
  //    curriculum is built on it (a phrase sitting on E-F#-G is played with the
  //    same hand shape as C-D-E, not by re-anchoring the thumb on E).
  for (const keys of [fiveWhiteKeys(cAtOrBelow(lowest)), fiveWhiteKeys(anchored)]) {
    if (fitsWindow(keys, pitched, phrase)) {
      return { kind: 'position', fingers: notes.map((n) => windowFinger(keys, n, phrase)) }
    }
  }

  const unique = uniqueSorted(pitched)
  const whiteFourth = unique[3] === undefined ? true : isWhiteMidi(unique[3])

  // 2. A scale that leaves the position: number it with the scale pattern. Only
  //    for real scales; a melody's pitches are not played in scale order.
  if (options.scale && isStepwise(unique)) {
    const degree = new Map<number, number>()
    unique.forEach((midi, i) => degree.set(midi, i + 1))
    const degrees = notes.map((n) => degree.get(n))
    return {
      kind: 'scale',
      degrees,
      fingers: degrees.map((d) => (d === undefined ? undefined : scaleFinger(d, !whiteFourth))),
    }
  }

  // 3. Anything else (leaps, broken chords, melodies wider than five keys): keep
  //    the one five-finger position that covers the most notes and number it.
  //    Notes outside it need a hand shift that the shape alone does not decide,
  //    so they stay unmarked.
  const keys = bestWindow(pitched, phrase, cAtOrBelow(lowest), anchored)
  return { kind: 'leaps', fingers: notes.map((n) => windowFinger(keys, n, phrase)) }
}

/**
 * The five-finger window that gives a finger to the most notes of the phrase.
 * Ties go to a window whose thumb key is played, then to the C position, then
 * to the lowest window.
 */
function bestWindow(
  pitched: number[],
  phrase: ReadonlySet<number>,
  cPosition: number,
  anchored: number,
): number[] {
  const highest = Math.max(...pitched)
  const lows = [cPosition]
  for (let m = anchored; m <= highest; m++) if (isWhiteMidi(m) && m !== cPosition) lows.push(m)
  let best = fiveWhiteKeys(cPosition)
  let bestCount = -1
  for (const low of lows) {
    const keys = fiveWhiteKeys(low)
    // Two points per covered note, one more when the thumb sits on a played key.
    const covered = pitched.filter((n) => windowFinger(keys, n, phrase) !== undefined).length
    const count = covered * 2 + (phrase.has(keys[0]) ? 1 : 0)
    if (count > bestCount) {
      best = keys
      bestCount = count
    }
  }
  return best
}

/**
 * Suggested right-hand finger for every note in `notes` (same order, same
 * length). Returns undefined where the phrase gives no honest answer.
 */
export function autoFingers(
  notes: number[],
  options: FingeringOptions = {},
): (number | undefined)[] {
  return fingerPhrase(notes, options).fingers
}

/**
 * Suggested left-hand finger for every note in `notes` (same order, same
 * length). Five-finger positions and leaps are the mirror image of the right
 * hand; scales (`{ scale: true }`) use the left-hand scale pattern.
 */
export function leftHandFingers(
  notes: number[],
  options: FingeringOptions = {},
): (number | undefined)[] {
  const fingering = fingerPhrase(notes, options)
  if (fingering.kind === 'scale') {
    return fingering.degrees.map((d) => (d === undefined ? undefined : leftScaleFinger(d)))
  }
  return mirrorFingers(fingering.fingers)
}

/** The mirror image of a five-finger shape: the thumb is the highest finger. */
export function mirrorFingers(fingers: (number | undefined)[]): (number | undefined)[] {
  return fingers.map((f) => (f === undefined ? undefined : 6 - f))
}

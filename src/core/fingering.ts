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
 * Phrases that leave a single position (a one-octave scale, a tune that reaches
 * high Do, an arpeggio) are numbered like a scale instead: 1-2-3-1-2-3-4-5 for
 * major, and 1-2-3-4-1-2-3-4 when the fourth degree is a black key (F major).
 *
 * Left-hand fingering is the mirror image of the right hand: the thumb is the
 * *highest* finger, so `mirrorFingers` flips 1<->5, 2<->4.
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
  // finger of F) unless that white key is itself in the phrase — then the hand
  // has already spent that finger and the key above is the free one (Bb next to
  // A takes the finger of B).
  const order = phrase.has(midi - 1) ? [midi + 1, midi - 1] : [midi - 1, midi + 1]
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

/** Number of white keys in the inclusive span, i.e. the diatonic distance + 1. */
function whiteSpan(low: number, high: number): number {
  let n = 0
  for (let m = low; m <= high; m++) if (isWhiteMidi(m)) n++
  return n
}

/**
 * Suggested finger for every note in `notes` (same order, same length).
 * Returns undefined where the phrase gives no honest answer.
 */
export function autoFingers(notes: number[]): (number | undefined)[] {
  const pitched = notes.filter((n) => Number.isInteger(n) && n > 0)
  if (pitched.length === 0) return notes.map(() => undefined)

  const lowest = Math.min(...pitched)
  let anchored = lowest
  while (!isWhiteMidi(anchored)) anchored--
  const phrase = new Set(pitched)

  // 1. A five-finger position. C position comes first because the whole beginner
  //    curriculum is built on it (a phrase sitting on E-F#-G is played with the
  //    same hand shape as C-D-E, not by re-anchoring the thumb on E).
  for (const keys of [fiveWhiteKeys(cAtOrBelow(lowest)), fiveWhiteKeys(anchored)]) {
    if (fitsWindow(keys, pitched, phrase)) {
      return notes.map((n) => windowFinger(keys, n, phrase))
    }
  }

  const unique = uniqueSorted(pitched)
  const whiteFourth = unique[3] === undefined ? true : isWhiteMidi(unique[3])

  // 2. A line that leaves the position: number it like a scale.
  if (isStepwise(unique)) {
    const byNote = new Map<number, number>()
    unique.forEach((midi, i) => byNote.set(midi, scaleFinger(i + 1, !whiteFourth)))
    return notes.map((n) => byNote.get(n))
  }

  // 3. Leaps, broken chords and arpeggios: one finger per white key from the
  //    lowest note, and the little finger for anything above the fifth key.
  return notes.map((n) => {
    const white = isWhiteMidi(n) ? n : phrase.has(n - 1) ? n + 1 : n - 1
    return Math.min(Math.max(whiteSpan(anchored, white), 1), 5)
  })
}

/** Left-hand fingering is the mirror image: the thumb is the highest finger. */
export function mirrorFingers(fingers: (number | undefined)[]): (number | undefined)[] {
  return fingers.map((f) => (f === undefined ? undefined : 6 - f))
}

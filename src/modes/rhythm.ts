export interface RhythmScore {
  hits: number
  total: number
  accuracy: number
  meanDevMs: number
}

/**
 * Score a rhythm attempt: each beat is matched to the NEAREST unused tap within
 * `windowMs`. accuracy = hits / beats; meanDevMs = mean absolute timing error over
 * matched beats. Times are in the same clock (ms); order does not matter.
 */
export function scoreRhythm(beats: number[], taps: number[], windowMs: number): RhythmScore {
  const used = new Set<number>()
  let hits = 0
  let devSum = 0
  for (const b of beats) {
    let bestIdx = -1
    let bestDev = Number.POSITIVE_INFINITY
    for (let i = 0; i < taps.length; i++) {
      if (used.has(i)) continue
      const dev = Math.abs(taps[i] - b)
      if (dev <= windowMs && dev < bestDev) {
        bestDev = dev
        bestIdx = i
      }
    }
    if (bestIdx >= 0) {
      used.add(bestIdx)
      hits++
      devSum += bestDev
    }
  }
  const total = beats.length
  return {
    hits,
    total,
    accuracy: total === 0 ? 1 : hits / total,
    meanDevMs: hits === 0 ? 0 : devSum / hits,
  }
}

/** Beat times (ms) for `count` beats at `bpm`, starting at `startMs`. */
export function beatTimes(startMs: number, count: number, bpm: number): number[] {
  const beatMs = 60000 / bpm
  return Array.from({ length: count }, (_, i) => startMs + i * beatMs)
}

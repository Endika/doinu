import type { Session } from './metrics-store'
import type { Exercise } from '../content/curriculum'

export enum MasteryState { Locked = 'locked', InProgress = 'inProgress', Mastered = 'mastered' }
export const DEFAULT_FIND_THRESHOLD_MS = 2000
export const MASTERY_WINDOW = 3 // consecutive recent sessions required

export interface MasteryEntry {
  exerciseId: string
  state: MasteryState
}

// Pure: is THIS exercise mastered, from its own (chronological) sessions?
export function isMastered(
  sessions: Session[],
  passAccuracy: number,
  findThresholdMs = DEFAULT_FIND_THRESHOLD_MS,
): boolean {
  if (sessions.length < MASTERY_WINDOW) return false
  const recent = sessions.slice(-MASTERY_WINDOW)
  return recent.every((s) => s.accuracy >= passAccuracy && s.meanFindMs <= findThresholdMs)
}

// Build the full ordered map. `sessionsFor` supplies chronological sessions per id
// (so this is testable with a plain function, not the whole store).
export function buildMasteryMap(
  exercises: Exercise[],
  sessionsFor: (exerciseId: string) => Session[],
  findThresholdMs = DEFAULT_FIND_THRESHOLD_MS,
): MasteryEntry[] {
  let unlocked = true // the first exercise is always unlocked
  return exercises.map((exercise) => {
    if (!unlocked) {
      return { exerciseId: exercise.id, state: MasteryState.Locked }
    }
    if (isMastered(sessionsFor(exercise.id), exercise.passAccuracy, findThresholdMs)) {
      // next exercise stays unlocked
      return { exerciseId: exercise.id, state: MasteryState.Mastered }
    }
    // non-mastered unlocked exercise: gate everything after it
    unlocked = false
    return { exerciseId: exercise.id, state: MasteryState.InProgress }
  })
}

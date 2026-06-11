import type { Session } from './metrics-store'
import { isMastered } from './mastery'
import type { PathLesson } from '../content/path'

/**
 * Per-lesson state on the learning path:
 * - `soon`     — milestone > 1: visible roadmap, not built yet (never launchable).
 * - `locked`   — buildable but gated behind an earlier lesson not yet passed.
 * - `current`  — the first buildable, reachable, not-yet-passed lesson.
 * - `passed`   — cleared at least once (unlocks the next), not yet mastered.
 * - `mastered` — passed consistently (3 sessions) → earns the ⭐.
 */
export type PathLessonState = 'locked' | 'current' | 'passed' | 'mastered' | 'soon'

export interface PathLessonProgress {
  id: string
  state: PathLessonState
}

/** A lesson is "passed" once any recorded session met its accuracy bar. */
export function isPassed(sessions: Session[], passAccuracy: number): boolean {
  return sessions.some(s => s.accuracy >= passAccuracy)
}

/**
 * Build the path progress map. Gating is light: passing a lesson ONCE unlocks the
 * next (so the journey keeps moving), while ⭐ mastery (the existing 3-session
 * criterion) is a separate, optional badge. Lessons beyond this build's milestone
 * are always `soon` and never consume the reachable frontier.
 */
export function buildPathProgress(
  lessons: PathLesson[],
  sessionsFor: (lessonId: string) => Session[],
  findThresholdMs?: number,
): PathLessonProgress[] {
  let reachable = true // the first buildable lesson is reachable
  return lessons.map(lesson => {
    if (lesson.milestone > 1) {
      return { id: lesson.id, state: 'soon' }
    }
    if (!reachable) {
      return { id: lesson.id, state: 'locked' }
    }
    const sessions = sessionsFor(lesson.id)
    if (isMastered(sessions, lesson.passAccuracy, findThresholdMs)) {
      return { id: lesson.id, state: 'mastered' } // stays reachable
    }
    if (isPassed(sessions, lesson.passAccuracy)) {
      return { id: lesson.id, state: 'passed' } // stays reachable
    }
    // first reachable, not yet passed → current; everything after is locked
    reachable = false
    return { id: lesson.id, state: 'current' }
  })
}

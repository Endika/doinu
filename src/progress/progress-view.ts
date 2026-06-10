import type { Exercise } from '../content/curriculum'
import type { Session } from './metrics-store'
import type { MasteryState } from './mastery'

export interface ExerciseReport {
  exerciseId: string
  title: string
  state: MasteryState
  sessions: number // attempt count
  bestAccuracy: number // max accuracy over sessions, 0 if none
  latestAccuracy: number // most recent session accuracy, 0 if none
  bestTempoBpm: number // max tempoBpm over sessions, 0 if none
  firstFindMs: number // meanFindMs of the FIRST (oldest) session, 0 if none
  latestFindMs: number // meanFindMs of the LATEST session, 0 if none
}

// Pure. `sessionsFor(id)` returns chronological-asc sessions (as MetricsStore.sessionsFor does);
// `stateFor(id)` returns the mastery state (from buildMasteryMap). Build one row per exercise, in order.
export function buildProgressReport(
  exercises: Exercise[],
  sessionsFor: (id: string) => Session[],
  stateFor: (id: string) => MasteryState,
): ExerciseReport[] {
  return exercises.map((exercise) => {
    const sessions = sessionsFor(exercise.id)
    const first = sessions[0]
    const latest = sessions[sessions.length - 1]
    return {
      exerciseId: exercise.id,
      title: exercise.title,
      state: stateFor(exercise.id),
      sessions: sessions.length,
      bestAccuracy: sessions.reduce((max, s) => Math.max(max, s.accuracy), 0),
      latestAccuracy: latest ? latest.accuracy : 0,
      bestTempoBpm: sessions.reduce((max, s) => Math.max(max, s.tempoBpm), 0),
      firstFindMs: first ? first.meanFindMs : 0,
      latestFindMs: latest ? latest.meanFindMs : 0,
    }
  })
}

function pct(value: number): number {
  return Math.round(value * 100)
}

function formatRow(r: ExerciseReport): string {
  return (
    `${r.title}: ${r.state} · ${r.sessions} attempts · ` +
    `best ${pct(r.bestAccuracy)}%, latest ${pct(r.latestAccuracy)}% · ` +
    `find ${Math.round(r.firstFindMs)}→${Math.round(r.latestFindMs)} ms · ` +
    `${r.bestTempoBpm} bpm`
  )
}

// Thin DOM wrapper: render the report rows into a container element as readable text.
// Guard against a null element. (Not unit-tested; keep it minimal & dependency-free.)
export function renderProgressReport(el: HTMLElement | null, report: ExerciseReport[]): void {
  if (el === null) return
  el.textContent = ''
  for (const row of report) {
    const line = el.ownerDocument.createElement('div')
    line.textContent = formatRow(row)
    el.appendChild(line)
  }
}

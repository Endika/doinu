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

export type RowText = (key: string) => string

// Row text defaults to the original English tokens, so existing callers and
// tests keep byte-identical output unless a translator (the app's i18n) is passed.
const EN_TOKENS: Record<string, string> = {
  'state.locked': 'locked',
  'state.inProgress': 'inProgress',
  'state.passed': 'passed',
  'state.mastered': 'mastered',
  'progress.attempts': 'attempts',
  'progress.best': 'best',
  'progress.latest': 'latest',
  'progress.find': 'find',
  'progress.ms': 'ms',
  'progress.bpm': 'bpm',
}
const defaultText: RowText = (key) => EN_TOKENS[key] ?? key

function formatRow(r: ExerciseReport, t: RowText = defaultText): string {
  return (
    `${r.title}: ${t('state.' + r.state)} · ${r.sessions} ${t('progress.attempts')} · ` +
    `${t('progress.best')} ${pct(r.bestAccuracy)}%, ${t('progress.latest')} ${pct(r.latestAccuracy)}% · ` +
    `${t('progress.find')} ${Math.round(r.firstFindMs)}→${Math.round(r.latestFindMs)} ${t('progress.ms')} · ` +
    `${r.bestTempoBpm} ${t('progress.bpm')}`
  )
}

// Thin DOM wrapper: render the report rows into a container element as readable text.
// Guard against a null element. (Not unit-tested; keep it minimal & dependency-free.)
export function renderProgressReport(
  el: HTMLElement | null,
  report: ExerciseReport[],
  t: RowText = defaultText,
): void {
  if (el === null) return
  el.textContent = ''
  for (const row of report) {
    const line = el.ownerDocument.createElement('div')
    line.textContent = formatRow(row, t)
    el.appendChild(line)
  }
}

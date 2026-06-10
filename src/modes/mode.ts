import type { Chart } from '../engine/chart'
import type { Summary } from '../engine/scoring'

export interface Verdict {
  passed: boolean
  accuracy: number
}

export interface Mode {
  buildChart(): Chart
  evaluate(summary: Summary): Verdict
}

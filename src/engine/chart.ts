export enum Hand {
  Left = 'L',
  Right = 'R',
}
export interface Target {
  id: string
  midi: number
  startMs: number
  durMs: number
  hand: Hand
  /** Suggested finger for this note (1 = thumb … 5 = little finger). */
  finger?: number
}
export interface Chart {
  bpm: number
  targets: Target[]
}

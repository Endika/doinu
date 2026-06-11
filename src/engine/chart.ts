export enum Hand { Left = 'L', Right = 'R' }
export interface Target { id: string; midi: number; startMs: number; durMs: number; hand: Hand }
export interface Chart { bpm: number; targets: Target[] }

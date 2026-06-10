// 12 Boomwhacker hues, indexed by pitch class (0..11)
export const PITCH_COLORS: string[] = [
  '#e6194b', '#f58231', '#ffe119', '#bfef45', '#3cb44b', '#42d4f4',
  '#4363d8', '#911eb4', '#f032e6', '#a9a9a9', '#fabed4', '#469990',
]

export function colorForPitchClass(pc: number): string {
  return PITCH_COLORS[((pc % 12) + 12) % 12]
}

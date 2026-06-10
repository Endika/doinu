export interface Note {
  midi: number
  pitchClass: number
  octave: number
  colorClass: string
}

export function noteFromMidi(midi: number): Note {
  const pitchClass = ((midi % 12) + 12) % 12
  const octave = Math.floor(midi / 12) - 1
  return { midi, pitchClass, octave, colorClass: `pc-${pitchClass}` }
}

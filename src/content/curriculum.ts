// An Exercise is the authored data; MelodyMode turns it into a Chart.
export interface Exercise {
  id: string
  title: string // English title
  bpm: number
  notes: number[] // sequence of midi numbers, one beat apart, right hand
  passAccuracy: number // mastery threshold for THIS exercise (e.g. 0.9)
}

// Built-in beginner curriculum: short, right-hand, around middle C (60).
// Ordered by increasing difficulty.
export const CURRICULUM: Exercise[] = [
  {
    id: 'first-three',
    title: 'First Three Notes',
    bpm: 60,
    notes: [60, 62, 64], // C D E
    passAccuracy: 0.9,
  },
  {
    id: 'twinkle-1',
    title: 'Twinkle Twinkle (Opening)',
    bpm: 70,
    notes: [60, 60, 67, 67, 69, 69, 67], // C C G G A A G
    passAccuracy: 0.9,
  },
  {
    id: 'five-finger',
    title: 'Five Finger Scale',
    bpm: 80,
    notes: [60, 62, 64, 65, 67], // C D E F G
    passAccuracy: 0.9,
  },
]

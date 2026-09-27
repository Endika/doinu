# 🎹 Doinu

A bright, offline piano‑learning game for kids — plug in a **MIDI keyboard**, or use the
microphone, and learn by playing. Falling notes, color‑coded keys, and measured progress. No
account, no tracking, nothing leaves your device.

> _"Doinu" means **melody** in Basque._

**Live:** https://endika.github.io/doinu/

## What it does

Notes fall toward the keyboard; play the right key as each one lands. Every key has its own
color (the Boomwhacker method), so a 6‑year‑old can follow along before they can read music.

### Modes

- **🗺️ Path** — a step‑by‑step learning path of short lessons (single notes, reading a note on
  the staff, chords, both hands); passing a lesson unlocks the next.
- **🎵 Melody** — a guided curriculum that unlocks the next exercise only when you've
  mastered the last one.
- **🐢 Practice (wait)** — the score freezes at the hit line until you play the right note,
  so you can learn a piece at your own pace.
- **🎶 Songs** — a public‑domain song library (Twinkle, Ode to Joy, Jingle Bells…), playable
  with the right hand, left hand, or both.
- **📂 Load MIDI** — bring your own `.mid` file; the app splits it into right/left hands.
- **🎤 Make a melody** — record your own tune, name it, and practise it later.
- **🔁 Echo** — the app plays a phrase, you repeat it back.
- **🧠 Memory** — a growing Simon‑style sequence.
- **🔎 Find the note** / **👂 Listen & play** — keyboard geography and ear training.
- **🥁 Tap the beat** — rhythm practice to a metronome.
- **🪜 Scale up** / **🎢 Scale up & down** — the C major scale.
- **✨ Free play** — a no‑pressure sandbox.

### Progress

Each attempt records real metrics — accuracy, note‑find speed, tempo and timing — and a
**mastery map** (locked → in progress → mastered) with a hard criterion. The **Progress**
screen shows parents those numbers.

## Privacy

Everything stays on your device. No backend, no account, no analytics, no cookies. Practice
data lives in your browser's local storage. Microphone input is analysed on the device and is
never sent anywhere.

## Requirements

- A **MIDI keyboard** connected to the device, or a **microphone**. The microphone hears one
  note at a time, so chord and two‑hand lessons need MIDI.
- For MIDI, a browser with **Web MIDI** — Chrome/Edge on a laptop, or Chrome on Android. iOS
  Safari has no Web MIDI, so on an iPhone or iPad use the microphone.

## Tech

Vanilla **TypeScript** + Canvas, **Vite**, an offline **PWA** (vite‑plugin‑pwa), Web MIDI and
Web Audio. Tested with **vitest**.

## Develop

```bash
npm install
npm run dev        # local dev server
npm run lint       # eslint (src + tests)
npm run type:check # tsc --noEmit (src + tests)
npm run test:run   # vitest run
npm run build      # production build (dist/)
```

## License

MIT — see [LICENSE](LICENSE).

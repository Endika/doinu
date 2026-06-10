# 🎹 Doinu

A bright, offline piano‑learning game for kids — plug in a **MIDI keyboard** and learn by
playing. Falling notes, color‑coded keys, and honest, measured progress. No account, no
tracking, nothing leaves your device.

> _"Doinu" means **melody** in Basque._

**Live:** https://endika.github.io/doinu/

## What it does

Notes fall toward the keyboard; play the right key as each one lands. Every key has its own
color (the Boomwhacker method), so a 6‑year‑old can follow along before they can read music.

### Modes

- **🎵 Melody** — a guided curriculum that unlocks the next exercise only when you've truly
  mastered the last one.
- **🐢 Practice (wait)** — the score freezes at the hit line until you play the right note,
  so you can learn a piece at your own pace.
- **🎶 Songs** — a public‑domain song library (Twinkle, Ode to Joy, Jingle Bells…), playable
  with the right hand, left hand, or both.
- **📂 Load MIDI** — bring your own `.mid` file; the app splits it into right/left hands.
- **🔁 Echo** — the app plays a phrase, you repeat it back.
- **🧠 Memory** — a growing Simon‑style sequence.
- **🔎 Find the note** / **👂 Listen & play** — keyboard geography and ear training.
- **🥁 Tap the beat** — rhythm practice to a metronome.
- **✨ Free play** — a no‑pressure sandbox.

### Honest progress

Each attempt records real metrics — accuracy, note‑find speed, tempo and timing — and a
**mastery map** (locked → in progress → mastered) with a hard criterion. The **Progress**
screen shows parents genuine improvement, not invented bars.

## Privacy

Everything stays on your device. No backend, no account, no analytics, no cookies. Practice
data lives in your browser's local storage. (Microphone input for tablets without MIDI is on
the roadmap and will also run fully on‑device.)

## Requirements

- A **MIDI keyboard** connected to the device.
- A browser with **Web MIDI** — Chrome/Edge on a laptop, or Chrome on Android. _(Note: iOS
  Safari has no Web MIDI; tablet support via the microphone is planned.)_

## Tech

Vanilla **TypeScript** + Canvas, **Vite**, an offline **PWA** (vite‑plugin‑pwa), Web MIDI and
Web Audio. No framework, no backend. Tested with **vitest**.

## Develop

```bash
npm install
npm run dev        # local dev server
npm run lint       # eslint
npm run typecheck  # tsc --noEmit
npm test           # vitest
npm run build      # production build (dist/)
```

## License

MIT — see [LICENSE](LICENSE).

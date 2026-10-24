// Builds the MIDI edition of the Android app: copies the built PWA into
// assets/www, then injects a Web MIDI shim that the native shell talks to.
//
// The native side (MainActivity) opens class-compliant USB MIDI devices via
// MidiManager and pushes note events through window.__doinuMidiBatch /
// __doinuMidiDevice. The shim below implements just enough of the Web MIDI API
// (navigator.requestMIDIAccess -> { inputs, outputs }, inputs' onmidimessage
// firing MIDIMessageEvent with a Uint8Array .data) for Doinu's MidiInputAdapter
// to work unchanged.
//
// The service worker is dropped on purpose: every file ships inside the APK and
// a stale workbox cache across updates would only bite.
import { cpSync, readFileSync, writeFileSync, rmSync, readdirSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const DIST = join(HERE, '..', 'dist')
const WWW = join(HERE, 'app', 'src', 'main', 'assets', 'www')

if (!existsSync(join(DIST, 'index.html'))) {
  console.error(`No web build at ${DIST}. Run "npm run build" in the repo root first.`)
  process.exit(1)
}

rmSync(WWW, { recursive: true, force: true })
cpSync(DIST, WWW, { recursive: true })

for (const name of readdirSync(WWW)) {
  if (name === 'sw.js' || name === 'registerSW.js' || name.startsWith('workbox-')) {
    rmSync(join(WWW, name), { force: true })
  }
}

const indexPath = join(WWW, 'index.html')
let out = readFileSync(indexPath, 'utf8')
out = out.replace(/<script id="vite-plugin-pwa:register-sw"[^>]*><\/script>/, '')

// 1. The piano makes the sound for keys the child presses; the tablet must not
//    re-synthesise that input (double note). Demo/playback stays audible.
const muteFlag = '<script>window.__DOINU_MUTE_INPUT_SYNTH = true;</script>'

// 2. The Web MIDI shim + native bridge entry points.
const midiShim = `<script>
(function () {
  'use strict';
  var midiInput = {
    id: 'android-native-midi',
    name: 'MIDI Keyboard',
    manufacturer: 'Android',
    type: 'input',
    state: 'disconnected',
    onmidimessage: null
  };

  // WebView may or may not expose a (dead) native requestMIDIAccess; replace it
  // with the bridge-backed implementation either way.
  var installed = false;
  function requestAccess() {
    if (!installed) {
      Object.defineProperty(navigator, 'requestMIDIAccess', {
        configurable: true,
        writable: true,
        value: function () {
          return Promise.resolve({
            inputs: new Map([[midiInput.id, midiInput]]),
            outputs: new Map(),
            sysexEnabled: false,
            close: function () { return Promise.resolve(); },
            onstatechange: null
          });
        }
      });
      installed = true;
    }
  }
  requestAccess();

  var warning = null;
  function syncHint() {
    var el = document.getElementById('menu-status');
    if (!el) return;
    var lang = localStorage.getItem('doinu.lang') || navigator.language || 'en';
    var zh = /^zh/i.test(lang) || /^zh/i.test(navigator.language || '');
    var text = zh
      ? '未检测到 MIDI 键盘——请把琴的 USB TO HOST 用数据线接入平板'
      : 'No MIDI keyboard yet — connect the piano via USB TO HOST';
    if (midiInput.state === 'connected') {
      if (el.textContent === warning) { el.textContent = ''; }
      warning = null;
      return;
    }
    // Never stomp real messages ("Listening…", scores, etc.) — only fill an empty slot.
    if (el.textContent === '' || el.textContent === warning || el.textContent === text) {
      if (el.textContent !== text) { el.textContent = text; warning = text; }
    }
  }

  window.__doinuMidiDevice = function (connected, name) {
    console.log('[doinu-midi] device', connected, name || '');
    midiInput.state = connected ? 'connected' : 'disconnected';
    if (connected && name) { midiInput.name = name; }
    syncHint();
  };

  window.__doinuMidiBatch = function (events) {
    console.log('[doinu-midi] batch', events ? events.length : 0);
    if (!midiInput.onmidimessage || !events) return;
    var now = performance.now();
    for (var i = 0; i < events.length; i++) {
      var e = events[i];
      if (!e || typeof e.note !== 'number') continue;
      midiInput.onmidimessage({
        data: new Uint8Array([e.status & 0xFF, e.note & 0x7F, e.velocity & 0x7F]),
        timestamp: now
      });
    }
  };

  // Debug/testing handle: proves the app subscribed and lets tests inject notes.
  window.__doinuGetMidiInput = function () { return midiInput; };

  // Android demo rig: turn on app-side autoplay (plays pending notes itself).
  window.__doinuSetAutoplay = function (on) {
    window.__DOINU_AUTOPLAY = !!on;
    console.log('[doinu-midi] autoplay', window.__DOINU_AUTOPLAY);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', syncHint);
  } else {
    syncHint();
  }
})();
</script>`

out = out.replace('</head>', `  ${muteFlag}${midiShim}\n  </head>`)
writeFileSync(indexPath, out, 'utf8')

console.log('copied dist -> assets/www (MIDI build)')
console.log('title:', out.match(/<h1 class="menu-title">[^<]*<\/h1>/)?.[0])
console.log('mute flag:', out.includes('__DOINU_MUTE_INPUT_SYNTH'))
console.log('midi shim:', out.includes('android-native-midi'))
console.log('service worker removed:', !existsSync(join(WWW, 'sw.js')))

// Copies the built PWA into the Android assets folder.
//
// The app ships its own copy of dist/, so it needs no server and no network.
// The generated service worker is dropped on purpose: every file is already
// inside the APK, and a stale workbox cache after an app update is a real risk
// with no upside.
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
const html = readFileSync(indexPath, 'utf8')
let out = html.replace(/<script id="vite-plugin-pwa:register-sw"[^>]*><\/script>/, '')

// This package is the MICROPHONE build. Android WebView exposes
// navigator.requestMIDIAccess but cannot reach USB MIDI devices, and the app
// picks its input source from `'requestMIDIAccess' in navigator` — so hiding the
// API here is what makes it choose the microphone instead of a dead MIDI path.
const hideWebMidi =
  '<script>try{delete Navigator.prototype.requestMIDIAccess}catch(e){}try{delete navigator.requestMIDIAccess}catch(e){}</script>'
out = out.replace('</head>', `  ${hideWebMidi}\n  </head>`)
writeFileSync(indexPath, out, 'utf8')

// A sanity check: the emoji in the title must survive the copy byte-for-byte.
console.log('copied dist -> assets/www')
console.log('title:', out.match(/<h1 class="menu-title">[^<]*<\/h1>/)?.[0])
console.log('web midi hidden:', out.includes('requestMIDIAccess'))
console.log('service worker removed:', !existsSync(join(WWW, 'sw.js')))

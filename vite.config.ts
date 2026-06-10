/// <reference types="vitest/config" />
import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8')) as {
  version: string
}

export default defineConfig({
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Doinu',
        short_name: 'Doinu',
        description: 'Falling-notes piano learning app',
        theme_color: '#7c5cff',
        background_color: '#6d5dfc',
        display: 'standalone',
      },
    }),
  ],
  test: {
    environment: 'node',
  },
})

/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: './',
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Doinu',
        short_name: 'Doinu',
        description: 'Falling-notes piano learning app',
        theme_color: '#0a0a0f',
        background_color: '#0a0a0f',
        display: 'standalone',
      },
    }),
  ],
  test: {
    environment: 'node',
  },
})

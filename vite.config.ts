/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath, URL } from 'node:url'

/**
 * Artifact build only: keep the Latin font subsets (Spanish, Portuguese,
 * English…) and only the woff2 files, so every font can be inlined.
 */
function latinFontsOnly(): Plugin {
  return {
    name: 'goat-latin-fonts-only',
    enforce: 'pre',
    transform(code, id) {
      if (!/@fontsource.*\.css$/.test(id)) return null
      const kept = code
        .replace(/(?:\/\*[^*]*\*\/\s*)?@font-face\s*{[^}]*}/g, (block) => (/-latin(-ext)?-/.test(block) ? block : ''))
        .replace(/,\s*url\([^)]*\.woff\)\s*format\('woff'\)/g, '')
      return { code: kept, map: null }
    },
  }
}

export default defineConfig(({ mode }) => {
  // `vite build --mode artifact` produces one self-contained HTML file for a
  // claude.ai artifact (scripts/build-artifact.mjs inlines it): no service
  // worker, every script, style and font inlined.
  const artifact = mode === 'artifact'
  return {
    base: './',
    plugins: [
      artifact && latinFontsOnly(),
      react(),
      tailwindcss(),
      VitePWA({
        disable: artifact,
        registerType: 'autoUpdate',
        injectRegister: false,
        includeAssets: ['favicon.png', 'apple-touch-icon.png', 'icons/*.png'],
        manifest: {
          name: 'GOAT SOCIETY STUDIO',
          short_name: 'GOAT Studio',
          description: 'Estudio gráfico local para contenido de fútbol premium.',
          theme_color: '#08090B',
          background_color: '#08090B',
          display: 'standalone',
          orientation: 'any',
          start_url: './',
          scope: './',
          icons: [
            { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
            { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,woff2,woff,webmanifest}'],
          maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
          navigateFallback: 'index.html',
        },
      }),
    ],
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    server: { port: 5173, host: true },
    build: artifact
      ? {
          outDir: 'dist-artifact',
          assetsInlineLimit: () => true,
          cssCodeSplit: false,
          modulePreload: false,
          copyPublicDir: false,
          chunkSizeWarningLimit: 4000,
          rollupOptions: { output: { inlineDynamicImports: true } },
        }
      : {
          chunkSizeWarningLimit: 900,
          rollupOptions: {
            output: {
              manualChunks: (id) => {
                if (!id.includes('node_modules')) return undefined
                if (id.includes('three')) return 'three'
                if (id.includes('konva')) return 'konva'
                if (id.includes('react-dom') || id.includes('/react/') || id.includes('scheduler')) return 'react'
                if (id.includes('@fontsource')) return undefined
                // Loaded only when the browser refuses IndexedDB: keep it out of the eager vendor chunk.
                if (id.includes('fake-indexeddb')) return undefined
                return 'vendor'
              },
            },
          },
        },
    test: {
      environment: 'jsdom',
      include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
      setupFiles: ['src/test/setup.ts'],
    },
  }
})

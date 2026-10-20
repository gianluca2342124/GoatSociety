import { StrictMode, lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import './fonts/fonts'
import './index.css'
import { App } from './App'
import { useEditor } from './store/editor'
import { useUI } from './store/ui'
import { useLibrary } from './store/library'

// Handle for automated end-to-end tests and power users (read the editor state from DevTools).
;(window as unknown as { __goat: unknown }).__goat = { editor: useEditor, ui: useUI, library: useLibrary }

const TemplateGallery = lazy(() => import('./debug/TemplateGallery').then((m) => ({ default: m.TemplateGallery })))

const debug = new URLSearchParams(location.search).get('debug')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {debug === 'templates' ? (
      <Suspense fallback={null}>
        <TemplateGallery />
      </Suspense>
    ) : (
      <App />
    )}
  </StrictMode>,
)

if ('serviceWorker' in navigator && import.meta.env.PROD && !debug) {
  import('virtual:pwa-register').then(({ registerSW }) => registerSW({ immediate: true })).catch(() => undefined)
}

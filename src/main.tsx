import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import AuthProvider from './components/AuthProvider.tsx'
import ConfigErrorPage from './components/ConfigErrorPage.tsx'
import { getSupabaseConfig } from './lib/env'
import './index.css'

const config = getSupabaseConfig()

// Register service worker for PWA + Web Push
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('SW registration failed:', err)
    })
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {config.ok ? (
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    ) : (
      <ConfigErrorPage issues={config.issues} />
    )}
  </StrictMode>,
)

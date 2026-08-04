import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import AuthProvider from './components/AuthProvider.tsx'
import ConfigErrorPage from './components/ConfigErrorPage.tsx'
import { getSupabaseConfig } from './lib/env.ts'
import './index.css'

// Register service worker for PWA + Web Push
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('SW registration failed:', err)
    })
  })
}

const config = getSupabaseConfig()
const root = createRoot(document.getElementById('root')!)

if (!config.ok) {
  root.render(
    <StrictMode>
      <ConfigErrorPage issues={config.issues} />
    </StrictMode>,
  )
} else {
  root.render(
    <StrictMode>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </StrictMode>,
  )
}

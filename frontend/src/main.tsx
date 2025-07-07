import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './contexts/AuthContext'
import { TimezoneProvider } from './contexts/TimezoneContext'
import ErrorBoundary from './components/ErrorBoundary'
import App from './App.tsx'
import './index.css'
import { registerSW } from 'virtual:pwa-register'

// Register PWA service worker
const updateSW = registerSW({
  onNeedRefresh() {
    // Show a prompt to the user or automatically reload
    if (confirm('New content available. Reload?')) {
      updateSW(true)
    }
  },
  onOfflineReady() {
    console.log('App ready to work offline')
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <TimezoneProvider>
            <App />
            <Toaster position="top-right" />
          </TimezoneProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>,
)
 
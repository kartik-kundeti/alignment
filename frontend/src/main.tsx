import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'

import { TooltipProvider } from '@/components/ui/tooltip'
import App from './App.tsx'
import './index.css'

// If a page's code file is missing because the site was rebuilt while this tab was open,
// reload once to pick up the new files instead of showing a blank page.
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault()
  try {
    if (sessionStorage.getItem('reloaded-for-update')) return
    sessionStorage.setItem('reloaded-for-update', '1')
  } catch { /* storage blocked: reload anyway */ }
  window.location.reload()
})
window.addEventListener('load', () => {
  setTimeout(() => { try { sessionStorage.removeItem('reloaded-for-update') } catch { /* ignore */ } }, 5000)
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <TooltipProvider>
        <App />
      </TooltipProvider>
    </BrowserRouter>
  </StrictMode>,
)

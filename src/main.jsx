import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import App from './App'
import { FarmProvider } from './state/FarmContext'
import { MonitoringProvider } from './state/MonitoringContext'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <FarmProvider>
        <MonitoringProvider>
          <App />
        </MonitoringProvider>
      </FarmProvider>
    </BrowserRouter>
  </StrictMode>,
)

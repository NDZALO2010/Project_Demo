import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import App from './App'
import { AuthProvider } from './state/AuthContext'
import { FarmProvider } from './state/FarmContext'
import { MonitoringProvider } from './state/MonitoringContext'
import { PriceProvider } from './state/PriceContext'
import { LanguageProvider } from './state/LanguageContext'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <LanguageProvider>
      <BrowserRouter>
        <AuthProvider>
          <PriceProvider>
            <FarmProvider>
              <MonitoringProvider>
                <App />
              </MonitoringProvider>
            </FarmProvider>
          </PriceProvider>
        </AuthProvider>
      </BrowserRouter>
    </LanguageProvider>
  </StrictMode>,
)

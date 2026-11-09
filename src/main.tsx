import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { brand } from './brand'
import { seedOnFirstVisit } from './db/timelines'
import { applyTheme, siteTheme } from './themes'

document.title = brand.name
void seedOnFirstVisit()
applyTheme(siteTheme())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

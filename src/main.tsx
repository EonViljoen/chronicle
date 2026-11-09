import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { brand } from './brand'
import { seedOnFirstVisit } from './db/timelines'
import { applyTheme } from './themes'

document.title = brand.name
void seedOnFirstVisit()
applyTheme(brand.defaultTheme)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

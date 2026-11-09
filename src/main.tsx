import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { brand, loadSiteConfig } from './brand'
import { seedOnFirstVisit } from './db/timelines'
import { applyTheme, siteTheme } from './themes'

// An exported website reads its site.json first, since it changes the name,
// theme and routing. Everything else starts once that's done.
void loadSiteConfig().then(() => {
  document.title = brand.name
  void seedOnFirstVisit()
  applyTheme(siteTheme())

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})

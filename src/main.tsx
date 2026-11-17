import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { brand, loadSiteConfig } from './brand'
import { seedOnFirstVisit } from './db/timelines'
import { applyTheme, siteTheme } from './themes'
import { startAccounts } from './cloud/account'
import { setSyncUser } from './cloud/sync'

// An exported website reads its site.json first, since it changes the name,
// theme and routing. Everything else starts once that's done.
void loadSiteConfig().then(() => {
  document.title = brand.name
  void seedOnFirstVisit()
  applyTheme(siteTheme())
  // Optional accounts: restores the session and starts cloud saving (does nothing without Supabase keys)
  void startAccounts(setSyncUser)

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})

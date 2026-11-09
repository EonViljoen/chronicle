import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Relative asset paths, so an exported website works from any folder.
  // Chronicle's own index.html has <base href="/"> to keep deep links working.
  base: './',
  build: {
    // A list of every built file, read by "Export website" to copy the app
    manifest: 'chronicle-manifest.json',
  },
})

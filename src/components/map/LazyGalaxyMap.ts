import { lazy } from 'react';

/**
 * `lazy` + dynamic import() = code splitting. Vite puts GalaxyMap and
 * three.js in a separate file that only downloads the first time a map
 * renders. Wrap it in <Suspense fallback={...}> to show something while
 * it loads. PlanetMap shares the three.js bundle.
 */
export const GalaxyMap = lazy(() => import('./GalaxyMap'));
export const PlanetMap = lazy(() => import('./PlanetMap'));

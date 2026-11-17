import { useState } from 'react';
import { createBrowserRouter, createHashRouter, RouterProvider } from 'react-router-dom';
import { brand } from './brand';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import TimelinesPage from './pages/TimelinesPage';
import ViewerPage from './pages/ViewerPage';
import EditorPage from './pages/EditorPage';
import MapPage from './pages/MapPage';
import CharactersPage from './pages/CharactersPage';
import CharacterPage from './pages/CharacterPage';
import PlacePage from './pages/PlacePage';
import FactionPage from './pages/FactionPage';
import LoreIndexPage from './pages/LoreIndexPage';
import LorePage from './pages/LorePage';
import RelationsPage from './pages/RelationsPage';
import RegionPage from './pages/RegionPage';
import AccountPage from './pages/AccountPage';

/*
 * Routes. `Layout` wraps every page (header etc.) and renders the matched
 * child page wherever it puts <Outlet />. `:id` becomes a URL parameter the
 * page reads with useParams().
 */
const routes = [
  {
    element: <Layout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/timelines', element: <TimelinesPage /> },
      { path: '/account', element: <AccountPage /> },
      { path: '/t/:id', element: <ViewerPage /> },
      { path: '/t/:id/edit', element: <EditorPage /> },
      { path: '/t/:id/map', element: <MapPage /> },
      { path: '/t/:id/characters', element: <CharactersPage /> },
      { path: '/t/:id/characters/:itemId', element: <CharacterPage /> },
      { path: '/t/:id/places/:itemId', element: <PlacePage /> },
      { path: '/t/:id/factions/:itemId', element: <FactionPage /> },
      { path: '/t/:id/regions/:itemId', element: <RegionPage /> },
      { path: '/t/:id/relations', element: <RelationsPage /> },
      { path: '/t/:id/lore', element: <LoreIndexPage /> },
      { path: '/t/:id/lore/:itemId', element: <LorePage /> },
    ],
  },
];

export default function App() {
  // Exported websites use #/ links (site.com/#/t/x): they work on any static
  // host without server rules. Chronicle itself uses normal paths.
  // useState with an initialiser creates the router once, on first render.
  const [router] = useState(() => (brand.isSite ? createHashRouter(routes) : createBrowserRouter(routes)));
  return <RouterProvider router={router} />;
}

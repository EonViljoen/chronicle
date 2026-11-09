import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import ViewerPage from './pages/ViewerPage';
import EditorPage from './pages/EditorPage';

/*
 * Routes. `Layout` wraps every page (header etc.) and renders the matched
 * child page wherever it puts <Outlet />. `:id` becomes a URL parameter the
 * page reads with useParams().
 */
const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/t/:id', element: <ViewerPage /> },
      { path: '/t/:id/edit', element: <EditorPage /> },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}

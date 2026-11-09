import { Link, Outlet } from 'react-router-dom';
import { brand } from '../brand';

export default function Layout() {
  return (
    <div className="app">
      <header className="app-header">
        <Link to="/" className="brand">
          <span className="brand-mark" aria-hidden="true">{brand.mark}</span> {brand.name}
        </Link>
        <span className="brand-sub">{brand.tagline}</span>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
      {brand.footer && <footer className="app-footer">{brand.footer}</footer>}
    </div>
  );
}

import { Link, Outlet } from 'react-router-dom';

export default function Layout() {
  return (
    <div className="app">
      <header className="app-header">
        <Link to="/" className="brand">
          <span className="brand-mark" aria-hidden="true">◆</span> Chronicle
        </Link>
        <span className="brand-sub">timeline builder</span>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}

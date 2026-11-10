import { useEffect } from 'react';
import { Link, Outlet, useMatch } from 'react-router-dom';
import { brand } from '../brand';
import { useTimeline } from '../db/timelines';

export default function Layout() {
  const match = useMatch('/t/:id/*');
  const entry = useTimeline(match?.params?.id);
  const name = entry?.timeline?.title || brand.name;
  // useMatch matches the whole path by default, so this is only the home page
  const isHome = useMatch('/') !== null;
  // The landing page has its own big title, so it goes without the header.
  // (A read-only site's "/" is its list of timelines, which keeps it.)
  const isLanding = isHome && !brand.readOnly && !brand.isSite;
  // Where "back" goes: a timeline's pages go to the list, the list to the home page.
  // A read-only site's front page already is the list, so it has no home link.
  const back = match
    ? { to: '/timelines', label: 'Back to Timelines' }
    : !isHome && !brand.readOnly && !brand.isSite
      ? { to: '/', label: 'Home' }
      : null;

  useEffect(() =>{
    document.title = name;
  }, [name]);

  return (
    <div className="app">
      {!isLanding && (
        <header className="app-header">
          {back && (
            <Link to={back.to} className="header-back">
              <span aria-hidden="true">←</span> {back.label}
            </Link>
          )}
          <div className="brand-row">
            <span className="brand">
              <span className="brand-mark" aria-hidden="true">{brand.mark}</span> {name}
            </span>
            {isHome && <span className="brand-sub">{brand.tagline}</span>}
          </div>
        </header>
      )}
      <main className="app-main">
        <Outlet />
      </main>
      {brand.footer && <footer className="app-footer">{brand.footer}</footer>}
    </div>
  );
}

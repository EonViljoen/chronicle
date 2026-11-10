import { useState } from 'react';
import { Link } from 'react-router-dom';
import { brand } from '../brand';
import { useTimelines } from '../db/timelines';
import TimelineCard from '../components/TimelineCard';
import CreateTimelineForm from '../components/CreateTimelineForm';
import TimelinesPage from './TimelinesPage';

/** What Chronicle does, in four short points. */
const FEATURES = [
  { title: 'Your own calendar', text: 'Plain years, named ages, repeating cycles, or free-form dates.' },
  { title: 'Eras and factions', text: 'Colour-banded eras, and factions nested as deep as you need, each with its own theme.' },
  { title: 'Maps', text: 'Pin places on your own map image or a 3D starmap, and see events by where they happened.' },
  { title: 'Themes and websites', text: 'Restyle a timeline in a click, then export it as a website anyone can browse.' },
];

/*
 * / : the landing page. What Chronicle is, a quick way to start, and your
 * three most recent timelines. The full list and dashboard are at /timelines.
 */
export default function HomePage() {
  // An exported or read-only site has no use for an intro to Chronicle:
  // its front page is the list of what it publishes, as before.
  if (brand.readOnly || brand.isSite) return <TimelinesPage />;
  return <Landing />;
}

// A separate component so its hooks don't sit below the early return above
function Landing() {
  const timelines = useTimelines();
  const [error, setError] = useState<string | null>(null);
  const recent = timelines?.slice(0, 3) ?? []; // already newest-edited first

  return (
    <div className="landing">
      <section className="landing-hero">
        <h1>{brand.name}</h1>
        <p className="landing-lead">
          Build the history of your world: events, eras, factions and places on one timeline, for any setting you like.
        </p>
        <CreateTimelineForm onError={setError} />
        <div className="landing-actions">
          <Link className="btn" to="/timelines">Open my timelines</Link>
          {brand.demoUrl && (
            <a className="btn" href={brand.demoUrl} target="_blank" rel="noreferrer">
              View demo ↗
            </a>
          )}
        </div>
        {error && <p className="error" role="alert">{error}</p>}
      </section>

      <ul className="landing-features">
        {FEATURES.map((f) => (
          <li key={f.title}>
            <h2>{f.title}</h2>
            <p>{f.text}</p>
          </li>
        ))}
      </ul>

      {recent.length > 0 && (
        <section className="home-section">
          <div className="landing-recent-head">
            <h2 className="home-section-title">Recent timelines</h2>
            <Link to="/timelines">See all →</Link>
          </div>
          <div className="card-grid">
            {recent.map((t) => (
              <TimelineCard key={t.id} timeline={t} onError={setError} />
            ))}
          </div>
        </section>
      )}

      <p className="landing-note muted">
        No account needed: everything is saved in this browser. Export a file to back it up or move it.
      </p>
    </div>
  );
}

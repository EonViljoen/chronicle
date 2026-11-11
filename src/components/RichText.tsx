import Markdown, { defaultUrlTransform, type Components } from 'react-markdown';
import { Link } from 'react-router-dom';
import type { Timeline } from '../types/timeline';
import { linkHref, linkify, parseLinkHref } from '../lib/links';

interface Props {
  text: string;
  timeline: Timeline;
  /**
   * Set where events are selected in place (the viewer): an event link then
   * selects it instead of navigating, since the viewer owns its selection.
   */
  onEventLink?: (id: string) => void;
}

/** Keeps our `link:` addresses; everything else gets react-markdown's usual safety check. */
const urlTransform = (url: string) => (url.startsWith('link:') ? url : defaultUrlTransform(url));

/**
 * Markdown with [[links]] (see lib/links.ts). The links are turned into
 * Markdown links first, then this component's `a` renderer turns them into
 * router links, so they open without reloading the page.
 */
export default function RichText({ text, timeline, onEventLink }: Props) {
  const components: Components = {
    a: ({ href = '', children }) => {
      const link = parseLinkHref(href);
      // An ordinary web link
      if (!link) return <a href={href} target="_blank" rel="noreferrer">{children}</a>;
      if (link.kind === 'missing') {
        return <span className="wiki-link is-broken" title={`Nothing is called "${link.id}"`}>{children}</span>;
      }
      if (link.kind === 'event' && onEventLink) {
        return <button type="button" className="wiki-link link-btn" onClick={() => onEventLink(link.id)}>{children}</button>;
      }
      return <Link className={`wiki-link is-${link.kind}`} to={linkHref(timeline.id, { kind: link.kind, id: link.id, name: '' })}>{children}</Link>;
    },
  };
  return (
    <Markdown urlTransform={urlTransform} components={components}>
      {linkify(text, timeline)}
    </Markdown>
  );
}


import Markdown, { defaultUrlTransform, type Components } from 'react-markdown';
import { Link } from 'react-router-dom';
import type { Timeline } from '../types/timeline';
import { linkHref, linkify, parseLinkHref } from '../lib/links';
import { citify, parseCiteHref, showSource } from '../lib/citations';

interface Props {
  text: string;
  timeline: Timeline;
  /**
   * Set where events are selected in place (the viewer): an event link then
   * selects it instead of navigating, since the viewer owns its selection.
   */
  onEventLink?: (id: string) => void;
  /**
   * Turns on [^1] citations: `prefix` is the id the sources list gives each
   * source (`${prefix}-1`…), see <SourceList>; `count` is how many there are.
   */
  citations?: { prefix: string; count: number };
}

/** Keeps our `link:` and `cite:` addresses; everything else gets react-markdown's usual safety check. */
const urlTransform = (url: string) => (url.startsWith('link:') || url.startsWith('cite:') ? url : defaultUrlTransform(url));

/**
 * Markdown with [[links]] (see lib/links.ts) and [^1] citations (see
 * lib/citations.ts). Both are turned into Markdown links first, then this
 * component's `a` renderer turns them into router links and raised numbers,
 * so they work without reloading the page.
 */
export default function RichText({ text, timeline, onEventLink, citations }: Props) {
  const components: Components = {
    a: ({ href = '', children }) => {
      const cite = parseCiteHref(href);
      if (cite !== null) {
        if (!citations || cite < 1 || cite > citations.count) {
          return <sup className="cite is-broken" title={`There's no source ${cite}`}>{cite}</sup>;
        }
        return (
          <sup className="cite">
            <button type="button" className="link-btn" aria-label={`Source ${cite}`} onClick={() => showSource(`${citations.prefix}-${cite}`)}>{cite}</button>
          </sup>
        );
      }
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
      {citify(linkify(text, timeline))}
    </Markdown>
  );
}

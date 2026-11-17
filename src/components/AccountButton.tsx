import { Link } from 'react-router-dom';
import { useAccount } from '../cloud/account';
import { answerOffer, statusText, useSync, type SyncState } from '../cloud/sync';

/*
 * Accounts in the page frame: the header's account button, and the
 * first-sign-in question. Both show nothing when accounts are off.
 */

/** "Sign in", or the signed-in person's initial with a sync-status dot. Links to /account. */
export default function AccountButton() {
  const account = useAccount();
  const sync = useSync();
  if (!account.enabled || account.loading) return null;
  if (!account.user) return <Link className="btn account-button" to="/account">Sign in</Link>;
  const email = account.user.email ?? '';
  return (
    <Link className="btn account-button" to="/account" title={`${email} · ${statusText(sync.status, sync.lastSynced)}`}>
      <span className="account-initial" aria-hidden="true">{(email[0] ?? '?').toUpperCase()}</span>
      <SyncDot status={sync.status} />
      <span className="sr-only">Your account: {statusText(sync.status, sync.lastSynced)}</span>
    </Link>
  );
}

export function SyncDot({ status }: { status: SyncState['status'] }) {
  return <span className={`sync-dot is-${status}`} aria-hidden="true" />;
}

/** The first-sign-in question: upload what's already in this browser? */
export function OfferCard({ count }: { count: number }) {
  return (
    <div className="offer-card" role="region" aria-label="Timelines in this browser">
      <p>
        <strong>
          {count} timeline{count === 1 ? ' is' : 's are'} saved in this browser but not in your account.
        </strong>{' '}
        Upload {count === 1 ? 'it' : 'them'}, so {count === 1 ? 'it follows' : 'they follow'} you to other devices?
      </p>
      <div className="inline-inputs wrap">
        <button type="button" className="btn btn-primary" onClick={() => void answerOffer(true)}>Upload {count === 1 ? 'it' : 'them'}</button>
        <button type="button" className="btn" onClick={() => void answerOffer(false)}>Keep in this browser only</button>
      </div>
    </div>
  );
}

/** The question as a banner at the top of every page, until it's answered. */
export function OfferBanner() {
  const sync = useSync();
  return sync.offer ? <div className="offer-banner"><OfferCard count={sync.offer.count} /></div> : null;
}

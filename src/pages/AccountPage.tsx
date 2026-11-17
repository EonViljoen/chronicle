import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import {
  PROVIDERS,
  providerName,
  sendSignInLink,
  signInWithPassword,
  signInWithProvider,
  signOut,
  signUp,
  useAccount,
} from '../cloud/account';
import { forgetAccountData, statusText, syncNow, uploadLocal, useSync } from '../cloud/sync';
import { OfferCard, SyncDot } from '../components/AccountButton';

/**
 * /account: sign in (or create an account), and once signed in, how cloud
 * saving is going. Only reachable when accounts are on (see cloud/account.ts).
 */
export default function AccountPage() {
  const account = useAccount();

  if (!account.enabled) {
    return (
      <div className="page account-page">
        <h1>Accounts</h1>
        <p className="muted">This copy of the app saves in your browser only; it has no accounts.</p>
        <Link className="btn" to="/timelines">Your timelines</Link>
      </div>
    );
  }
  if (account.loading) return <p className="page muted">Loading…</p>;
  return <div className="page account-page">{account.user ? <SignedIn email={account.user.email ?? ''} userId={account.user.id} /> : <SignInForm />}</div>;
}

function SignInForm() {
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ error: boolean; text: string } | null>(null);

  async function run(action: () => Promise<string | void>) {
    setBusy(true);
    setMessage(null);
    try {
      const text = await action();
      if (text) setMessage({ error: false, text });
    } catch (e) {
      const text = e instanceof Error ? e.message : String(e);
      // The browser's own words for "no connection" aren't much help
      setMessage({ error: true, text: /fetch|network/i.test(text) ? "Couldn't reach the sign-in service. Check your connection and try again." : text });
    } finally {
      setBusy(false);
    }
  }

  const submit = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => {
      if (mode === 'in') return signInWithPassword(email.trim(), password);
      const confirm = await signUp(email.trim(), password);
      return confirm ? `Almost there: open the link we've emailed to ${email.trim()} to finish.` : undefined;
    });
  };

  return (
    <>
      <h1>{mode === 'in' ? 'Sign in' : 'Create an account'}</h1>
      <p className="muted">
        Signing in saves your timelines and themes to your account, so they follow you to other devices. You don't need an account: without
        one, everything is saved in this browser.
      </p>

      {PROVIDERS.length > 0 && (
        <div className="account-providers">
          {PROVIDERS.map((p) => (
            <button key={p} type="button" className="btn" disabled={busy} onClick={() => void run(() => signInWithProvider(p))}>
              Continue with {providerName(p)}
            </button>
          ))}
          <p className="account-or muted">or with your email</p>
        </div>
      )}

      <form className="form account-form" onSubmit={submit}>
        <label className="field">
          <span className="field-label">Email</span>
          <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="field">
          <span className="field-label">Password</span>
          <input
            type="password"
            autoComplete={mode === 'in' ? 'current-password' : 'new-password'}
            required
            minLength={mode === 'up' ? 8 : undefined}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {mode === 'up' && <span className="field-hint">At least 8 characters.</span>}
        </label>
        <div className="inline-inputs wrap">
          <button type="submit" className="btn btn-primary" disabled={busy}>{mode === 'in' ? 'Sign in' : 'Create account'}</button>
          {mode === 'in' && (
            <button
              type="button"
              className="btn"
              disabled={busy || !email.trim()}
              title="We'll email you a link that signs you in, no password needed"
              onClick={() => void run(async () => (await sendSignInLink(email.trim()), `Check ${email.trim()}: the link in it signs you in.`))}
            >
              Email me a sign-in link
            </button>
          )}
        </div>
        {message && <p className={message.error ? 'error' : 'field-hint'} role={message.error ? 'alert' : 'status'}>{message.text}</p>}
      </form>

      <p className="muted">
        {mode === 'in' ? 'New here? ' : 'Already have an account? '}
        <button type="button" className="link-btn" onClick={() => (setMode(mode === 'in' ? 'up' : 'in'), setMessage(null))}>
          {mode === 'in' ? 'Create an account' : 'Sign in'}
        </button>
      </p>
    </>
  );
}

function SignedIn({ email, userId }: { email: string; userId: string }) {
  const sync = useSync();
  const [forget, setForget] = useState(false);
  const [busy, setBusy] = useState(false);
  const localOnly = useLiveQuery(async () => (await db.timelines.bulkGet(sync.localOnly)).filter((t) => t !== undefined), [sync.localOnly.join(',')]);

  async function leave() {
    setBusy(true);
    try {
      await signOut();
      if (forget) await forgetAccountData(userId);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <h1>Your account</h1>
      <p>
        Signed in as <strong>{email}</strong>.
      </p>

      {sync.offer && <OfferCard count={sync.offer.count} />}

      <section className="account-section">
        <h2 className="history-heading">Cloud saving</h2>
        <p className={sync.status === 'error' ? 'error' : undefined} role="status">
          <SyncDot status={sync.status} /> {statusText(sync.status, sync.lastSynced)}
        </p>
        {sync.error && sync.status === 'error' && <p className="field-hint">{sync.error}</p>}
        <p className="muted">
          Your timelines are saved in this browser as you work, and uploaded to your account in the background. On another device, sign in and
          they appear. If the same timeline is changed on two devices, the one saved last is kept.
        </p>
        <button type="button" className="btn" onClick={() => void syncNow()} disabled={sync.status === 'syncing'}>Sync now</button>
      </section>

      {!sync.offer && localOnly && localOnly.length > 0 && (
        <section className="account-section">
          <h2 className="history-heading">Only in this browser</h2>
          <p className="muted">These stay out of your account until you upload them.</p>
          <ul className="rows">
            {localOnly.map((t) => (
              <li key={t.id} className="row">
                <span className="row-main">{t.title}</span>
                <button type="button" className="btn" onClick={() => uploadLocal(t.id)}>Upload</button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="account-section">
        <h2 className="history-heading">Sign out</h2>
        <label className="check">
          <input type="checkbox" checked={forget} onChange={(e) => setForget(e.target.checked)} /> Also remove this account's timelines from this
          browser (on a shared computer). They stay in your account.
        </label>
        <div>
          <button type="button" className="btn" disabled={busy} onClick={() => void leave()}>Sign out</button>
        </div>
      </section>
    </>
  );
}


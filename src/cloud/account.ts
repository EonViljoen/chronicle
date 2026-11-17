import { useSyncExternalStore } from 'react';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { brand } from '../brand';

/*
 * Accounts (optional): sign-in and cloud saving through Supabase.
 *
 * Only on when the build has both keys:
 *
 *   VITE_SUPABASE_URL=https://xyz.supabase.co
 *   VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_…   (Settings → API Keys)
 *   VITE_SUPABASE_PROVIDERS=google,github   (optional: sign-in buttons for these)
 *
 * (VITE_SUPABASE_ANON_KEY, the older name, still works, as does an old "anon"
 * key in either.) Never the secret key: it gets past every rule.
 *
 * The publishable key is public by design: the database's row-level security (see
 * supabase/schema.sql) is what keeps each person's data their own. Without
 * the keys, and on exported websites and read-only sites, none of this
 * loads and the app saves only in the browser, as it always has.
 *
 * The Supabase library is imported on demand, so builds without accounts
 * never download it.
 */

const env = import.meta.env;
const read = (name: string) => ((env[name] as string | undefined)?.trim() || undefined);
const URL_ = read('VITE_SUPABASE_URL');
const KEY = read('VITE_SUPABASE_PUBLISHABLE_KEY') ?? read('VITE_SUPABASE_ANON_KEY');

/** Sign-in providers to offer buttons for, besides email. Each must be turned on in the Supabase project. */
export const PROVIDERS = (read('VITE_SUPABASE_PROVIDERS') ?? '')
  .split(',')
  .map((p) => p.trim().toLowerCase())
  .filter(Boolean) as ('google' | 'github' | 'gitlab' | 'discord' | 'apple' | 'azure')[];

/** Are accounts available in this copy of the app? (Read after loadSiteConfig.) */
export const accountsEnabled = () => !!URL_ && !!KEY && !brand.isSite && !brand.readOnly;

// ---------- A tiny store the UI subscribes to ----------

export interface AccountState {
  /** Still finding out whether someone is signed in. */
  loading: boolean;
  user: User | null;
}

let state: AccountState = { loading: true, user: null };
const listeners = new Set<() => void>();
const set = (next: Partial<AccountState>) => {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
};

/** Who's signed in, re-rendering when that changes. */
export function useAccount(): AccountState & { enabled: boolean } {
  const s = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
  );
  return { ...s, enabled: accountsEnabled() };
}

export const currentUser = () => state.user;

// ---------- The client ----------

let client: Promise<SupabaseClient> | null = null;

/** The Supabase client, created on first use. Only call when accountsEnabled(). */
export function getClient(): Promise<SupabaseClient> {
  client ??= import('@supabase/supabase-js').then(({ createClient }) =>
    createClient(URL_!, KEY!, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }),
  );
  return client;
}

/**
 * Start-up: if accounts are on, restore the session (or finish a sign-in
 * link that brought us here) and follow sign-ins and sign-outs.
 * `onUser` is told about each change (cloud sync starts and stops there).
 */
export async function startAccounts(onUser: (user: User | null) => void): Promise<void> {
  if (!accountsEnabled()) {
    set({ loading: false });
    return;
  }
  try {
    const supabase = await getClient();
    const { data } = await supabase.auth.getSession();
    set({ loading: false, user: data.session?.user ?? null });
    onUser(state.user);
    supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user ?? null;
      if (user?.id === state.user?.id) return set({ user }); // a token refresh, same person
      set({ user });
      onUser(user);
    });
  } catch (e) {
    console.error("Couldn't start accounts", e);
    set({ loading: false });
  }
}

// ---------- Signing in and out ----------

/** Where sign-in links and providers send people back to. */
const returnTo = () => `${window.location.origin}${window.location.pathname}`;

export async function signInWithPassword(email: string, password: string) {
  const { error } = await (await getClient()).auth.signInWithPassword({ email, password });
  if (error) throw error;
}

/** Creates an account. Returns true when the project wants the email confirmed first. */
export async function signUp(email: string, password: string): Promise<boolean> {
  const { data, error } = await (await getClient()).auth.signUp({ email, password, options: { emailRedirectTo: returnTo() } });
  if (error) throw error;
  return !data.session;
}

/** Emails a one-click sign-in link (a "magic link"). */
export async function sendSignInLink(email: string) {
  const { error } = await (await getClient()).auth.signInWithOtp({ email, options: { emailRedirectTo: returnTo() } });
  if (error) throw error;
}

/** Goes to the provider's sign-in page; it comes back here signed in. */
export async function signInWithProvider(provider: (typeof PROVIDERS)[number]) {
  const { error } = await (await getClient()).auth.signInWithOAuth({ provider, options: { redirectTo: returnTo() } });
  if (error) throw error;
}

export async function signOut() {
  const { error } = await (await getClient()).auth.signOut();
  if (error) throw error;
}

/** "Google", "Github" → "GitHub" */
export const providerName = (p: string) => ({ github: 'GitHub', gitlab: 'GitLab', azure: 'Microsoft' })[p] ?? p[0].toUpperCase() + p.slice(1);

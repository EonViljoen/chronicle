import { useSyncExternalStore } from 'react';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { db } from '../db/db';
import type { Timeline } from '../types/timeline';
import type { Theme } from '../types/theme';
import { upgradeTimeline } from '../lib/upgrade';
import { getClient } from './account';
import { picturesFromCloud, picturesToCloud } from './pictures';

/*
 * Cloud saving, local-first. The browser database stays the working copy,
 * so the app is as fast as ever and works offline. While someone is signed
 * in, this keeps it and their account in step:
 *
 * - Pull: rows changed in the cloud since the last pull come down. A
 *   timeline replaces the browser's copy when it was saved later (each
 *   timeline's own `updatedAt`): the last save wins, per timeline.
 * - Push: timelines and themes changed here since they last went up are
 *   uploaded. Ones deleted here are marked deleted in the cloud, so other
 *   devices delete them too. (Deletions are noted as they happen, never
 *   guessed from what's missing: a wiped browser mustn't empty the account.)
 *
 * It runs on sign-in, a few seconds after each change, when the window gets
 * focus or comes back online, and every minute. What's been synced is
 * remembered per account in localStorage (see Meta).
 *
 * The cloud tables are described in supabase/schema.sql.
 */

// ---------- What's been synced, per account ----------

interface Meta {
  /** Server time of the newest row pulled, for the next pull. */
  pulledAt?: string;
  /** The version last synced, by "t:<id>" (a timeline's updatedAt) or "th:<id>" (a hash of the theme). */
  synced: Record<string, string>;
  /** Timelines kept out of the account (the first-sign-in question). */
  localOnly: string[];
  /** Whether the first-sign-in question has been answered. */
  asked: boolean;
}

const metaKey = (userId: string) => `chronicle.sync.${userId}`;
/** Deletions waiting to be passed on, kept apart from Meta so a sync in progress can't overwrite them. */
const deletedKey = (userId: string) => `chronicle.sync.${userId}.deleted`;

function readDeleted(userId: string): string[] {
  try {
    return JSON.parse(localStorage.getItem(deletedKey(userId)) ?? '[]') as string[];
  } catch {
    return [];
  }
}

function writeDeleted(userId: string, keys: string[]) {
  try {
    if (keys.length) localStorage.setItem(deletedKey(userId), JSON.stringify(keys));
    else localStorage.removeItem(deletedKey(userId));
  } catch {
    // Blocked storage: the deletion just isn't passed on
  }
}

function readMeta(userId: string): Meta {
  try {
    const raw = localStorage.getItem(metaKey(userId));
    if (raw) return { synced: {}, localOnly: [], asked: false, ...(JSON.parse(raw) as Partial<Meta>) };
  } catch {
    // Unreadable: start again; the worst case is re-uploading
  }
  return { synced: {}, localOnly: [], asked: false };
}

function writeMeta(userId: string, meta: Meta) {
  try {
    localStorage.setItem(metaKey(userId), JSON.stringify(meta));
  } catch {
    // Storage full or blocked: syncing still works, just repeats more
  }
}

/** A short, steady fingerprint of a value (for spotting changed themes). */
function hash(value: unknown): string {
  const text = JSON.stringify(value);
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = (h * 33) ^ text.charCodeAt(i);
  return `${text.length}:${(h >>> 0).toString(36)}`;
}

// ---------- Status, for the UI ----------

export interface SyncState {
  status: 'off' | 'idle' | 'syncing' | 'offline' | 'error';
  /** When the last sync finished. */
  lastSynced?: number;
  error?: string;
  /** Set on first sign-in on this device: timelines here that aren't in the account. */
  offer?: { count: number };
  /** Timelines kept out of the account. */
  localOnly: string[];
}

let state: SyncState = { status: 'off', localOnly: [] };
const listeners = new Set<() => void>();
const set = (next: Partial<SyncState>) => {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
};

/** The status in words. */
export function statusText(status: SyncState['status'], lastSynced?: number): string {
  switch (status) {
    case 'syncing':
      return 'Syncing…';
    case 'offline':
      return "Offline: changes are saved here and upload when you're back online.";
    case 'error':
      return "Couldn't reach your account. Changes are safe in this browser; it will try again.";
    case 'off':
      return 'Not syncing.';
    default:
      return lastSynced ? `Up to date (synced ${new Date(lastSynced).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}).` : 'Up to date.';
  }
}

export function useSync(): SyncState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
  );
}

// ---------- Running ----------

let user: User | null = null;
let running: Promise<void> | null = null;
let again = false;
let timer: ReturnType<typeof setTimeout> | undefined;
let interval: ReturnType<typeof setInterval> | undefined;
/** True while writing what came from the cloud, so those writes aren't sent straight back. */
let applyingRemote = false;

/** Sync soon (changes come in bursts: wait for a quiet moment). */
function schedule(delay = 3000) {
  if (!user) return;
  clearTimeout(timer);
  timer = setTimeout(() => void syncNow(), delay);
}

/** Sync now; if a sync is already running, run again when it ends. */
export async function syncNow(): Promise<void> {
  if (!user) return;
  if (running) {
    again = true;
    return running;
  }
  running = (async () => {
    do {
      again = false;
      await syncOnce(user!);
    } while (again && user);
  })().finally(() => (running = null));
  return running;
}

const onFocus = () => schedule(500);
const onOnline = () => schedule(500);
const onOffline = () => set({ status: 'offline' });

/** Called when someone signs in (a user) or out (null). */
export function setSyncUser(next: User | null) {
  user = next;
  clearTimeout(timer);
  clearInterval(interval);
  window.removeEventListener('focus', onFocus);
  window.removeEventListener('online', onOnline);
  window.removeEventListener('offline', onOffline);
  if (!next) {
    set({ status: 'off', offer: undefined, localOnly: [], error: undefined, lastSynced: undefined });
    return;
  }
  set({ status: 'idle', localOnly: readMeta(next.id).localOnly });
  window.addEventListener('focus', onFocus);
  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);
  interval = setInterval(() => schedule(0), 60_000);
  void syncNow();
}

// Every local change schedules a sync. (Only a nudge: each sync compares
// everything anyway, so a missed nudge just waits for the next one.)
// Deletions are also noted, to pass on.
const nudge = () => void (applyingRemote || schedule());
db.timelines.hook('creating', nudge);
db.timelines.hook('updating', nudge);
db.timelines.hook('deleting', (id) => noteDeleted(`t:${id}`));
db.themes.hook('creating', nudge);
db.themes.hook('updating', nudge);
db.themes.hook('deleting', (id) => noteDeleted(`th:${id}`));

function noteDeleted(key: string) {
  if (applyingRemote || !user) return;
  const pending = readDeleted(user.id);
  if (!pending.includes(key)) writeDeleted(user.id, [...pending, key]);
  schedule();
}

// ---------- One sync ----------

interface Row {
  id: string;
  data: unknown;
  deleted: boolean;
  updated_at: string;
}

async function syncOnce(u: User) {
  if (!navigator.onLine) return set({ status: 'offline' });
  set({ status: 'syncing', error: undefined });
  try {
    const supabase = await getClient();
    const meta = readMeta(u.id);
    await pull(supabase, u, meta, 'timelines');
    await pull(supabase, u, meta, 'themes');
    if (!meta.asked) await askAboutLocal(supabase, u, meta);
    await push(supabase, u, meta);
    if (user?.id !== u.id) return; // signed out meanwhile: don't touch their state
    writeMeta(u.id, meta);
    set({ status: 'idle', lastSynced: Date.now(), localOnly: meta.localOnly });
  } catch (e) {
    console.error('Cloud sync failed', e);
    set({ status: navigator.onLine ? 'error' : 'offline', error: e instanceof Error ? e.message : String(e) });
  }
}

/** Everything changed in the cloud since the last pull. */
async function pull(supabase: SupabaseClient, u: User, meta: Meta, table: 'timelines' | 'themes') {
  // A little overlap, in case two saves landed in the same moment
  const since = meta.pulledAt ? new Date(Date.parse(meta.pulledAt) - 5000).toISOString() : undefined;
  let query = supabase.from(table).select('id, data, deleted, updated_at').eq('user_id', u.id).order('updated_at');
  if (since) query = query.gt('updated_at', since);
  const { data, error } = await query;
  if (error) throw error;
  for (const row of (data ?? []) as Row[]) {
    if (table === 'timelines') await applyTimeline(supabase, meta, row);
    else await applyTheme(supabase, meta, row);
    if (!meta.pulledAt || row.updated_at > meta.pulledAt) meta.pulledAt = row.updated_at;
  }
}

/** Writes local changes that came from the cloud, without them being sent back. */
async function asRemote(write: () => Promise<unknown>) {
  applyingRemote = true;
  try {
    await write();
  } finally {
    applyingRemote = false;
  }
}

async function applyTimeline(supabase: SupabaseClient, meta: Meta, row: Row) {
  const key = `t:${row.id}`;
  const local = await db.timelines.get(row.id);
  const changedHere = local && meta.synced[key] !== String(local.updatedAt);
  if (row.deleted) {
    // Deleted elsewhere: delete here too, unless it's been edited here since (then it comes back)
    if (local && !changedHere) await asRemote(() => db.timelines.delete(row.id));
    if (!changedHere) delete meta.synced[key];
    return;
  }
  const remote = row.data as Timeline;
  // Already have this version (pulls overlap a little), or ours is newer: ours goes up instead
  if (meta.synced[key] === String(remote.updatedAt) || (local && local.updatedAt >= remote.updatedAt)) return;
  const whole = upgradeTimeline(await picturesFromCloud(remote, supabase));
  await asRemote(() => db.timelines.put(whole));
  meta.synced[key] = String(whole.updatedAt);
}

async function applyTheme(supabase: SupabaseClient, meta: Meta, row: Row) {
  const key = `th:${row.id}`;
  const local = await db.themes.get(row.id);
  const changedHere = local && meta.synced[key] !== hash(local);
  if (row.deleted) {
    if (local && !changedHere) await asRemote(() => db.themes.delete(row.id));
    if (!changedHere) delete meta.synced[key];
    return;
  }
  if (changedHere) return; // changed here since the last sync: ours goes up
  const theme = await picturesFromCloud(row.data as Theme, supabase);
  await asRemote(() => db.themes.put(theme));
  meta.synced[key] = hash(theme);
}

/**
 * First sign-in on this device: timelines already here that aren't in the
 * account wait for a yes before being uploaded (see answerOffer).
 */
async function askAboutLocal(supabase: SupabaseClient, u: User, meta: Meta) {
  const { data, error } = await supabase.from('timelines').select('id').eq('user_id', u.id);
  if (error) throw error;
  const inCloud = new Set((data ?? []).map((r: { id: string }) => r.id));
  const waiting = (await db.timelines.toArray()).filter((t) => !inCloud.has(t.id) && !meta.synced[`t:${t.id}`]);
  if (waiting.length === 0) {
    meta.asked = true;
    set({ offer: undefined });
  } else {
    // Until answered, these stay out of the push
    meta.localOnly = waiting.map((t) => t.id);
    set({ offer: { count: waiting.length } });
  }
}

/** The answer to the first-sign-in question: upload the timelines here, or keep them in this browser only. */
export async function answerOffer(upload: boolean) {
  if (!user) return;
  const meta = readMeta(user.id);
  meta.asked = true;
  meta.localOnly = upload ? [] : (await db.timelines.toArray()).filter((t) => !meta.synced[`t:${t.id}`]).map((t) => t.id);
  writeMeta(user.id, meta);
  set({ offer: undefined, localOnly: meta.localOnly });
  if (upload) void syncNow();
}

/** Uploads a timeline that was kept in this browser only. */
export function uploadLocal(id: string) {
  if (!user) return;
  const meta = readMeta(user.id);
  meta.localOnly = meta.localOnly.filter((x) => x !== id);
  writeMeta(user.id, meta);
  set({ localOnly: meta.localOnly });
  void syncNow();
}

/** Uploads what changed here, and passes on deletions. */
async function push(supabase: SupabaseClient, u: User, meta: Meta) {
  const localOnly = new Set(meta.localOnly);
  const rows: { table: 'timelines' | 'themes'; key: string; version: string; row: object }[] = [];

  for (const t of await db.timelines.toArray()) {
    const key = `t:${t.id}`;
    if (localOnly.has(t.id) || meta.synced[key] === String(t.updatedAt)) continue;
    rows.push({ table: 'timelines', key, version: String(t.updatedAt), row: { user_id: u.id, id: t.id, data: await picturesToCloud(t, supabase, u.id), deleted: false } });
  }
  for (const th of await db.themes.toArray()) {
    const key = `th:${th.id}`;
    const version = hash(th);
    if (meta.synced[key] === version) continue;
    rows.push({ table: 'themes', key, version, row: { user_id: u.id, id: th.id, data: await picturesToCloud(th, supabase, u.id), deleted: false } });
  }
  // One at a time: a timeline with big pictures is a big request on its own
  for (const { table, key, version, row } of rows) {
    const { error } = await supabase.from(table).upsert(row, { onConflict: 'user_id,id' });
    if (error) throw error;
    meta.synced[key] = version;
  }

  // Deleted here: mark them deleted in the cloud (only ones that ever reached it)
  for (const key of readDeleted(u.id)) {
    const isTimeline = key.startsWith('t:');
    const id = key.slice(key.indexOf(':') + 1);
    const back = await (isTimeline ? db.timelines.get(id) : db.themes.get(id)); // restored since, e.g. from a backup
    if (meta.synced[key] && !back) {
      const { error } = await supabase.from(isTimeline ? 'timelines' : 'themes').upsert({ user_id: u.id, id, data: null, deleted: true }, { onConflict: 'user_id,id' });
      if (error) throw error;
      delete meta.synced[key];
    }
    writeDeleted(u.id, readDeleted(u.id).filter((k) => k !== key));
  }
}

/**
 * Signing out can also remove this account's timelines and themes from the
 * browser (on a shared computer). Ones kept in this browser only stay.
 */
export async function forgetAccountData(userId: string) {
  const meta = readMeta(userId);
  const timelineIds = Object.keys(meta.synced).filter((k) => k.startsWith('t:')).map((k) => k.slice(2));
  const themeIds = Object.keys(meta.synced).filter((k) => k.startsWith('th:')).map((k) => k.slice(3));
  await asRemote(async () => {
    await db.timelines.bulkDelete(timelineIds);
    await db.themes.bulkDelete(themeIds);
  });
  try {
    localStorage.removeItem(metaKey(userId));
    localStorage.removeItem(deletedKey(userId));
  } catch {
    // Nothing to do
  }
}

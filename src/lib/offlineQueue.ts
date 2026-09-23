/**
 * Offline queue using IndexedDB (via idb library).
 * Queues evidence/obligation/shock entries when offline, flushes to Supabase when reconnected.
 *
 * Hardening:
 *  - Persists every record field (image_url, parsed_meta, type included).
 *  - Never flushes another user's entries (RLS would silently reject them).
 *  - Caps retries at MAX_ATTEMPTS; entries that exceed it are marked failed.
 */
import { openDB, type IDBPDatabase } from 'idb';
import type { QueuedEntry } from '../types/database';
import { supabase, isSupabaseConfigured } from './supabase';

const DB_NAME = 'tejas-offline';
const STORE_EVIDENCE = 'queued-entries';
const STORE_OBLIGATIONS = 'queued-obligations';
const STORE_SHOCKS = 'queued-shocks';
const DB_VERSION = 1;
const MAX_ATTEMPTS = 5;

let db: IDBPDatabase | null = null;

async function getDB(): Promise<IDBPDatabase> {
  if (db) return db;
  db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(database) {
      if (!database.objectStoreNames.contains(STORE_EVIDENCE)) {
        database.createObjectStore(STORE_EVIDENCE, { keyPath: 'id' });
      }
      if (!database.objectStoreNames.contains(STORE_OBLIGATIONS)) {
        database.createObjectStore(STORE_OBLIGATIONS, { keyPath: 'id' });
      }
      if (!database.objectStoreNames.contains(STORE_SHOCKS)) {
        database.createObjectStore(STORE_SHOCKS, { keyPath: 'id' });
      }
    },
  });
  return db;
}

/**
 * Add an entry to the offline queue
 */
export async function queueEntry(
  data: Omit<import('../types/database').EvidenceRecord, 'id' | 'created_at'>
): Promise<QueuedEntry> {
  const database = await getDB();
  const entry: QueuedEntry = {
    id: crypto.randomUUID(),
    data,
    timestamp: Date.now(),
    synced: false,
    attempts: 0,
    last_error: null,
  };
  await database.put(STORE_EVIDENCE, entry);
  return entry;
}

/**
 * Get all queued (unsynced, still retryable) entries
 */
export async function getQueuedEntries(): Promise<QueuedEntry[]> {
  const database = await getDB();
  const all = await database.getAll(STORE_EVIDENCE) as QueuedEntry[];
  return all.filter((e) => !e.synced && (e.attempts ?? 0) < MAX_ATTEMPTS);
}

/**
 * Get count of pending entries
 */
export async function getPendingCount(): Promise<number> {
  const entries = await getQueuedEntries();
  return entries.length;
}

/**
 * Mark an entry as synced
 */
export async function markSynced(id: string): Promise<void> {
  const database = await getDB();
  const entry = await database.get(STORE_EVIDENCE, id);
  if (entry) {
    entry.synced = true;
    await database.put(STORE_EVIDENCE, entry);
  }
}

async function recordFailure(id: string, message: string): Promise<void> {
  const database = await getDB();
  const entry = await database.get(STORE_EVIDENCE, id);
  if (entry) {
    entry.attempts = (entry.attempts ?? 0) + 1;
    entry.last_error = message;
    await database.put(STORE_EVIDENCE, entry);
  }
}

/**
 * Flush queued entries to Supabase.
 * Only flushes entries that belong to the currently authenticated user.
 */
export async function flushQueue(): Promise<{ synced: number; failed: number }> {
  if (!isSupabaseConfigured()) return { synced: 0, failed: 0 };

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const currentUserId = session?.user?.id;
  if (!currentUserId) return { synced: 0, failed: 0 };

  const entries = await getQueuedEntries();
  let synced = 0;
  let failed = 0;

  for (const entry of entries) {
    if (entry.data.user_id !== currentUserId) continue; // never sync under the wrong identity
    try {
      const { error } = await supabase.from('evidence_records').insert({
        user_id: entry.data.user_id,
        type: entry.data.type,
        raw_text: entry.data.raw_text,
        amount: entry.data.amount,
        direction: entry.data.direction,
        category: entry.data.category,
        provenance_label: entry.data.provenance_label,
        date: entry.data.date,
        image_url: entry.data.image_url || null,
        parsed_meta: entry.data.parsed_meta || null,
      });
      if (error) {
        await recordFailure(entry.id, error.message);
        failed++;
      } else {
        await markSynced(entry.id);
        synced++;
      }
    } catch (e) {
      await recordFailure(entry.id, e instanceof Error ? e.message : 'network error');
      failed++;
    }
  }

  return { synced, failed };
}

/**
 * Clear synced entries (and entries that exhausted their retries) from the queue
 */
export async function clearSynced(): Promise<void> {
  const database = await getDB();
  const all = await database.getAll(STORE_EVIDENCE) as QueuedEntry[];
  for (const entry of all) {
    if (entry.synced || (entry.attempts ?? 0) >= MAX_ATTEMPTS) {
      await database.delete(STORE_EVIDENCE, entry.id);
    }
  }
}

/**
 * Set up automatic flushing: on reconnection, on startup, and every 5 minutes.
 * Returns a cleanup function.
 */
export function setupAutoFlush(onFlush?: (result: { synced: number; failed: number }) => void) {
  const run = async () => {
    const result = await flushAllQueues();
    if (result.synced > 0) {
      await clearSynced();
    }
    if (result.synced > 0 || result.failed > 0) {
      onFlush?.(result);
    }
  };

  const handleOnline = () => {
    void run();
  };

  window.addEventListener('online', handleOnline);
  const interval = window.setInterval(run, 5 * 60_000);
  void run(); // drain anything queued in a previous session

  return () => {
    window.removeEventListener('online', handleOnline);
    window.clearInterval(interval);
  };
}

/* ─── Obligation Queue ─── */

interface QueuedObligation {
  id: string;
  data: { user_id: string; description: string; due_date: string; amount: number };
  timestamp: number;
  synced: boolean;
}

export async function queueObligation(data: QueuedObligation['data']): Promise<void> {
  const database = await getDB();
  const entry: QueuedObligation = { id: crypto.randomUUID(), data, timestamp: Date.now(), synced: false };
  await database.put(STORE_OBLIGATIONS, entry);
}

export async function flushObligations(): Promise<{ synced: number; failed: number }> {
  if (!isSupabaseConfigured()) return { synced: 0, failed: 0 };
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id) return { synced: 0, failed: 0 };
  const database = await getDB();
  const all = await database.getAll(STORE_OBLIGATIONS) as QueuedObligation[];
  let synced = 0, failed = 0;
  for (const entry of all) {
    if (entry.synced) continue;
    try {
      const { error } = await supabase.from('obligations').insert(entry.data);
      if (error) { failed++; } else { entry.synced = true; await database.put(STORE_OBLIGATIONS, entry); synced++; }
    } catch { failed++; }
  }
  return { synced, failed };
}

/* ─── Shock Queue ─── */

interface QueuedShock {
  id: string;
  data: { user_id: string; scenario_type: string; shock_amount: number; resulting_shortfall_date: string | null; resulting_gap_amount: number };
  timestamp: number;
  synced: boolean;
}

export async function queueShock(data: QueuedShock['data']): Promise<void> {
  const database = await getDB();
  const entry: QueuedShock = { id: crypto.randomUUID(), data, timestamp: Date.now(), synced: false };
  await database.put(STORE_SHOCKS, entry);
}

export async function flushShocks(): Promise<{ synced: number; failed: number }> {
  if (!isSupabaseConfigured()) return { synced: 0, failed: 0 };
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id) return { synced: 0, failed: 0 };
  const database = await getDB();
  const all = await database.getAll(STORE_SHOCKS) as QueuedShock[];
  let synced = 0, failed = 0;
  for (const entry of all) {
    if (entry.synced) continue;
    try {
      const { error } = await supabase.from('shock_scenarios').insert(entry.data);
      if (error) { failed++; } else { entry.synced = true; await database.put(STORE_SHOCKS, entry); synced++; }
    } catch { failed++; }
  }
  return { synced, failed };
}

/* ─── Combined Flush ─── */

export async function flushAllQueues(): Promise<{ synced: number; failed: number }> {
  const ev = await flushQueue();
  const ob = await flushObligations();
  const sh = await flushShocks();
  return { synced: ev.synced + ob.synced + sh.synced, failed: ev.failed + ob.failed + sh.failed };
}

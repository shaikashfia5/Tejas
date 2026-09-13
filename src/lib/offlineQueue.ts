/**
 * Offline queue using IndexedDB (via idb library).
 * Queues evidence entries when offline, flushes to Supabase when reconnected.
 */
import { openDB, type IDBPDatabase } from 'idb';
import type { QueuedEntry, EvidenceRecord } from '../types/database';
import { supabase } from './supabase';

const DB_NAME = 'tejas-offline';
const STORE_NAME = 'queued-entries';
const DB_VERSION = 1;

let db: IDBPDatabase | null = null;

async function getDB(): Promise<IDBPDatabase> {
  if (db) return db;
  db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(database) {
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    },
  });
  return db;
}

/**
 * Add an entry to the offline queue
 */
export async function queueEntry(
  data: Omit<EvidenceRecord, 'id' | 'created_at'>
): Promise<QueuedEntry> {
  const database = await getDB();
  const entry: QueuedEntry = {
    id: crypto.randomUUID(),
    data,
    timestamp: Date.now(),
    synced: false,
  };
  await database.put(STORE_NAME, entry);
  return entry;
}

/**
 * Get all queued (unsynced) entries
 */
export async function getQueuedEntries(): Promise<QueuedEntry[]> {
  const database = await getDB();
  const all = await database.getAll(STORE_NAME);
  return all.filter((e: QueuedEntry) => !e.synced);
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
  const entry = await database.get(STORE_NAME, id);
  if (entry) {
    entry.synced = true;
    await database.put(STORE_NAME, entry);
  }
}

/**
 * Flush all queued entries to Supabase
 */
export async function flushQueue(): Promise<{ synced: number; failed: number }> {
  const entries = await getQueuedEntries();
  let synced = 0;
  let failed = 0;

  for (const entry of entries) {
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
      });
      if (error) {
        failed++;
      } else {
        await markSynced(entry.id);
        synced++;
      }
    } catch {
      failed++;
    }
  }

  return { synced, failed };
}

/**
 * Clear all synced entries from the queue
 */
export async function clearSynced(): Promise<void> {
  const database = await getDB();
  const all = await database.getAll(STORE_NAME);
  for (const entry of all) {
    if ((entry as QueuedEntry).synced) {
      await database.delete(STORE_NAME, (entry as QueuedEntry).id);
    }
  }
}

/**
 * Set up auto-flush on reconnection
 */
export function setupAutoFlush(onFlush?: (result: { synced: number; failed: number }) => void) {
  const handleOnline = async () => {
    const result = await flushQueue();
    if (result.synced > 0) {
      await clearSynced();
    }
    onFlush?.(result);
  };

  window.addEventListener('online', handleOnline);
  return () => window.removeEventListener('online', handleOnline);
}

const DB_NAME = 'free_translate_db';
const STORE_NAME = 'translations';
const DB_VERSION = 1;
const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

interface CacheRecord {
  key: string;
  translation: string;
  updatedAt: number;
}

const memoryCache = new Map<string, CacheRecord>();

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36) + '_' + str.length;
}

function buildKey(service: string, from: string, to: string, text: string): string {
  return `${service}:${from}:${to}:${simpleHash(text.trim())}`;
}

let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDB(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') {
    return Promise.resolve(null);
  }
  if (!dbPromise) {
    dbPromise = new Promise((resolve) => {
      try {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME, { keyPath: 'key' });
          }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  }
  return dbPromise;
}

export async function getCachedTranslation(
  service: string,
  from: string,
  to: string,
  text: string,
): Promise<string | null> {
  const key = buildKey(service, from, to, text);
  const mem = memoryCache.get(key);
  const now = Date.now();
  if (mem && now - mem.updatedAt < TTL_MS) {
    return mem.translation;
  }

  const db = await openDB();
  if (!db) return null;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => {
        const record = req.result as CacheRecord | undefined;
        if (record && now - record.updatedAt < TTL_MS) {
          memoryCache.set(key, record);
          resolve(record.translation);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function setCachedTranslation(
  service: string,
  from: string,
  to: string,
  text: string,
  translation: string,
): Promise<void> {
  const key = buildKey(service, from, to, text);
  const record: CacheRecord = { key, translation, updatedAt: Date.now() };
  memoryCache.set(key, record);

  const db = await openDB();
  if (!db) return;

  try {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(record);
  } catch {
    // Ignore storage quota or transaction errors
  }
}

export async function clearCache(): Promise<void> {
  memoryCache.clear();
  const db = await openDB();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

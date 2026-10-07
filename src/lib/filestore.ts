// Simple IndexedDB helper to store/retrieve video files (blobs)
const DB_NAME = 'santuario_filestore_v1';
const STORE_NAME = 'videos';
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveFile(key: string, file: Blob | File): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(file, key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getFileBlob(key: string): Promise<Blob | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

const objectUrlCache = new Map<string, string>();

export async function getFileBlobUrl(key: string): Promise<string | null> {
  if (objectUrlCache.has(key)) return objectUrlCache.get(key)!;
  const blob = await getFileBlob(key);
  if (!blob) return null;
  const url = URL.createObjectURL(blob);
  objectUrlCache.set(key, url);
  return url;
}

export async function deleteFile(key: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(key);
    req.onsuccess = () => {
      if (objectUrlCache.has(key)) {
        URL.revokeObjectURL(objectUrlCache.get(key)!);
        objectUrlCache.delete(key);
      }
      resolve();
    };
    req.onerror = () => reject(req.error);
  });
}

export async function listFiles(): Promise<string[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAllKeys();
    req.onsuccess = () => resolve((req.result as string[]) || []);
    req.onerror = () => reject(req.error);
  });
}

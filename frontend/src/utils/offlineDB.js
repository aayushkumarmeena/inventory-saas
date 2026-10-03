/**
 * offlineDB.js — IndexedDB abstraction for Offline POS Mode
 *
 * Stores:
 *   - "products"       → cached product catalog (keyed by id)
 *   - "pending_sales"  → queued offline sales (keyed by localId)
 *
 * Usage:
 *   import { offlineDB } from './offlineDB';
 *   await offlineDB.cacheProducts(array);
 *   const products = await offlineDB.getCachedProducts();
 *   const localId = await offlineDB.queueSale(payload);
 *   const pending = await offlineDB.getPendingSales();
 *   await offlineDB.removePendingSale(localId);
 *   await offlineDB.updatePendingSaleStatus(localId, 'syncing' | 'failed');
 */

const DB_NAME = 'inventorypro_offline';
const DB_VERSION = 1;
const STORE_PRODUCTS = 'products';
const STORE_SALES = 'pending_sales';

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_PRODUCTS)) {
        db.createObjectStore(STORE_PRODUCTS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_SALES)) {
        const store = db.createObjectStore(STORE_SALES, { keyPath: 'localId', autoIncrement: true });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('queuedAt', 'queuedAt', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function txPromise(db, storeName, mode, fn) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    const req = fn(store);
    if (req) {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    } else {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    }
  });
}

export const offlineDB = {
  /**
   * Cache the full product catalog (replaces old cache).
   * @param {Array} products
   */
  async cacheProducts(products) {
    const db = await openDB();
    const tx = db.transaction(STORE_PRODUCTS, 'readwrite');
    const store = tx.objectStore(STORE_PRODUCTS);
    store.clear();
    for (const p of products) store.put(p);
    return new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  },

  /**
   * Retrieve all cached products.
   * @returns {Promise<Array>}
   */
  async getCachedProducts() {
    const db = await openDB();
    return txPromise(db, STORE_PRODUCTS, 'readonly', (store) => store.getAll());
  },

  /**
   * Get the timestamp when products were last cached.
   * Stored as a special entry with id='__meta__'.
   */
  async getProductCacheAge() {
    try {
      const db = await openDB();
      const result = await txPromise(db, STORE_PRODUCTS, 'readonly', (store) => store.get('__meta__'));
      return result?.cachedAt || null;
    } catch {
      return null;
    }
  },

  /**
   * Saves cache timestamp metadata.
   */
  async markProductCacheTime() {
    const db = await openDB();
    await txPromise(db, STORE_PRODUCTS, 'readwrite', (store) =>
      store.put({ id: '__meta__', cachedAt: Date.now() })
    );
  },

  /**
   * Queue a sale for offline submission.
   * @param {Object} payload — the sale payload (customerName, paymentMethod, items, etc.)
   * @returns {Promise<number>} localId — the auto-generated key
   */
  async queueSale(payload) {
    const db = await openDB();
    const entry = {
      payload,
      status: 'pending',   // 'pending' | 'syncing' | 'synced' | 'failed'
      queuedAt: Date.now(),
      retries: 0,
      errorMsg: null,
    };
    const id = await txPromise(db, STORE_SALES, 'readwrite', (store) => store.add(entry));
    return id;
  },

  /**
   * Get all pending (not synced) sales.
   * @returns {Promise<Array>}
   */
  async getPendingSales() {
    const db = await openDB();
    const all = await txPromise(db, STORE_SALES, 'readonly', (store) => store.getAll());
    return (all || []).filter((s) => s.status !== 'synced');
  },

  /**
   * Update the status and optional error message of a pending sale.
   */
  async updatePendingSale(localId, updates) {
    const db = await openDB();
    const existing = await txPromise(db, STORE_SALES, 'readonly', (store) => store.get(localId));
    if (!existing) return;
    const updated = { ...existing, ...updates };
    await txPromise(db, STORE_SALES, 'readwrite', (store) => store.put(updated));
  },

  /**
   * Remove a successfully synced sale from the queue.
   */
  async removePendingSale(localId) {
    const db = await openDB();
    await txPromise(db, STORE_SALES, 'readwrite', (store) => store.delete(localId));
  },

  /**
   * Count of unsynced (pending/failed) sales.
   */
  async getPendingCount() {
    const pending = await this.getPendingSales();
    return pending.length;
  },
};

export default offlineDB;

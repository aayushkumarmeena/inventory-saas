/**
 * useOfflineStatus.js — React hook for offline detection and auto-sync
 *
 * Returns:
 *   isOnline         — current network status
 *   pendingCount     — number of sales queued offline
 *   isSyncing        — sync in progress
 *   lastSyncedAt     — timestamp of last successful sync
 *   syncNow()        — manually trigger sync
 *   refreshPending() — re-count pending queue
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { offlineDB } from '../utils/offlineDB';
import { salesApi } from '../api/salesApi';

let globalSyncListeners = [];
export function notifyOfflineSyncListeners() {
  globalSyncListeners.forEach((fn) => fn());
}

export function useOfflineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState(null);
  const syncLockRef = useRef(false);

  const refreshPending = useCallback(async () => {
    try {
      const count = await offlineDB.getPendingCount();
      setPendingCount(count);
    } catch {
      // IndexedDB not available
    }
  }, []);

  // Sync all queued sales to backend
  const syncNow = useCallback(async () => {
    if (syncLockRef.current || !navigator.onLine) return;
    syncLockRef.current = true;
    setIsSyncing(true);

    try {
      const pending = await offlineDB.getPendingSales();
      const toSync = pending.filter((s) => s.status === 'pending' || s.status === 'failed');

      for (const sale of toSync) {
        try {
          await offlineDB.updatePendingSale(sale.localId, { status: 'syncing' });
          await salesApi.create(sale.payload);
          await offlineDB.removePendingSale(sale.localId);
        } catch (err) {
          const retries = (sale.retries || 0) + 1;
          await offlineDB.updatePendingSale(sale.localId, {
            status: retries >= 5 ? 'failed' : 'pending',
            retries,
            errorMsg: err.response?.data?.message || err.message || 'Network error',
            lastAttemptAt: Date.now(),
          });
        }
      }

      setLastSyncedAt(Date.now());
    } catch (e) {
      // silent
    } finally {
      syncLockRef.current = false;
      setIsSyncing(false);
      await refreshPending();
      notifyOfflineSyncListeners();
    }
  }, [refreshPending]);

  // Online/offline event listeners
  useEffect(() => {
    const onOnline = () => {
      setIsOnline(true);
      // Trigger sync automatically when we come back online
      setTimeout(() => syncNow(), 800);
    };
    const onOffline = () => setIsOnline(false);

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [syncNow]);

  // Subscribe to global sync notifications (from Sales.jsx queuing)
  useEffect(() => {
    const listener = () => refreshPending();
    globalSyncListeners.push(listener);
    return () => {
      globalSyncListeners = globalSyncListeners.filter((l) => l !== listener);
    };
  }, [refreshPending]);

  // Initial pending count
  useEffect(() => {
    refreshPending();
  }, [refreshPending]);

  // Periodic auto-sync every 30 seconds when online
  useEffect(() => {
    const interval = setInterval(() => {
      if (navigator.onLine) syncNow();
    }, 30000);
    return () => clearInterval(interval);
  }, [syncNow]);

  return { isOnline, pendingCount, isSyncing, lastSyncedAt, syncNow, refreshPending };
}

export default useOfflineStatus;

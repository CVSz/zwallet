package com.zwallet.data.local

/**
 * Offline-first cache contract:
 * - Repository uses local persisted cache as first read source.
 * - Network responses update cache and UI state.
 * - Mutations are written optimistically to cache to keep UX resilient offline.
 */
object OfflineFirstDesign

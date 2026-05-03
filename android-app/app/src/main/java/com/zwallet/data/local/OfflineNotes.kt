package com.zwallet.data.local

/**
 * Offline-first strategy:
 * 1) Read balances/tx history from Room cache first.
 * 2) Fetch fresh data from backend and reconcile.
 * 3) Queue send/swap actions locally and replay when connectivity returns.
 */
object OfflineFirstDesign

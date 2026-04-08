/**
 * Supabase Client Configuration
 *
 * This file provides two separate Supabase clients:
 * - platformDb: For the main Platform application (public schema)
 * - simDb: For the Simulator module (sim schema)
 *
 * IMPORTANT: Always use the correct client for each domain!
 * - Platform features → platformDb
 * - Simulator features → simDb
 *
 * Uses singleton pattern and shared auth to prevent multiple GoTrueClient instances
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const isValidUrl = (url) =>
  typeof url === 'string' &&
  (url.startsWith('https://') || url.startsWith('http://')) &&
  !url.includes('your_') &&
  url.length > 20;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase config. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env (see .env.example).'
  );
}
if (!isValidUrl(supabaseUrl)) {
  throw new Error(
    'Invalid VITE_SUPABASE_URL. Use your real Supabase project URL in .env. Remove or fix placeholder values in .env.development.'
  );
}

// Singleton pattern to prevent multiple instances
let platformDbInstance = null;
let simDbInstance = null;

// Shared storage key to prevent multiple GoTrueClient instances
const SHARED_STORAGE_KEY = 'project-nidus-auth';

/**
 * Main Platform database client
 * Uses the 'public' schema for real project data
 * Singleton pattern ensures only one instance is created
 *
 * IMPORTANT: Uses sessionStorage for auth to auto-logout on browser close
 */
export const platformDb = (() => {
  if (!platformDbInstance) {
    platformDbInstance = createClient(supabaseUrl, supabaseAnonKey, {
      db: { schema: 'public' },
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        storageKey: SHARED_STORAGE_KEY,
        storage: window.sessionStorage, // Use sessionStorage for auto-logout on browser close
      },
    });

    // Note: Multiple GoTrueClient warning is expected when using platformDb and simDb
    // This is safe as they share the same storage key and auth state
  }
  return platformDbInstance;
})();

/**
 * Simulator database client
 * Uses the 'sim' schema for simulation data
 *
 * NOTE: This creates a separate GoTrueClient instance, which will trigger
 * a warning from Supabase. This is expected and safe because:
 * 1. Both clients share the same storage key
 * 2. Auth state is synchronized between them
 * 3. They use the same sessionStorage
 *
 * IMPORTANT: Uses sessionStorage for auth to auto-logout on browser close
 */
export const simDb = (() => {
  if (!simDbInstance) {
    // Create simDb with same storage key
    simDbInstance = createClient(supabaseUrl, supabaseAnonKey, {
      db: { schema: 'sim' },
      global: {
        headers: { 'x-client-info': 'simDb' },
      },
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        storageKey: SHARED_STORAGE_KEY, // Same storage key as platformDb
        storage: window.sessionStorage, // Use sessionStorage for auto-logout on browser close
      },
    });

    // Sync auth state - when platformDb auth changes, update simDb
    platformDb.auth.onAuthStateChange((event, session) => {
      if (session) {
        simDbInstance.auth.setSession(session).catch(() => {
          // Silently handle sync errors - they're non-critical
        });
      }
    });
  }
  return simDbInstance;
})();

/**
 * Default export for backwards compatibility
 * New code should use platformDb or simDb explicitly
 */
export const supabase = platformDb;

// Legacy export for backwards compatibility
export const appDb = platformDb;

export default supabase;

/**
 * Legacy Supabase client re-export.
 *
 * IMPORTANT: The actual clients are created once in @nidus/supabase (packages/supabase).
 * This file must NOT call createClient() itself — a second set of GoTrueClient
 * instances sharing the same storageKey/sessionStorage as the package's clients
 * causes them to contend for the same browser auth lock, which can hang
 * `auth.getUser()` indefinitely (seen as a stuck "Checking authentication..." screen).
 *
 * New code should import from '@nidus/supabase' directly.
 */
export { supabase, platformDb, appDb, simDb } from '@nidus/supabase';
export { supabase as default } from '@nidus/supabase';

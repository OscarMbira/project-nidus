/**
 * Legacy Supabase client export
 * Re-exports from the new location to maintain backwards compatibility
 * New code should import from './supabase/supabaseClient' directly
 */
export { supabase, platformDb, appDb, simDb } from './supabase/supabaseClient'
export { supabase as default } from './supabase/supabaseClient'

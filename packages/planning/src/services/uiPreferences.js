/**
 * v1265 — per-user screen preferences kept in the database (SQL/v1267_ui_preferences.sql), so a
 * user's choices (e.g. Plan sheet column order) follow them to any browser. Platform, Simulator
 * and Planner users are all public.users, so the same functions serve every shell.
 * A copy in localStorage makes the screen open instantly; the database copy wins once loaded.
 * Failures never block the screen (the local copy still works).
 */
import { platformDb } from '@nidus/supabase'

const localKey = (key) => `nidus:uiPref:${key}`

export function readLocalPreference(key) {
  try { return JSON.parse(localStorage.getItem(localKey(key)) || 'null') } catch { return null }
}

function writeLocal(key, value) {
  try {
    if (value === null || value === undefined) localStorage.removeItem(localKey(key))
    else localStorage.setItem(localKey(key), JSON.stringify(value))
  } catch { /* storage unavailable */ }
}

export async function loadPreference(key) {
  try {
    const { data, error } = await platformDb.rpc('get_my_ui_preference', { p_key: key })
    if (error) return readLocalPreference(key)
    if (data !== null && data !== undefined) writeLocal(key, data)
    return data ?? readLocalPreference(key)
  } catch {
    return readLocalPreference(key)
  }
}

export async function savePreference(key, value) {
  writeLocal(key, value)
  try {
    const { error } = await platformDb.rpc('set_my_ui_preference', { p_key: key, p_value: value ?? null })
    return !error
  } catch {
    return false
  }
}

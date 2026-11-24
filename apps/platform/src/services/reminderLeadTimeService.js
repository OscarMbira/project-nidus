/**
 * Reminder Lead Times (v1352 Slice 1, D7) — Platform. Organisation overrides of how many days before a
 * date people get their reminder, per record type (public.reminder_record_types). Reads and writes go
 * through SECURITY DEFINER RPCs (SQL v1562); only PMO Admins and the account owner may save.
 */
import { platformDb } from './supabase/supabaseClient'

/** { account_id, account_name, account_code, can_manage, items: [...], created_at, updated_at, created_by_name, updated_by_name } */
export async function getReminderLeadTimes() {
  const { data, error } = await platformDb.rpc('reminder_lead_times_get')
  if (error) throw error
  return data
}

/** @param {Array<{ record_type: string, lead_days: number | null }>} changes  null = back to the default */
export async function saveReminderLeadTimes(changes) {
  const { data, error } = await platformDb.rpc('reminder_lead_times_save', { p_items: changes || [] })
  if (error) throw error
  return data
}

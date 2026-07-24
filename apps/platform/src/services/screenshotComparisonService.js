/**
 * Screenshot compare — v497 table `tc_screenshot_comparisons`. Canvas comparison can be added for pixel diff.
 */
import { platformDb } from './supabase/supabaseClient'

export async function getComparisonResult(id) {
  const { data, error } = await platformDb.from('tc_screenshot_comparisons').select('*').eq('id', id).maybeSingle()
  if (error) return { success: false, message: error.message }
  return { success: true, data }
}

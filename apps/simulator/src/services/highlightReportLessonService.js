import { supabase } from './supabaseClient'

/**
 * Highlight Report Lessons Service
 * Handles lessons learned references for Highlight Reports
 */

export async function getLessons(reportId) {
  const { data, error } = await supabase
    .from('highlight_report_lessons')
    .select('*')
    .eq('highlight_report_id', reportId)
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: true })
  if (error) throw error
  return data || []
}

export async function getLessonsByType(reportId, lessonType) {
  const { data, error } = await supabase
    .from('highlight_report_lessons')
    .select('*')
    .eq('highlight_report_id', reportId)
    .eq('lesson_type', lessonType)
    .order('display_order', { ascending: true })
  if (error) throw error
  return data || []
}

export async function addLesson(reportId, lessonData) {
  const { data: existing } = await supabase
    .from('highlight_report_lessons')
    .select('display_order')
    .eq('highlight_report_id', reportId)
    .order('display_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  const insert = {
    ...lessonData,
    highlight_report_id: reportId,
    display_order: lessonData.display_order ?? (existing?.display_order ?? 0) + 1,
  }
  const { data, error } = await supabase
    .from('highlight_report_lessons')
    .insert(insert)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateLesson(lessonId, updates) {
  const { data, error } = await supabase
    .from('highlight_report_lessons')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', lessonId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteLesson(lessonId) {
  const { error } = await supabase
    .from('highlight_report_lessons')
    .delete()
    .eq('id', lessonId)
  if (error) throw error
}

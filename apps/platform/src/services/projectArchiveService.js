/**
 * Project Archive (taxonomy §3, Project Closure > Archive) — a manually-curated log of this
 * project's key documents/records marked as archived for long-term reference after closure.
 * Deliberately a simple, PM-curated register rather than an automatic live query across RAID/
 * Change Control/Documents (those tables have no "archived" concept of their own, and adding one
 * to each would be a much bigger, more invasive change than this taxonomy leaf calls for).
 */
import { platformDb } from '@nidus/supabase'

export const ARCHIVE_CATEGORIES = [
  { value: 'document', label: 'Document' },
  { value: 'raid', label: 'RAID' },
  { value: 'change', label: 'Change Control' },
  { value: 'report', label: 'Report' },
  { value: 'benefits', label: 'Benefits' },
  { value: 'governance', label: 'Governance' },
  { value: 'other', label: 'Other' },
]

export async function listProjectArchiveItems(projectId) {
  const { data, error } = await platformDb
    .from('project_archive_items')
    .select('*, archived_by_user:archived_by (id, full_name, email)')
    .eq('project_id', projectId)
    .eq('is_deleted', false)
    .order('archived_date', { ascending: false })
  if (error) throw error
  return (data || []).map((row) => ({
    ...row,
    archived_by_label: row.archived_by_user?.full_name || row.archived_by_user?.email || null,
  }))
}

export async function getProjectArchiveItem(id) {
  const { data, error } = await platformDb
    .from('project_archive_items')
    .select('*')
    .eq('id', id)
    .eq('is_deleted', false)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function createProjectArchiveItem({ projectId, title, category, referenceUrl, archivedDate, notes }) {
  if (!title?.trim()) throw new Error('Title is required')
  const { data: { user } } = await platformDb.auth.getUser()
  const { data, error } = await platformDb
    .from('project_archive_items')
    .insert({
      project_id: projectId,
      title: title.trim(),
      category: category || 'other',
      reference_url: referenceUrl || null,
      archived_date: archivedDate || new Date().toISOString().split('T')[0],
      notes: notes || null,
      archived_by: user?.id || null,
      created_by: user?.id || null,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateProjectArchiveItem(id, { title, category, referenceUrl, archivedDate, notes }) {
  if (!title?.trim()) throw new Error('Title is required')
  const { data: { user } } = await platformDb.auth.getUser()
  const { data, error } = await platformDb
    .from('project_archive_items')
    .update({
      title: title.trim(),
      category: category || 'other',
      reference_url: referenceUrl || null,
      archived_date: archivedDate || null,
      notes: notes || null,
      updated_by: user?.id || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteProjectArchiveItem(id) {
  const { data: { user } } = await platformDb.auth.getUser()
  const { error } = await platformDb
    .from('project_archive_items')
    .update({ is_deleted: true, updated_by: user?.id || null, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

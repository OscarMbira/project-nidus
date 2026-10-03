import { platformDb } from './supabase/supabaseClient'

/** True if string looks like a UUID (path segment is id); otherwise treat as test_case_ref. */
export function isTestCaseUuidSegment(s) {
  if (s == null || typeof s !== 'string') return false
  const t = s.trim()
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(t)
}

/** Prefer human-readable ref in URLs; fall back to id when ref missing. */
export function testCaseDetailPathSegment(record) {
  if (!record) return ''
  const ref = typeof record.test_case_ref === 'string' ? record.test_case_ref.trim() : ''
  if (ref) return encodeURIComponent(ref)
  return record.id || ''
}

// ─── Test Cases ──────────────────────────────────────────────────────────────

export async function getTestCases(projectId, filters = {}) {
  if (!projectId) return []
  let query = platformDb
    .from('test_cases')
    .select(`
      *,
      suite:test_suites(id, name),
      created_by_user:users!test_cases_created_by_fkey(id, full_name, email)
    `)
    .eq('project_id', projectId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })

  if (filters.suite_id)   query = query.eq('suite_id', filters.suite_id)
  if (filters.status)     query = query.eq('status', filters.status)
  if (filters.priority)   query = query.eq('priority', filters.priority)
  if (filters.test_type)  query = query.eq('test_type', filters.test_type)
  if (filters.search) {
    const term = String(filters.search).replace(/[%_,]/g, ' ').trim()
    if (term) {
      query = query.or(
        `title.ilike.%${term}%,test_case_ref.ilike.%${term}%,description.ilike.%${term}%`,
      )
    }
  }

  const { data, error } = await query
  if (error) throw error
  return data || []
}

export async function getTestCaseById(caseIdOrRef, { withImages = false } = {}) {
  const key = typeof caseIdOrRef === 'string' ? caseIdOrRef.trim() : String(caseIdOrRef ?? '').trim()
  if (!key) throw new Error('Missing test case identifier')
  const col = isTestCaseUuidSegment(key) ? 'id' : 'test_case_ref'
  const { data, error } = await platformDb
    .from('test_cases')
    .select(`
      *,
      suite:test_suites(id, name),
      steps:test_case_steps(id, step_number, action, expected_result, test_data)
    `)
    .eq(col, key)
    .eq('is_deleted', false)
    .maybeSingle()
  if (error) throw error
  if (withImages && data?.steps) data.steps = await attachStepImages(data.steps)
  if (data?.steps) data.steps.sort((a, b) => (a.step_number || 0) - (b.step_number || 0))
  return data ?? null
}

export async function createTestCase(caseData) {
  const { steps, ...testCase } = caseData
  const { data, error } = await platformDb
    .from('test_cases')
    .insert(testCase)
    .select()
    .single()
  if (error) throw error

  // Insert steps if provided
  if (steps && steps.length > 0) {
    await upsertTestCaseSteps(data.id, steps)
  }
  return data
}

export async function updateTestCase(caseId, updates) {
  const { steps, ...caseUpdates } = updates
  const { data, error } = await platformDb
    .from('test_cases')
    .update({ ...caseUpdates, updated_at: new Date().toISOString() })
    .eq('id', caseId)
    .select()
    .single()
  if (error) throw error

  if (steps !== undefined) {
    await upsertTestCaseSteps(caseId, steps)
  }
  return data
}

export async function deleteTestCase(caseId, deletedBy) {
  const { data, error } = await platformDb
    .from('test_cases')
    .update({ is_deleted: true, deleted_at: new Date().toISOString(), deleted_by: deletedBy })
    .eq('id', caseId)
    .select()
    .single()
  if (error) throw error
  return data
}

// ─── Test Case Steps ─────────────────────────────────────────────────────────

export async function getTestCaseSteps(caseId) {
  const { data, error } = await platformDb
    .from('test_case_steps')
    .select('*')
    .eq('test_case_id', caseId)
    .order('step_number', { ascending: true })
  if (error) throw error
  return data || []
}

export async function upsertTestCaseSteps(caseId, steps) {
  // Delete existing steps and re-insert (simplest approach for step reordering)
  const { error: deleteError } = await platformDb
    .from('test_case_steps')
    .delete()
    .eq('test_case_id', caseId)
  if (deleteError) throw deleteError

  if (!steps || steps.length === 0) return []

  const stepsToInsert = steps.map((step, index) => ({
    test_case_id:    caseId,
    step_number:     index + 1,
    action:          step.action,
    expected_result: step.expected_result || null,
    test_data:       step.test_data || null,
  }))

  const { data, error } = await platformDb
    .from('test_case_steps')
    .insert(stepsToInsert)
    .select()
  if (error) throw error
  await saveStepImages(data || [], steps)
  return data
}

const STEP_IMAGE_BUCKET = 'test-case-attachments'
const STEP_IMAGE_FIELDS = ['action_images', 'expected_result_images', 'test_data_images']

function storedImages(images) {
  return (Array.isArray(images) ? images : [])
    .map((item) => ({
      file_name: item?.file_name || 'image',
      file_path: item?.file_path || '',
      file_type: item?.file_type || null,
    }))
    .filter((item) => item.file_path)
}

export async function withStepImagePreviews(images) {
  const list = Array.isArray(images) ? images : []
  const paths = [...new Set(list.map((item) => item?.file_path).filter(Boolean))]
  const signedByPath = {}
  if (paths.length) {
    const { data } = await platformDb.storage.from(STEP_IMAGE_BUCKET).createSignedUrls(paths, 3600)
    for (const item of data || []) {
      if (item?.path && item.signedUrl && !item.error) signedByPath[item.path] = item.signedUrl
    }
  }
  return list.map((item) => ({
    ...item,
    preview_url: signedByPath[item.file_path]
      || (typeof item?.preview_url === 'string' && /^https?:\/\//i.test(item.preview_url) ? item.preview_url : null),
  }))
}

async function attachStepImages(steps) {
  const list = steps || []
  const ids = list.map((step) => step.id).filter(Boolean)
  if (!ids.length) return list
  const { data, error } = await platformDb
    .from('test_case_steps')
    .select('id, action_images, expected_result_images, test_data_images')
    .in('id', ids)
  if (error) return list
  const byId = new Map((data || []).map((row) => [row.id, row]))
  const merged = list.map((step) => {
    const extra = byId.get(step.id)
    if (!extra) return step
    return {
      ...step,
      action_images: extra.action_images || [],
      expected_result_images: extra.expected_result_images || [],
      test_data_images: extra.test_data_images || [],
    }
  })
  const flat = merged.flatMap((step) => STEP_IMAGE_FIELDS.flatMap((field) => step[field] || []))
  const signed = await withStepImagePreviews(flat)
  const previewByPath = new Map(signed.map((item) => [item.file_path, item.preview_url]))
  return merged.map((step) => {
    const next = { ...step }
    for (const field of STEP_IMAGE_FIELDS) {
      next[field] = (step[field] || []).map((item) => ({
        ...item,
        preview_url: previewByPath.get(item.file_path) || null,
      }))
    }
    return next
  })
}

async function saveStepImages(inserted, sourceSteps) {
  const rows = inserted || []
  let any = false
  for (const row of rows) {
    const source = sourceSteps[(row.step_number || 1) - 1] || {}
    if (STEP_IMAGE_FIELDS.some((field) => storedImages(source[field]).length)) any = true
  }
  if (!any) return
  for (const row of rows) {
    const source = sourceSteps[(row.step_number || 1) - 1] || {}
    const payload = {
      action_images: storedImages(source.action_images),
      expected_result_images: storedImages(source.expected_result_images),
      test_data_images: storedImages(source.test_data_images),
    }
    const { error } = await platformDb.from('test_case_steps').update(payload).eq('id', row.id)
    if (error) {
      throw new Error('Images could not be saved. Run SQL/v1166_test_case_step_images.sql in Supabase, then save again.')
    }
  }
}

export async function uploadTestCaseStepImage({ projectId, file, fieldKey }) {
  if (!projectId) throw new Error('Select a project before adding an image.')
  const safeName = String(file.name || 'image.png').replace(/[^a-zA-Z0-9._-]/g, '_')
  const folder = String(fieldKey || 'field').replace(/[^a-z0-9_-]/gi, '')
  const path = `${projectId}/steps/${folder}/${Date.now()}_${safeName}`
  const { error } = await platformDb.storage.from(STEP_IMAGE_BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type || undefined,
  })
  if (error) {
    throw new Error(error.message || 'Image upload failed. Run SQL/v1166_test_case_step_images.sql if the image store is missing.')
  }
  const [signed] = await withStepImagePreviews([{
    file_name: file.name,
    file_path: path,
    file_type: file.type || null,
  }])
  return signed
}

export async function removeTestCaseStepImage(filePath) {
  if (!filePath) return
  await platformDb.storage.from(STEP_IMAGE_BUCKET).remove([filePath])
}

// ─── Batch Import ─────────────────────────────────────────────────────────────

export async function batchCreateTestCases(testCases) {
  const results = { created: 0, failed: 0, errors: [] }
  const BATCH_SIZE = 50

  for (let i = 0; i < testCases.length; i += BATCH_SIZE) {
    const batch = testCases.slice(i, i + BATCH_SIZE)
    const { data, error } = await platformDb
      .from('test_cases')
      .insert(batch)
      .select('id, test_case_ref, title')

    if (error) {
      results.failed += batch.length
      results.errors.push({ rows: `${i + 1}-${i + batch.length}`, message: error.message })
    } else {
      results.created += data.length
    }
  }
  return results
}

// ─── Statistics ───────────────────────────────────────────────────────────────

export async function getTestCaseStats(projectId) {
  const { data, error } = await platformDb
    .from('test_cases')
    .select('status, priority, test_type')
    .eq('project_id', projectId)
    .eq('is_deleted', false)
  if (error) throw error

  const stats = { total: data.length, byStatus: {}, byPriority: {}, byType: {} }
  data.forEach(({ status, priority, test_type }) => {
    stats.byStatus[status]    = (stats.byStatus[status] || 0) + 1
    stats.byPriority[priority] = (stats.byPriority[priority] || 0) + 1
    stats.byType[test_type]   = (stats.byType[test_type] || 0) + 1
  })
  return stats
}

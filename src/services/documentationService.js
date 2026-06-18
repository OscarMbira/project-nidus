/**
 * Documentation Service — v733
 * Fetches guide index from Supabase DB and content from Supabase Storage.
 * Falls back to /Documentation/{filename} (public/) if Storage is unreachable.
 */
import { platformDb } from './supabase/supabaseClient';

const STORAGE_BASE = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/documentation`;

/** Build the Supabase Storage public URL for a guide file. */
function storageUrl(system, module, fileName) {
  return `${STORAGE_BASE}/${system}/${module}/${fileName}`;
}

/**
 * Fetch all distinct modules for a system, ordered by the minimum sort_order
 * of their guides. Returns an array of module slug strings.
 */
export async function getModules(system) {
  const normalizedSystem = normalizeSystem(system);
  const { data, error } = await platformDb
    .from('documentation_guides')
    .select('module, sort_order')
    .eq('system', normalizedSystem)
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) throw new Error(`Failed to fetch modules: ${error.message}`);

  // Deduplicate preserving first-seen order (already sorted by sort_order)
  const seen = new Set();
  return (data || [])
    .map(r => r.module)
    .filter(m => { if (seen.has(m)) return false; seen.add(m); return true; });
}

/**
 * Fetch all active guides for a system, optionally filtered by module.
 * Returns the raw rows from documentation_guides.
 */
export async function getDocumentationGuides(system, module = null) {
  const normalizedSystem = normalizeSystem(system);
  let query = platformDb
    .from('documentation_guides')
    .select('*')
    .eq('system', normalizedSystem)
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (module) query = query.eq('module', module);

  const { data, error } = await query;
  if (error) throw new Error(`Failed to fetch guides: ${error.message}`);
  return data || [];
}

/**
 * Fetch a single guide by its slug and system.
 */
export async function getGuideById(system, guideId) {
  const normalizedSystem = normalizeSystem(system);
  const { data, error } = await platformDb
    .from('documentation_guides')
    .select('*')
    .eq('system', normalizedSystem)
    .eq('guide_id', guideId)
    .eq('is_active', true)
    .maybeSingle();

  if (error) throw new Error(`Failed to fetch guide: ${error.message}`);
  return data;
}

/**
 * Fetch distinct categories for a system + module combination.
 */
export async function getCategories(system, module = null) {
  const guides = await getDocumentationGuides(system, module);
  const seen = new Set();
  return guides
    .map(g => g.category)
    .filter(c => { if (seen.has(c)) return false; seen.add(c); return true; });
}

/**
 * Load the markdown content of a guide.
 * Primary: Supabase Storage public URL.
 * Fallback: /Documentation/{fileName} (public/ static files).
 */
export async function loadDocumentationFile(fileName, system = 'platform', module = 'general') {
  const primaryUrl = storageUrl(system, module, fileName);
  const fallbackUrl = `/Documentation/${fileName}`;

  for (const url of [primaryUrl, fallbackUrl]) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const text = await res.text();
      if (text.trim().startsWith('<!') || text.trim().startsWith('<html')) continue;
      return text;
    } catch {
      continue;
    }
  }

  throw new Error(`Documentation file not found: ${fileName}`);
}

/**
 * Upsert a guide row in documentation_guides.
 * Used by the admin editor.
 */
export async function saveGuideMetadata(guide) {
  const { data, error } = await platformDb
    .from('documentation_guides')
    .upsert(guide, { onConflict: 'guide_id,system' })
    .select()
    .single();

  if (error) throw new Error(`Failed to save guide: ${error.message}`);
  return data;
}

/**
 * Soft-delete: set is_active = false.
 */
export async function deactivateGuide(id) {
  const { error } = await platformDb
    .from('documentation_guides')
    .update({ is_active: false })
    .eq('id', id);

  if (error) throw new Error(`Failed to deactivate guide: ${error.message}`);
}

/**
 * Hard-delete: remove the DB row.
 * Caller is responsible for also deleting the Storage file.
 */
export async function deleteGuide(id) {
  const { error } = await platformDb
    .from('documentation_guides')
    .delete()
    .eq('id', id);

  if (error) throw new Error(`Failed to delete guide: ${error.message}`);
}

/**
 * Upload a .md file to Supabase Storage.
 * Requires a service-role key — call only from admin context.
 */
export async function uploadDocumentationFile(system, module, fileName, content) {
  const path = `${system}/${module}/${fileName}`;
  const { error } = await platformDb.storage
    .from('documentation')
    .upload(path, new Blob([content], { type: 'text/markdown' }), {
      upsert: true,
      contentType: 'text/markdown',
    });

  if (error) throw new Error(`Failed to upload file: ${error.message}`);
  return storageUrl(system, module, fileName);
}

/**
 * Delete a file from Supabase Storage.
 */
export async function deleteDocumentationFile(system, module, fileName) {
  const path = `${system}/${module}/${fileName}`;
  const { error } = await platformDb.storage
    .from('documentation')
    .remove([path]);

  if (error) throw new Error(`Failed to delete file from Storage: ${error.message}`);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalizeSystem(system) {
  if (system === 'pm' || system === 'pm-platform') return 'platform';
  return system === 'simulator' ? 'simulator' : 'platform';
}

export default {
  getModules,
  getDocumentationGuides,
  getGuideById,
  getCategories,
  loadDocumentationFile,
  saveGuideMetadata,
  deactivateGuide,
  deleteGuide,
  uploadDocumentationFile,
  deleteDocumentationFile,
};

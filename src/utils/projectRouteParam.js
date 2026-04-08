/**
 * Platform project URLs use /platform/projects/:key where :key is project_code
 * when available, or id (UUID) as fallback. Supports legacy UUID bookmarks.
 */

import { platformDb } from '../services/supabase/supabaseClient';

/** Loose UUID (matches legacy URLs and common generators) */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * @param {string | undefined | null} s
 * @returns {boolean}
 */
export function looksLikeProjectUuid(s) {
  if (s == null || typeof s !== 'string') return false;
  const t = s.trim();
  return UUID_RE.test(t);
}

/**
 * Decode route segment (React Router usually passes decoded params; this is safe if double-encoded).
 * @param {string | undefined | null} raw
 * @returns {string}
 */
export function decodeProjectRouteSegment(raw) {
  if (raw == null || raw === '') return '';
  try {
    return decodeURIComponent(String(raw).trim());
  } catch {
    return String(raw).trim();
  }
}

/**
 * Segment for URLs: prefer project_code, else id.
 * @param {{ id?: string, project_code?: string | null } | null | undefined} project
 * @returns {string}
 */
export function projectPathSegmentFromProject(project) {
  if (!project) return '';
  const code = project.project_code != null && String(project.project_code).trim() !== ''
    ? String(project.project_code).trim()
    : null;
  const key = code || project.id || '';
  return key ? encodeURIComponent(key) : '';
}

/**
 * `/platform/projects/<encodedKey>[/extra...]`
 * @param {string} routeKeyDecoded — decoded segment (code or uuid), not pre-encoded
 * @param {...string} extraSegments — not encoded (e.g. 'cms', 'edit')
 * @returns {string}
 */
export function platformProjectPath(routeKeyDecoded, ...extraSegments) {
  if (!routeKeyDecoded) return '/platform/projects';
  const base = `/platform/projects/${encodeURIComponent(routeKeyDecoded)}`;
  if (!extraSegments.length) return base;
  return [base, ...extraSegments].join('/');
}

/**
 * Resolve URL segment to projects.id (UUID).
 * @param {string} segment — decoded project code or uuid
 * @returns {Promise<string | null>}
 */
export async function resolveProjectIdFromRouteSegment(segment) {
  const key = String(segment || '').trim();
  if (!key) return null;
  if (looksLikeProjectUuid(key)) return key;

  const { data, error } = await platformDb
    .from('projects')
    .select('id')
    .eq('project_code', key)
    .eq('is_deleted', false)
    .maybeSingle();

  if (error || !data?.id) return null;
  return data.id;
}

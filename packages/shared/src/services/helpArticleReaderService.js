/**
 * Read one published help article by slug (v1345 PD4 — target of field help "Learn more").
 * public.help_articles (SQL v58) is reference content, read through the Platform client by
 * every app; its RLS already limits non-admins to published, non-deleted articles.
 */
import { platformDb } from '@nidus/supabase'

export async function getPublishedHelpArticle(slug, { db = platformDb } = {}) {
  const key = String(slug || '').trim()
  if (!key) return { success: false, error: 'No article given' }
  try {
    const { data, error } = await db
      .from('help_articles')
      .select('id, title, excerpt, content, slug, updated_at')
      .eq('slug', key)
      .eq('is_published', true)
      .eq('is_active', true)
      .maybeSingle()
    if (error) throw error
    if (!data) return { success: false, error: 'Article not found' }
    return { success: true, data }
  } catch (e) {
    return { success: false, error: e?.message || 'Could not load the article' }
  }
}

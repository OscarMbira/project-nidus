/**
 * v1241 — Read the brand site's data from Supabase's REST endpoint with the public anon key.
 * Used both at build time (scripts/prerender.mjs, Node) and in the browser (refresh after load).
 * RLS only returns active rows to anon. No fallback data on failure (rule 26): the caller decides
 * — the build fails loudly, the browser keeps the prerendered content or shows an error state.
 *
 * Amendment A: also the header/footer links (site_nav_links) and the common pages (site_pages,
 * with their Markdown body).
 */

import { fetchHeaderSettings } from '@nidus/shared/site/siteChrome.js'

export const SECTION_COLUMNS =
  'id,page_slug,section_key,section_type,heading,subheading,body,primary_cta,secondary_cta,image_url,image_alt,items,sort_order,is_active'

export const BLOG_POST_COLUMNS =
  'id,slug,title,summary,body_md,cover_image_url,cover_image_alt,author_name,author_role,category_id,published_at,updated_at'
export const BLOG_ATTACHMENT_COLUMNS = 'id,post_id,display_name,public_url,mime_type,size_bytes,is_gated,sort_order'

async function getRows(baseUrl, anonKey, table, select) {
  const url = `${baseUrl.replace(/\/$/, '')}/rest/v1/${table}?select=${encodeURIComponent(select)}`
  const res = await fetch(url, { headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` } })
  if (!res.ok) throw new Error(`${table}: HTTP ${res.status} ${await res.text().catch(() => '')}`.trim())
  return res.json()
}

export async function fetchSiteData({ baseUrl, anonKey }) {
  if (!baseUrl || !anonKey) throw new Error('VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are not set')
  const [products, content, navLinks, pages, sections, blogPosts, blogCategories, blogAttachments, headers] = await Promise.all([
    getRows(baseUrl, anonKey, 'site_products',
      'slug,name,tagline,description,audience,landing_url,sign_in_url,sign_up_url,pricing_url,docs_url,icon_key,accent_key,sort_order,is_active'),
    getRows(baseUrl, anonKey, 'site_content', 'content_key,content_value,is_active'),
    getRows(baseUrl, anonKey, 'site_nav_links', 'link_key,nav_group,label,description,page_slug,url,sort_order,is_active'),
    getRows(baseUrl, anonKey, 'site_pages', 'slug,title,summary,body_md,page_kind,sort_order,is_active'),
    // v1262: published columns only (anon has no access to the draft column).
    getRows(baseUrl, anonKey, 'site_sections', SECTION_COLUMNS),
    // v1263 blog: RLS returns published, due, non-archived posts; attachments never expose file paths.
    getRows(baseUrl, anonKey, 'site_blog_posts', BLOG_POST_COLUMNS),
    getRows(baseUrl, anonKey, 'site_blog_categories', 'id,slug,name,description,sort_order,is_active'),
    getRows(baseUrl, anonKey, 'site_blog_attachments', BLOG_ATTACHMENT_COLUMNS),
    // v1264: header colours + primary button (built-in colours if unavailable).
    fetchHeaderSettings(baseUrl, anonKey),
  ])
  return { products, content, navLinks, pages, sections, blogPosts, blogCategories, blogAttachments, headers }
}

/** Contact form → site_submit_enquiry (validated and rate-limited in the database, SQL v1260). */
export async function submitEnquiry({ baseUrl, anonKey }, payload) {
  const res = await fetch(`${baseUrl.replace(/\/$/, '')}/rest/v1/rpc/site_submit_enquiry`, {
    method: 'POST',
    headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      p_full_name: payload.fullName,
      p_email: payload.email,
      p_message: payload.message,
      p_topic: payload.topic || 'general',
      p_organisation: payload.organisation || null,
      p_product_slug: payload.productSlug || null,
      p_page_url: payload.pageUrl || null,
      p_website: payload.website || null,
    }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body?.message || 'Your message could not be sent. Please try again.')
  return body
}

/**
 * v1262 — drafts for an admin's preview link (?preview=<token>). The database checks the token
 * (60-minute expiry) and returns every page's sections with drafts applied. Throws on a bad or
 * expired link; the caller shows that message instead of the published page.
 */
export async function fetchPreviewSections({ baseUrl, anonKey }, token) {
  const res = await fetch(`${baseUrl.replace(/\/$/, '')}/rest/v1/rpc/site_preview_sections`, {
    method: 'POST',
    headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_token: token }),
  })
  const body = await res.json().catch(() => null)
  if (!res.ok) throw new Error(body?.message || 'This preview link could not be opened.')
  return Array.isArray(body) ? body : []
}

async function callRpc({ baseUrl, anonKey }, fn, params, fallbackMessage) {
  const res = await fetch(`${baseUrl.replace(/\/$/, '')}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  const body = await res.json().catch(() => null)
  if (!res.ok) throw new Error(body?.message || fallbackMessage)
  return body
}

/** v1263 — one blog post with its drafts, for an admin preview link. Returns { post, attachments }. */
export const fetchPreviewBlogPost = (env, token, slug) =>
  callRpc(env, 'site_preview_blog_post', { p_token: token, p_slug: slug }, 'This preview link could not be opened.')

/** v1263 — 'published' | 'archived' | 'missing' for a /blog/<slug> address that has no visible post. */
export const fetchBlogSlugStatus = (env, slug) =>
  callRpc(env, 'site_blog_slug_status', { p_slug: slug }, 'missing')

/**
 * v1263 — email-gated download: the site-download Edge Function records the visitor's details
 * (Site Enquiries, topic Download) and returns a 5-minute link. Returns { url, fileName }.
 */
export async function requestGatedDownload({ baseUrl, anonKey }, payload) {
  const res = await fetch(`${baseUrl.replace(/\/$/, '')}/functions/v1/site-download`, {
    method: 'POST',
    headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const body = await res.json().catch(() => null)
  if (!res.ok || !body?.url) throw new Error(body?.error || 'The download could not be prepared. Please try again.')
  return body
}

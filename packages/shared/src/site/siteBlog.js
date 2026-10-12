/**
 * v1263 — Brand-site blog helpers (public.site_blog_*, SQL v1263). Pure; used by the brand site
 * (render + prerender) and its tests. The Admin app replicates the file rules and validators in
 * its publicSiteServices.js (separate codebase, rule 34.4).
 */

export const BLOG_PAGE_SIZE = 12
export const BLOG_ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024

/** Allowed attachment types: MIME → short label shown to readers. No executables, archives, HTML or SVG. */
export const BLOG_ATTACHMENT_TYPES = {
  'application/pdf': 'PDF',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PowerPoint',
  'text/plain': 'Text',
  'text/csv': 'CSV',
  'image/png': 'PNG image',
  'image/jpeg': 'JPG image',
  'image/webp': 'WebP image',
}

export const blogFileTypeLabel = (mime) => BLOG_ATTACHMENT_TYPES[mime] || 'File'

export function formatFileSize(bytes) {
  const n = Number(bytes) || 0
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

export const BLOG_SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/

/** Address for a title: "How to set up a PMO!" → "how-to-set-up-a-pmo". */
export function slugifyTitle(title) {
  return String(title || '')
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    .slice(0, 80).replace(/-+$/, '')
}

/** A post visitors may see right now (the database applies the same rule). */
export function isPostVisible(post, now = new Date()) {
  if (!post?.published_at || post.archived_at) return false
  return new Date(post.published_at).getTime() <= now.getTime()
}

/** Visible posts, newest first, optionally of one category (category slug). */
export function listPosts(posts, categories, { category = null, now = new Date() } = {}) {
  const cat = category ? (categories || []).find((c) => c.slug === category) : null
  return (posts || [])
    .filter((p) => isPostVisible(p, now))
    .filter((p) => !category || (cat && p.category_id === cat.id))
    .sort((a, b) => new Date(b.published_at) - new Date(a.published_at) || String(a.title).localeCompare(String(b.title)))
}

/** One page of a list (1-based) plus the page count. */
export function pageOf(list, page = 1, size = BLOG_PAGE_SIZE) {
  const pages = Math.max(1, Math.ceil((list?.length || 0) / size))
  const current = Math.min(Math.max(1, Number(page) || 1), pages)
  return { items: (list || []).slice((current - 1) * size, current * size), page: current, pages }
}

/** Attachments of one post in display order. */
export const attachmentsFor = (attachments, postId) =>
  (attachments || []).filter((a) => a.post_id === postId).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))

/** Checks before uploading a file. Returns an error message or null. */
export function checkAttachmentFile(file) {
  if (!file) return 'Choose a file'
  if (!BLOG_ATTACHMENT_TYPES[file.type]) return 'Use a PDF, Word, Excel, PowerPoint, text, CSV or image file'
  if (file.size > BLOG_ATTACHMENT_MAX_BYTES) return 'Files can be up to 10 MB'
  return null
}

/** Download-form checks (the database repeats them). Returns an error message or null. */
export function validateDownloadForm(f) {
  if (!String(f?.fullName || '').trim()) return 'Please enter your name.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(f?.email || '').trim())) return 'Please enter a valid email address.'
  return null
}

/** schema.org BlogPosting data for one post. */
export function blogPostingJsonLd(post, { url, publisher = 'Project Nidus' } = {}) {
  if (!post) return null
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    ...(post.summary ? { description: post.summary } : {}),
    ...(post.cover_image_url ? { image: post.cover_image_url } : {}),
    datePublished: post.published_at,
    ...(post.updated_at ? { dateModified: post.updated_at } : {}),
    ...(post.author_name ? { author: { '@type': 'Person', name: post.author_name } } : {}),
    publisher: { '@type': 'Organization', name: publisher },
    ...(url ? { mainEntityOfPage: url, url } : {}),
  }
}

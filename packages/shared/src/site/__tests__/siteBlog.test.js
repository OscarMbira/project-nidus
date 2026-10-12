import { describe, it, expect } from 'vitest'
import {
  slugifyTitle,
  BLOG_SLUG_RE,
  isPostVisible,
  listPosts,
  pageOf,
  attachmentsFor,
  checkAttachmentFile,
  validateDownloadForm,
  formatFileSize,
  blogFileTypeLabel,
  blogPostingJsonLd,
} from '../siteBlog.js'

const now = new Date('2026-10-12T12:00:00Z')
const cats = [{ id: 'c1', slug: 'pmo' }, { id: 'c2', slug: 'planning' }]
const posts = [
  { id: 'a', title: 'Older', category_id: 'c1', published_at: '2026-10-01T00:00:00Z' },
  { id: 'b', title: 'Newer', category_id: 'c2', published_at: '2026-10-10T00:00:00Z' },
  { id: 'c', title: 'Scheduled', category_id: 'c1', published_at: '2026-10-20T00:00:00Z' },
  { id: 'd', title: 'Archived', category_id: 'c1', published_at: '2026-09-01T00:00:00Z', archived_at: '2026-10-05T00:00:00Z' },
  { id: 'e', title: 'Draft', category_id: 'c1', published_at: null },
]

describe('slugs', () => {
  it('turns titles into valid addresses', () => {
    expect(slugifyTitle('How to set up a PMO!')).toBe('how-to-set-up-a-pmo')
    expect(slugifyTitle('Café & Gantt — 2026')).toBe('cafe-and-gantt-2026')
    expect(BLOG_SLUG_RE.test(slugifyTitle('  --Spaces  everywhere-- '))).toBe(true)
    expect(slugifyTitle('x'.repeat(200)).length).toBeLessThanOrEqual(80)
  })
})

describe('visibility and lists', () => {
  it('hides drafts, scheduled and archived posts', () => {
    expect(posts.filter((p) => isPostVisible(p, now)).map((p) => p.id)).toEqual(['a', 'b'])
  })

  it('lists newest first and filters by category', () => {
    expect(listPosts(posts, cats, { now }).map((p) => p.id)).toEqual(['b', 'a'])
    expect(listPosts(posts, cats, { category: 'pmo', now }).map((p) => p.id)).toEqual(['a'])
    expect(listPosts(posts, cats, { category: 'unknown', now })).toEqual([])
  })

  it('pages a list and clamps the page number', () => {
    const list = Array.from({ length: 25 }, (_, i) => i)
    expect(pageOf(list, 1, 12)).toMatchObject({ page: 1, pages: 3 })
    expect(pageOf(list, 3, 12).items).toEqual([24])
    expect(pageOf(list, 9, 12).page).toBe(3)
    expect(pageOf([], 1).pages).toBe(1)
  })

  it('orders a post\'s attachments', () => {
    expect(attachmentsFor([{ post_id: 'a', sort_order: 2, id: 2 }, { post_id: 'a', sort_order: 1, id: 1 }, { post_id: 'b', id: 3 }], 'a').map((x) => x.id)).toEqual([1, 2])
  })
})

describe('files and forms', () => {
  it('accepts office/PDF/images up to 10 MB and refuses others', () => {
    expect(checkAttachmentFile({ type: 'application/pdf', size: 1000 })).toBeNull()
    expect(checkAttachmentFile({ type: 'application/zip', size: 1000 })).toMatch(/PDF/)
    expect(checkAttachmentFile({ type: 'image/svg+xml', size: 10 })).toMatch(/PDF/)
    expect(checkAttachmentFile({ type: 'application/pdf', size: 11 * 1024 * 1024 })).toMatch(/10 MB/)
  })

  it('formats sizes and type labels', () => {
    expect(formatFileSize(500)).toBe('500 B')
    expect(formatFileSize(245760)).toBe('240 KB')
    expect(formatFileSize(3 * 1024 * 1024)).toBe('3.0 MB')
    expect(blogFileTypeLabel('application/pdf')).toBe('PDF')
  })

  it('validates the download form', () => {
    expect(validateDownloadForm({ fullName: 'Jo', email: 'jo@example.com' })).toBeNull()
    expect(validateDownloadForm({ fullName: '', email: 'jo@example.com' })).toMatch(/name/)
    expect(validateDownloadForm({ fullName: 'Jo', email: 'jo@' })).toMatch(/email/)
  })
})

describe('blogPostingJsonLd', () => {
  it('describes the post for search engines', () => {
    const ld = blogPostingJsonLd({ title: 'T', summary: 'S', published_at: '2026-10-01', author_name: 'Jo', cover_image_url: 'https://x/c.png' }, { url: 'https://n/blog/t' })
    expect(ld).toMatchObject({ '@type': 'BlogPosting', headline: 'T', description: 'S', image: 'https://x/c.png', author: { name: 'Jo' }, url: 'https://n/blog/t' })
  })
})

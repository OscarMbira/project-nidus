// @vitest-environment jsdom
// v1263 — blog list, post page, downloads (open + gated), archived notice, preview and routes.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import App from '../App.jsx'
import { matchRoute, routePaths, routeMeta } from '../lib/routes.js'

const cats = [
  { id: 'c-pmo', slug: 'pmo', name: 'PMO', sort_order: 10, is_active: true },
  { id: 'c-plan', slug: 'planning', name: 'Planning', sort_order: 20, is_active: true },
]
const mkPost = (n, extra = {}) => ({
  id: `p${n}`, slug: `post-${n}`, title: `Post ${n}`, summary: `Summary ${n}`, body_md: `## Heading ${n}\n\nBody ${n}`,
  author_name: 'Nidus Team', category_id: 'c-plan', published_at: `2026-09-${String(n).padStart(2, '0')}T08:00:00Z`, ...extra,
})
const posts = [mkPost(1, { category_id: 'c-pmo' }), ...Array.from({ length: 13 }, (_, i) => mkPost(i + 2))]
const attachments = [
  { id: 'a-open', post_id: 'p1', display_name: 'Checklist', public_url: 'https://cdn.test/blog/checklist.pdf', mime_type: 'application/pdf', size_bytes: 245760, is_gated: false, sort_order: 1 },
  { id: 'a-gated', post_id: 'p1', display_name: 'Planning guide', public_url: null, mime_type: 'application/pdf', size_bytes: 1048576, is_gated: true, sort_order: 2 },
]
const data = {
  products: [{ slug: 'platform', name: 'Platform', landing_url: 'https://p/', sort_order: 1, is_active: true }],
  content: [{ content_key: 'brand.url', content_value: 'https://nidus.test', is_active: true }],
  navLinks: [],
  pages: [
    { slug: 'blog', title: 'Blog', summary: 'Ideas for project people', body_md: 'Articles are on their way.', page_kind: 'page', is_active: true },
    { slug: 'privacy', title: 'Privacy Policy', summary: '', body_md: '', page_kind: 'legal', is_active: true },
  ],
  sections: [],
  blogPosts: posts,
  blogCategories: cats,
  blogAttachments: attachments,
}

const tableResponse = (url) => {
  const table = String(url).match(/rest\/v1\/([a-z_]+)/)?.[1]
  const map = { site_products: data.products, site_content: data.content, site_nav_links: [], site_pages: data.pages, site_sections: [],
    site_blog_posts: data.blogPosts, site_blog_categories: data.blogCategories, site_blog_attachments: data.blogAttachments }
  return { ok: true, json: async () => map[table] || [] }
}

beforeEach(() => {
  vi.restoreAllMocks()
  vi.stubGlobal('fetch', vi.fn(async (url) => tableResponse(url)))
})
afterEach(() => window.history.replaceState({}, '', '/'))

describe('routes', () => {
  it('matches the list and posts, and prerenders every post', () => {
    expect(matchRoute('/blog', data).kind).toBe('blog')
    expect(matchRoute('/blog/post-1', data)).toMatchObject({ kind: 'blogPost', slug: 'post-1', post: { id: 'p1' } })
    expect(matchRoute('/blog/gone', data)).toMatchObject({ kind: 'blogPost', post: null })
    const paths = routePaths(data)
    expect(paths).toContain('blog')
    expect(paths).toContain('blog/post-14')
    expect(paths.filter((p) => p === 'blog')).toHaveLength(1)
  })

  it('gives posts their own title, description and share image', () => {
    const meta = routeMeta(matchRoute('/blog/post-1', { ...data, blogPosts: [mkPost(1, { cover_image_url: 'https://cdn.test/c.png' })] }), data)
    expect(meta).toMatchObject({ title: 'Post 1 — Project Nidus', description: 'Summary 1', image: 'https://cdn.test/c.png', type: 'article' })
  })
})

describe('blog list', () => {
  it('shows 12 newest posts per page with paging', () => {
    render(<App initialData={data} path="/blog" />)
    const cards = screen.getAllByTestId('blog-card')
    expect(cards).toHaveLength(12)
    expect(cards[0].getAttribute('href')).toBe('/blog/post-14')
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    expect(screen.getAllByTestId('blog-card')).toHaveLength(2)
    expect(screen.getByText('Page 2 of 2')).toBeTruthy()
  })

  it('filters by category', () => {
    render(<App initialData={data} path="/blog" />)
    fireEvent.click(screen.getByRole('button', { name: 'PMO' }))
    const cards = screen.getAllByTestId('blog-card')
    expect(cards).toHaveLength(1)
    expect(cards[0].getAttribute('href')).toBe('/blog/post-1')
  })

  it('shows the blog page text when there are no posts yet', () => {
    render(<App initialData={{ ...data, blogPosts: [] }} path="/blog" />)
    expect(screen.getByText('Articles are on their way.')).toBeTruthy()
  })

  it('renders on the server', () => {
    expect(renderToString(<App initialData={data} path="/blog" />)).toContain('Post 14')
  })
})

describe('blog post', () => {
  it('shows the article and its downloads', () => {
    render(<App initialData={data} path="/blog/post-1" />)
    expect(screen.getByRole('heading', { level: 1, name: 'Post 1' })).toBeTruthy()
    expect(screen.getByRole('heading', { level: 2, name: 'Heading 1' })).toBeTruthy()
    expect(screen.getByText(/By Nidus Team/)).toBeTruthy()
    const open = screen.getAllByRole('link', { name: /Download/ }).find((a) => a.getAttribute('href') === 'https://cdn.test/blog/checklist.pdf')
    expect(open).toBeTruthy()
    expect(screen.getByText(/PDF · 1.0 MB · email required/)).toBeTruthy()
  })

  it('gated download: validates, then returns a link from the download function', async () => {
    render(<App initialData={data} path="/blog/post-1" />)
    fireEvent.click(screen.getByRole('button', { name: /Download/ }))
    fireEvent.click(screen.getByRole('button', { name: /Get the download/ }))
    expect(screen.getByRole('alert').textContent).toMatch(/name/)
    expect(screen.getByRole('link', { name: 'Privacy Policy' }).getAttribute('href')).toBe('/privacy')

    fetch.mockImplementation(async (url, opts) => {
      if (String(url).includes('/functions/v1/site-download')) {
        const body = JSON.parse(opts.body)
        expect(body).toMatchObject({ attachmentId: 'a-gated', fullName: 'Jo', email: 'jo@example.com', marketingOptIn: true })
        return { ok: true, json: async () => ({ url: 'https://signed.test/guide.pdf', fileName: 'Planning guide' }) }
      }
      return tableResponse(url)
    })
    fireEvent.change(screen.getByLabelText(/Name/), { target: { value: 'Jo' } })
    fireEvent.change(screen.getByLabelText(/Email/), { target: { value: 'jo@example.com' } })
    fireEvent.click(screen.getByLabelText(/Send me Project Nidus news/))
    fireEvent.click(screen.getByRole('button', { name: /Get the download/ }))
    const link = await screen.findByRole('link', { name: /Download Planning guide/ })
    expect(link.getAttribute('href')).toBe('https://signed.test/guide.pdf')
  })

  it('shows "no longer available" for an archived post', async () => {
    fetch.mockImplementation(async (url) => (String(url).includes('rpc/site_blog_slug_status')
      ? { ok: true, json: async () => 'archived' }
      : tableResponse(url)))
    render(<App initialData={data} path="/blog/retired-post" />)
    expect(await screen.findByRole('heading', { name: 'This article is no longer available' })).toBeTruthy()
  })

  it('preview link shows the draft post with a banner', async () => {
    window.history.replaceState({}, '', '/blog/post-1?preview=' + 'c'.repeat(48))
    fetch.mockImplementation(async (url) => (String(url).includes('rpc/site_preview_blog_post')
      ? { ok: true, json: async () => ({ post: mkPost(1, { title: 'Draft title' }), attachments: [] }) }
      : tableResponse(url)))
    render(<App initialData={data} path="/blog/post-1" />)
    expect(await screen.findByRole('heading', { level: 1, name: 'Draft title' })).toBeTruthy()
    expect(screen.getByText(/unpublished drafts/)).toBeTruthy()
  })
})

describe('preview of a not-yet-published post', () => {
  it('works even though the post is not in the public data', async () => {
    window.history.replaceState({}, '', '/blog/new-one?preview=' + 'd'.repeat(48))
    fetch.mockImplementation(async (url) => (String(url).includes('rpc/site_preview_blog_post')
      ? { ok: true, json: async () => ({ post: mkPost(99, { slug: 'new-one', title: 'Brand new' }), attachments: [] }) }
      : tableResponse(url)))
    render(<App initialData={data} path="/blog/new-one" />)
    await waitFor(() => expect(screen.getByRole('heading', { level: 1, name: 'Brand new' })).toBeTruthy())
  })
})

/**
 * v1263 — Brand-site blog: list (/blog), post (/blog/<slug>), "no longer available" notice and the
 * email-gated download form. All content from public.site_blog_* (rule 25.1); SSR-safe (browser-only
 * values such as ?category= are read after hydration).
 */
import { useEffect, useMemo, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ArrowLeft, Download, FileText, Lock } from 'lucide-react'
import {
  attachmentsFor,
  blogFileTypeLabel,
  formatFileSize,
  listPosts,
  pageOf,
  validateDownloadForm,
} from '@nidus/shared/site/siteBlog.js'
import { fetchBlogSlugStatus, requestGatedDownload } from '../lib/fetchSiteData.js'
import { markdownComponents } from '../pages/SitePages.jsx'

const NEW_WINDOW = { target: '_blank', rel: 'noopener noreferrer' }

/** Same output on the server and in every browser (fixed locale and time zone). */
export const formatPostDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }) : ''

const categoryName = (categories, id) => (categories || []).find((c) => c.id === id)?.name || null

function Byline({ post, categories }) {
  const cat = categoryName(categories, post.category_id)
  return (
    <p className="text-sm text-gray-500 dark:text-gray-400">
      {[post.author_name && `By ${post.author_name}${post.author_role ? `, ${post.author_role}` : ''}`, formatPostDate(post.published_at), cat]
        .filter(Boolean).join(' · ')}
    </p>
  )
}

const prose = 'text-gray-700 dark:text-gray-300 [&_h2]:mt-8 [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:text-gray-900 dark:[&_h2]:text-white [&_h3]:mt-6 [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:text-gray-900 dark:[&_h3]:text-white [&_p]:mt-4 [&_p]:leading-7 [&_ul]:mt-4 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-6 [&_ol]:mt-4 [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-6 [&_blockquote]:mt-4 [&_blockquote]:border-l-4 [&_blockquote]:border-blue-500 [&_blockquote]:pl-4 [&_blockquote]:italic [&_img]:mt-6 [&_img]:rounded-xl [&_strong]:text-gray-900 dark:[&_strong]:text-white'

// ── List ─────────────────────────────────────────────────────────────────────

export function BlogListPage({ page, data }) {
  const categories = useMemo(() => (data?.blogCategories || []).filter((c) => c.is_active !== false).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)), [data])
  const [category, setCategory] = useState(null)
  const [pageNo, setPageNo] = useState(1)

  // ?category=<slug>&page=<n> — browser-only, read after hydration.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCategory(q.get('category') || null)
    setPageNo(Number(q.get('page')) || 1)
  }, [])

  const go = (nextCategory, nextPage) => {
    setCategory(nextCategory)
    setPageNo(nextPage)
    const q = new URLSearchParams()
    if (nextCategory) q.set('category', nextCategory)
    if (nextPage > 1) q.set('page', String(nextPage))
    window.history.replaceState({}, '', `/blog${q.toString() ? `?${q}` : ''}`)
  }

  const all = listPosts(data?.blogPosts, categories, { category })
  const { items, page: current, pages } = pageOf(all, pageNo)
  const usedCategoryIds = new Set((data?.blogPosts || []).map((p) => p.category_id))
  const chips = categories.filter((c) => usedCategoryIds.has(c.id))
  const chip = (active) => `rounded-full border px-3 py-1.5 text-sm font-medium ${active
    ? 'border-blue-600 bg-blue-600 text-white'
    : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800'}`

  return (
    <div className="mx-auto max-w-7xl px-4 pb-16">
      <header className="mx-auto max-w-3xl pt-14 pb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{page?.title || 'Blog'}</h1>
        {page?.summary && <p className="mt-3 text-base text-gray-600 dark:text-gray-300 sm:text-lg">{page.summary}</p>}
      </header>

      {chips.length > 0 && (
        <nav aria-label="Categories" className="mb-8 flex flex-wrap justify-center gap-2">
          <button type="button" className={chip(!category)} aria-pressed={!category} onClick={() => go(null, 1)}>All</button>
          {chips.map((c) => (
            <button key={c.id} type="button" className={chip(category === c.slug)} aria-pressed={category === c.slug} onClick={() => go(c.slug, 1)}>{c.name}</button>
          ))}
        </nav>
      )}

      {!items.length ? (
        <div className="mx-auto max-w-3xl text-center text-gray-600 dark:text-gray-300">
          {category ? <p>No articles in this category yet.</p> : page?.body_md
            ? <div className={prose}><ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>{page.body_md}</ReactMarkdown></div>
            : <p>No articles yet.</p>}
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((post) => (
            <a key={post.id} href={`/blog/${post.slug}`} data-testid="blog-card"
              className="group flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white transition hover:shadow-md dark:border-gray-700 dark:bg-gray-900">
              {post.cover_image_url
                ? <img src={post.cover_image_url} alt={post.cover_image_alt || ''} loading="lazy" className="aspect-[16/9] w-full object-cover" />
                : <div className="aspect-[16/9] w-full bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-950 dark:to-indigo-950" aria-hidden="true" />}
              <div className="flex flex-1 flex-col p-5">
                {categoryName(categories, post.category_id) && (
                  <span className="text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">{categoryName(categories, post.category_id)}</span>
                )}
                <h2 className="mt-1 text-lg font-semibold text-gray-900 group-hover:text-blue-700 dark:text-white dark:group-hover:text-blue-300">{post.title}</h2>
                {post.summary && <p className="mt-2 flex-1 text-sm text-gray-600 dark:text-gray-300">{post.summary}</p>}
                <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">{[post.author_name, formatPostDate(post.published_at)].filter(Boolean).join(' · ')}</p>
              </div>
            </a>
          ))}
        </div>
      )}

      {pages > 1 && (
        <nav aria-label="Pages" className="mt-10 flex items-center justify-center gap-3 text-sm">
          <button type="button" disabled={current <= 1} onClick={() => go(category, current - 1)}
            className="rounded-lg border border-gray-300 px-3 py-1.5 disabled:opacity-40 dark:border-gray-600">Previous</button>
          <span className="text-gray-600 dark:text-gray-300">Page {current} of {pages}</span>
          <button type="button" disabled={current >= pages} onClick={() => go(category, current + 1)}
            className="rounded-lg border border-gray-300 px-3 py-1.5 disabled:opacity-40 dark:border-gray-600">Next</button>
        </nav>
      )}
    </div>
  )
}

// ── Gated download form ──────────────────────────────────────────────────────

const field = 'mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white'

export function GatedDownloadForm({ attachment, env, privacyActive }) {
  const [form, setForm] = useState({ fullName: '', email: '', organisation: '', marketingOptIn: false, website: '' })
  const [state, setState] = useState({ busy: false, error: null, url: null })
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    const problem = validateDownloadForm(form)
    if (problem) { setState({ busy: false, error: problem, url: null }); return }
    setState({ busy: true, error: null, url: null })
    try {
      const res = await requestGatedDownload(env, {
        attachmentId: attachment.id, ...form, pageUrl: typeof window !== 'undefined' ? window.location.href : null,
      })
      setState({ busy: false, error: null, url: res.url })
    } catch (err) {
      setState({ busy: false, error: err.message, url: null })
    }
  }

  if (state.url) {
    return (
      <div role="status" className="mt-3 rounded-lg border border-green-300 bg-green-50 p-4 text-sm text-green-900 dark:border-green-800 dark:bg-green-900/30 dark:text-green-100">
        <p className="font-medium">Your download is ready.</p>
        <a href={state.url} className="mt-2 inline-flex items-center gap-2 rounded-lg bg-green-700 px-4 py-2 font-semibold text-white hover:bg-green-800">
          <Download className="h-4 w-4" aria-hidden="true" /> Download {attachment.display_name}
        </a>
        <p className="mt-2 text-xs">The link works for 5 minutes.</p>
      </div>
    )
  }

  return (
    <form onSubmit={submit} noValidate className="mt-3 space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/60">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">Name *<input className={field} value={form.fullName} onChange={set('fullName')} maxLength={120} autoComplete="name" /></label>
        <label className="block text-sm">Email *<input type="email" className={field} value={form.email} onChange={set('email')} autoComplete="email" /></label>
        <label className="block text-sm sm:col-span-2">Organisation<input className={field} value={form.organisation} onChange={set('organisation')} maxLength={160} autoComplete="organization" /></label>
      </div>
      {/* Honeypot: hidden from people, filled by bots. */}
      <input type="text" name="website" value={form.website} onChange={set('website')} tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" className="mt-1" checked={form.marketingOptIn} onChange={set('marketingOptIn')} />
        Send me Project Nidus news and product updates
      </label>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        We use these details to send this document and follow up about it.
        {privacyActive && <> See our <a href="/privacy" className="underline">Privacy Policy</a>.</>}
      </p>
      {state.error && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{state.error}</p>}
      <button type="submit" disabled={state.busy} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
        <Download className="h-4 w-4" aria-hidden="true" /> {state.busy ? 'Preparing…' : 'Get the download'}
      </button>
    </form>
  )
}

// ── Post ─────────────────────────────────────────────────────────────────────

function Attachments({ attachments, env, privacyActive }) {
  const [open, setOpen] = useState(null)
  if (!attachments.length) return null
  return (
    <section aria-labelledby="downloads" className="mt-12 rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
      <h2 id="downloads" className="text-lg font-semibold text-gray-900 dark:text-white">Downloads</h2>
      <ul className="mt-4 divide-y divide-gray-200 dark:divide-gray-700">
        {attachments.map((a) => (
          <li key={a.id} className="py-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="flex items-center gap-3">
                <FileText className="h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" aria-hidden="true" />
                <span>
                  <span className="block font-medium text-gray-900 dark:text-white">{a.display_name}</span>
                  <span className="block text-xs text-gray-500 dark:text-gray-400">{blogFileTypeLabel(a.mime_type)} · {formatFileSize(a.size_bytes)}{a.is_gated ? ' · email required' : ''}</span>
                </span>
              </span>
              {a.is_gated ? (
                <button type="button" aria-expanded={open === a.id} onClick={() => setOpen(open === a.id ? null : a.id)}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800">
                  <Lock className="h-4 w-4" aria-hidden="true" /> Download
                </button>
              ) : (
                <a href={a.public_url} {...NEW_WINDOW} download
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700">
                  <Download className="h-4 w-4" aria-hidden="true" /> Download
                </a>
              )}
            </div>
            {a.is_gated && open === a.id && <GatedDownloadForm attachment={a} env={env} privacyActive={privacyActive} />}
          </li>
        ))}
      </ul>
    </section>
  )
}

export function BlogPostPage({ post, attachments, data, env }) {
  const privacyActive = (data?.pages || []).some((p) => p.slug === 'privacy' && p.is_active !== false)
  const own = attachments ?? attachmentsFor(data?.blogAttachments, post.id)
  return (
    <article className="mx-auto max-w-3xl px-4 pb-16">
      <a href="/blog" className="mt-10 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> All articles
      </a>
      <header className="mt-6">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">{post.title}</h1>
        {post.summary && <p className="mt-3 text-lg text-gray-600 dark:text-gray-300">{post.summary}</p>}
        <div className="mt-4"><Byline post={post} categories={data?.blogCategories} /></div>
      </header>
      {post.cover_image_url && <img src={post.cover_image_url} alt={post.cover_image_alt || ''} className="mt-8 w-full rounded-2xl border border-gray-200 dark:border-gray-700" />}
      {post.body_md && (
        <div className={`mt-8 ${prose}`}>
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>{post.body_md}</ReactMarkdown>
        </div>
      )}
      <Attachments attachments={own} env={env} privacyActive={privacyActive} />
    </article>
  )
}

/** /blog/<slug> with no visible post: archived → friendly notice; otherwise not found. */
export function BlogPostUnavailable({ slug, env }) {
  const [status, setStatus] = useState('checking')
  useEffect(() => {
    let cancelled = false
    fetchBlogSlugStatus(env, slug)
      .then((s) => { if (!cancelled) setStatus(s) })
      .catch(() => { if (!cancelled) setStatus('missing') })
    return () => { cancelled = true }
  }, [env, slug])
  const archived = status === 'archived'
  return (
    <div className="px-4 py-24 text-center">
      <h1 className="text-3xl font-bold">{archived ? 'This article is no longer available' : status === 'checking' ? 'Loading…' : 'Article not found'}</h1>
      {status !== 'checking' && (
        <p className="mt-3 text-gray-600 dark:text-gray-300">
          {archived ? 'It has been retired. Have a look at our latest articles instead.' : 'The article you were looking for does not exist or has moved.'}
        </p>
      )}
      <a href="/blog" className="mt-6 inline-block rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">Go to the blog</a>
    </div>
  )
}

/**
 * v1241 — Brand site root. First render uses the data baked in at build time (identical to the
 * prerendered HTML, so hydration matches); after mount it applies ?ref= and refreshes the data so
 * an edit made in Admin shows without a redeploy. A failed refresh keeps the build-time content;
 * with no build-time content (dev server) the page shows an error state, never a blank page
 * (rule 26).
 *
 * Amendment A: several pages (routes.js), one layout with the shared header and footer.
 * `path` is the page being rendered: the prerender passes it, the browser reads it on load.
 */
import { useEffect, useMemo, useState } from 'react'
import { buildSiteChrome } from '@nidus/shared/site/siteChrome.js'
import SiteLayout from './components/SiteLayout.jsx'
import BrandHomePage from './pages/BrandHomePage.jsx'
import { ContentPage, ContactPage, NotFoundPage, PricingPage } from './pages/SitePages.jsx'
import { fetchPreviewBlogPost, fetchPreviewSections, fetchSiteData } from './lib/fetchSiteData.js'
import SectionPage from './sections/SectionPage.jsx'
import { sectionsForPage } from '@nidus/shared/site/siteSections.js'
import { readReferralCode } from './lib/siteData.js'
import { matchRoute, normalisePath } from './lib/routes.js'
import { BlogListPage, BlogPostPage, BlogPostUnavailable } from './blog/BlogPages.jsx'

const env = { baseUrl: import.meta.env.VITE_SUPABASE_URL, anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY }

export default function App({ initialData, path = '/' }) {
  const [data, setData] = useState(initialData)
  const [refCode, setRefCode] = useState(null)
  const [loadStatus, setLoadStatus] = useState(initialData?.products?.length ? 'ready' : 'loading')
  // v1262: drafts shown through an admin preview link (?preview=<token>); null = not previewing.
  const [preview, setPreview] = useState(null)

  useEffect(() => {
    // Browser-only value: read after hydration so the prerendered HTML matches the first render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRefCode(readReferralCode(window.location.search))
    let cancelled = false
    const previewToken = new URLSearchParams(window.location.search).get('preview')
    const current = normalisePath(path)
    if (previewToken && current.startsWith('blog/')) {
      // v1263: one blog post with its drafts.
      fetchPreviewBlogPost(env, previewToken, current.slice(5))
        .then((blogPost) => { if (!cancelled) setPreview({ blogPost, error: null }) })
        .catch((err) => { if (!cancelled) setPreview({ error: err.message }) })
    } else if (previewToken) {
      fetchPreviewSections(env, previewToken)
        .then((sections) => { if (!cancelled) setPreview({ sections, error: null }) })
        .catch((err) => { if (!cancelled) setPreview({ sections: null, error: err.message }) })
    }
    fetchSiteData(env)
      .then((fresh) => {
        if (!cancelled) {
          setData(fresh)
          setLoadStatus('ready')
        }
      })
      .catch((err) => {
        console.error('[site] could not load site data:', err?.message || err)
        if (!cancelled) setLoadStatus((s) => (s === 'ready' ? 'ready' : 'error'))
      })
    return () => {
      cancelled = true
    }
  }, [])

  const chrome = useMemo(() => buildSiteChrome(data || {}), [data])
  const route = matchRoute(path, data)

  let page
  const allSections = preview?.sections || data?.sections || []
  const sectionsOf = (slug) => sectionsForPage(allSections, slug)

  if (preview?.error) page = <PreviewError message={preview.error} />
  else if (route.kind === 'home') page = sectionsOf('home').length
    ? <SectionPage sections={sectionsOf('home')} data={data} refCode={refCode} />
    : <BrandHomePage data={data} refCode={refCode} />
  else if (route.kind === 'blog') page = <BlogListPage page={route.page} data={data} />
  else if (route.kind === 'blogPost' && preview?.blogPost) page = <BlogPostPage post={preview.blogPost.post} attachments={preview.blogPost.attachments} data={data} env={env} />
  else if (route.kind === 'blogPost') page = route.post
    ? <BlogPostPage post={route.post} data={data} env={env} />
    : <BlogPostUnavailable slug={route.slug} env={env} />
  else if (route.kind === 'pricing') page = <PricingPage data={data} refCode={refCode} />
  else if (route.kind === 'contact') page = <ContactPage page={route.page} data={data} env={env} />
  else if (route.kind === 'page') page = sectionsOf(route.page.slug).length
    ? <SectionPage sections={sectionsOf(route.page.slug)} data={data} refCode={refCode} />
    : <ContentPage page={route.page} />
  else page = <NotFoundPage />

  return (
    <SiteLayout chrome={chrome} loadStatus={loadStatus}>
      {(preview?.sections || preview?.blogPost) && <PreviewBanner />}
      {page}
    </SiteLayout>
  )
}

/** Shown on every page while an admin previews drafts. */
function PreviewBanner() {
  return (
    <div role="status" className="border-b border-amber-300 bg-amber-50 px-4 py-2 text-center text-sm font-medium text-amber-900 dark:border-amber-700 dark:bg-amber-900/40 dark:text-amber-100">
      Preview — you are seeing unpublished drafts. Visitors still see the published page.
    </div>
  )
}

function PreviewError({ message }) {
  return (
    <div role="alert" className="mx-auto my-16 max-w-xl rounded-lg border border-amber-300 bg-amber-50 px-5 py-4 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-100">
      <p className="font-medium">Preview not available</p>
      <p className="mt-1">{message}</p>
    </div>
  )
}

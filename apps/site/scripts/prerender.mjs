#!/usr/bin/env node
/**
 * v1241 — Prerender the brand site after `vite build` + the SSR build of src/entry-server.jsx.
 *
 * 1. Reads site_products / site_content / site_nav_links / site_pages with the anon key (same env
 *    as the apps, loaded from the repo-root .env files).
 * 2. Renders every page (src/lib/routes.js: home, pricing, contact, each active site_pages row)
 *    and writes dist/index.html, dist/<slug>/index.html and dist/404.html with the data and meta
 *    tags, so search engines get full content without running JavaScript (Amendment A).
 *
 * No fallback data (rule 26): if the database cannot be read, the build fails and the previous
 * deploy stays live.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { loadEnv } from 'vite'
import { fetchSiteData } from '../src/lib/fetchSiteData.js'
import { activeProductsInOrder } from '../src/lib/siteData.js'
import { matchRoute, routeMeta, routePaths } from '../src/lib/routes.js'
import { faqJsonLd, sectionsForPage } from '@nidus/shared/site/siteSections.js'
import { blogPostingJsonLd } from '@nidus/shared/site/siteBlog.js'

const here = path.dirname(fileURLToPath(import.meta.url))
const appDir = path.resolve(here, '..')
const repoRoot = path.resolve(appDir, '../..')
const env = { ...loadEnv(process.env.NODE_ENV === 'development' ? 'development' : 'production', repoRoot, 'VITE_'), ...process.env }

const escapeHtml = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
// Inline JSON inside <script>: escape '<' so content can never close the tag.
const safeJson = (value) => JSON.stringify(value).replace(/</g, '\\u003c')

async function main() {
  let data
  try {
    data = await fetchSiteData({ baseUrl: env.VITE_SUPABASE_URL, anonKey: env.VITE_SUPABASE_ANON_KEY })
  } catch (err) {
    console.error(`prerender: could not read site data — ${err.message}`)
    process.exitCode = 1
    return
  }
  if (!activeProductsInOrder(data.products).length) {
    console.error('prerender: site_products has no active rows (has SQL/v1241 seed been run?)')
    process.exitCode = 1
    return
  }

  const { render } = await import(pathToFileURL(path.join(appDir, 'dist-ssr', 'entry-server.js')).href)
  const indexPath = path.join(appDir, 'dist', 'index.html')
  const template = fs.readFileSync(indexPath, 'utf8')
  const dataScript = `<script>window.__SITE_DATA__ = ${safeJson(data)}</script>`

  const pageHtml = (pagePath) => {
    const route = matchRoute(pagePath, data)
    const { title, description, image, type } = routeMeta(route, data)
    // v1262: FAQ structured data for pages built from sections.
    const pageSlug = route.kind === 'home' ? 'home' : route.page?.slug
    const faq = pageSlug ? faqJsonLd(sectionsForPage(data.sections, pageSlug)) : null
    // v1263: BlogPosting structured data for blog posts.
    const brandUrl = String((data.content || []).find((c) => c.content_key === 'brand.url')?.content_value || '').replace(/\/+$/, '')
    const posting = route.kind === 'blogPost' && route.post
      ? blogPostingJsonLd(route.post, { url: brandUrl ? `${brandUrl}/${pagePath}` : undefined })
      : null
    const head = [
      `<meta name="description" content="${escapeHtml(description)}" />`,
      `<meta property="og:type" content="${type || 'website'}" />`,
      `<meta property="og:title" content="${escapeHtml(title)}" />`,
      `<meta property="og:description" content="${escapeHtml(description)}" />`,
      ...(image ? [`<meta property="og:image" content="${escapeHtml(image)}" />`] : []),
      ...(faq ? [`<script type="application/ld+json">${safeJson(faq)}</script>`] : []),
      ...(posting ? [`<script type="application/ld+json">${safeJson(posting)}</script>`] : []),
    ].join('\n    ')
    const html = render(data, `/${pagePath}`)
    // Function replacers: content may contain $' / $& / $$, which String.replace would expand.
    return template
      .replace('<!--site-head-->', () => head)
      .replace(/<title>[^<]*<\/title>/, () => `<title>${escapeHtml(title)}</title>`)
      .replace('<!--site-html-->', () => html)
      .replace('<!--site-data-->', () => dataScript)
  }

  const written = []
  for (const slug of routePaths(data)) {
    const file = slug ? path.join(appDir, 'dist', ...slug.split('/'), 'index.html') : indexPath
    fs.mkdirSync(path.dirname(file), { recursive: true })
    fs.writeFileSync(file, pageHtml(slug))
    written.push(slug || '/')
  }
  fs.writeFileSync(path.join(appDir, 'dist', '404.html'), pageHtml('__not-found__'))
  fs.rmSync(path.join(appDir, 'dist-ssr'), { recursive: true, force: true })
  console.log(`prerender: ${written.length} page(s) + 404 (${written.join(', ')}); ${activeProductsInOrder(data.products).length} products`)
}

main()

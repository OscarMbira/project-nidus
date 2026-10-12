/**
 * v1241 Amendment A — brand-site routes. Pure; used by the browser, the server render and the
 * prerender script (which writes one HTML file per route).
 *   /                 home (product cards)
 *   /pricing          product comparison → each product's own pricing page
 *   /contact          contact page (site_pages 'contact' intro + form)
 *   /blog             blog list (v1263; intro text from the site_pages 'blog' row)
 *   /blog/<slug>      one blog post (v1263)
 *   /<slug>           any active site_pages row (about, resources, solutions/…, terms, privacy)
 *   anything else     not found
 */
import { contentMap } from './siteData.js'

export const normalisePath = (path) => String(path || '/').split(/[?#]/)[0].replace(/\/+$/, '').replace(/^\/+/, '')

export function matchRoute(path, data) {
  const slug = normalisePath(path)
  const pages = (data?.pages || []).filter((p) => p.is_active !== false)
  if (slug === '') return { kind: 'home' }
  if (slug === 'pricing') return { kind: 'pricing' }
  const page = pages.find((p) => p.slug === slug)
  if (slug === 'blog') return { kind: 'blog', page: page || null }
  if (slug.startsWith('blog/')) {
    const postSlug = slug.slice(5)
    return { kind: 'blogPost', slug: postSlug, post: (data?.blogPosts || []).find((p) => p.slug === postSlug) || null }
  }
  if (slug === 'contact') return { kind: 'contact', page: page || null }
  if (page) return { kind: 'page', page }
  return { kind: 'notfound' }
}

/** Every path to prerender ('' = home). */
export function routePaths(data) {
  const pages = (data?.pages || []).filter((p) => p.is_active !== false && !['contact', 'blog'].includes(p.slug)).map((p) => p.slug)
  const posts = (data?.blogPosts || []).map((p) => `blog/${p.slug}`)
  return ['', 'pricing', 'contact', 'blog', ...pages, ...posts]
}

/** <title> and meta description for a route. */
export function routeMeta(route, data) {
  const text = contentMap(data?.content)
  const brand = 'Project Nidus'
  if (route.kind === 'home') return { title: text['meta.title'] || brand, description: text['meta.description'] || '' }
  if (route.kind === 'pricing') return { title: `Pricing — ${brand}`, description: 'Compare Project Nidus products and choose the one that fits.' }
  if (route.kind === 'notfound') return { title: `Page not found — ${brand}`, description: '' }
  if (route.kind === 'blog') return { title: `${route.page?.title || 'Blog'} — ${brand}`, description: route.page?.summary || '' }
  if (route.kind === 'blogPost') {
    if (!route.post) return { title: `Article not available — ${brand}`, description: '' }
    return { title: `${route.post.title} — ${brand}`, description: route.post.summary || '', image: route.post.cover_image_url || null, type: 'article' }
  }
  const page = route.page
  return { title: `${page?.title || 'Contact us'} — ${brand}`, description: page?.summary || '' }
}

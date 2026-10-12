/**
 * v1241 Amendment A — brand-site pages other than home: Pricing (product comparison), common
 * content pages from site_pages (About, Blog, Resources, Solutions, Terms, Privacy — Markdown),
 * Contact (form → site_submit_enquiry) and Not found. All text from the database (rule 25.1).
 */
import { createElement, useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ArrowRight, Send } from 'lucide-react'
import { activeProductsInOrder, withReferral } from '../lib/siteData.js'
import { submitEnquiry } from '../lib/fetchSiteData.js'
import { ACCENTS, NEUTRAL, productIconFor } from './BrandHomePage.jsx'

const NEW_WINDOW = { target: '_blank', rel: 'noopener noreferrer' }

function PageHeading({ title, summary }) {
  return (
    <header className="mx-auto max-w-3xl px-4 pt-14 pb-6 text-center">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
      {summary && <p className="mt-3 text-base text-gray-600 dark:text-gray-300 sm:text-lg">{summary}</p>}
    </header>
  )
}

// Markdown links to other applications (absolute http links) open in a new window (A-D4).
export const markdownComponents = {
  a: ({ href, children }) => {
    const external = /^https?:\/\//i.test(href || '')
    return (
      <a href={href} {...(external ? NEW_WINDOW : {})} className="text-blue-600 underline hover:text-blue-700 dark:text-blue-400">
        {children}
      </a>
    )
  },
}

export function ContentPage({ page }) {
  return (
    <article className="pb-16">
      <PageHeading title={page.title} summary={page.summary} />
      {page.body_md && (
        <div className="prose-nidus mx-auto max-w-3xl px-4 text-gray-700 dark:text-gray-300 [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-gray-900 dark:[&_h2]:text-white [&_p]:mt-4 [&_ul]:mt-4 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-6 [&_strong]:text-gray-900 dark:[&_strong]:text-white">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>{page.body_md}</ReactMarkdown>
        </div>
      )}
    </article>
  )
}

export function PricingPage({ data, refCode = null }) {
  const products = activeProductsInOrder(data?.products)
  return (
    <div className="pb-16">
      <PageHeading title="Pricing" summary="Each product has its own plans. Compare them here and see the details on the product's pricing page." />
      <div className="mx-auto grid max-w-6xl gap-6 px-4 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((p) => {
          const accent = ACCENTS[p.accent_key] || NEUTRAL
          return (
            <section key={p.slug} className="flex flex-col rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
              <div className={`inline-flex h-11 w-11 items-center justify-center rounded-xl ${accent.chip}`}>{createElement(productIconFor(p.icon_key), { className: 'h-6 w-6', 'aria-hidden': 'true' })}</div>
              <h2 className="mt-4 text-xl font-semibold">{p.name}</h2>
              {p.tagline && <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{p.tagline}</p>}
              {p.audience && <p className="mt-3 flex-1 text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">For: {p.audience}</p>}
              <div className="mt-5 flex flex-wrap gap-3">
                {p.pricing_url && (
                  <a href={withReferral(p.pricing_url, refCode)} {...NEW_WINDOW} className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-white ${accent.cta}`}>
                    See plans <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </a>
                )}
                {p.sign_up_url && (
                  <a href={withReferral(p.sign_up_url, refCode)} {...NEW_WINDOW} className="inline-flex items-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium dark:border-gray-600">
                    Get started
                  </a>
                )}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}

export const ENQUIRY_TOPICS = ['general', 'sales', 'support', 'partnership', 'press']

/** Contact form checks before sending. Pure; exported for tests. */
export function validateEnquiry(f) {
  if (!String(f.fullName || '').trim()) return 'Please enter your name.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(f.email || '').trim())) return 'Please enter a valid email address.'
  if (String(f.message || '').trim().length < 10) return 'Please write a little more in your message.'
  return null
}

const field = 'mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white'

export function ContactPage({ page, data, env }) {
  const products = activeProductsInOrder(data?.products)
  const [form, setForm] = useState({ fullName: '', email: '', organisation: '', topic: 'general', productSlug: '', message: '', website: '' })
  const [state, setState] = useState({ busy: false, error: null, reference: null })
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  // v1262: '?topic=sales' (e.g. the hero's Book a demo button) preselects the topic. Browser-only,
  // read after hydration so the prerendered form matches the first render.
  useEffect(() => {
    const topic = new URLSearchParams(window.location.search).get('topic')
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (ENQUIRY_TOPICS.includes(topic)) setForm((f) => ({ ...f, topic }))
  }, [])

  const submit = async (e) => {
    e.preventDefault()
    const problem = validateEnquiry(form)
    if (problem) { setState({ busy: false, error: problem, reference: null }); return }
    setState({ busy: true, error: null, reference: null })
    try {
      const res = await submitEnquiry(env, { ...form, pageUrl: typeof window !== 'undefined' ? window.location.href : null })
      setState({ busy: false, error: null, reference: res.reference || 'received' })
    } catch (err) {
      setState({ busy: false, error: err.message, reference: null })
    }
  }

  return (
    <div className="pb-16">
      <PageHeading title={page?.title || 'Contact us'} summary={page?.summary} />
      <div className="mx-auto max-w-2xl px-4">
        {state.reference ? (
          <div role="status" className="rounded-xl border border-green-300 bg-green-50 p-6 text-green-900 dark:border-green-800 dark:bg-green-900/30 dark:text-green-100">
            <p className="font-semibold">Thank you — your message has been sent.</p>
            {state.reference !== 'received' && <p className="mt-1 text-sm">Reference: <span className="font-mono">{state.reference}</span></p>}
            <p className="mt-1 text-sm">We will reply to {form.email} as soon as we can.</p>
          </div>
        ) : (
          <form onSubmit={submit} noValidate className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm">Your name *<input className={field} value={form.fullName} onChange={set('fullName')} maxLength={120} autoComplete="name" /></label>
              <label className="block text-sm">Email *<input type="email" className={field} value={form.email} onChange={set('email')} autoComplete="email" /></label>
              <label className="block text-sm">Organisation<input className={field} value={form.organisation} onChange={set('organisation')} maxLength={160} autoComplete="organization" /></label>
              <label className="block text-sm">Topic
                <select className={field} value={form.topic} onChange={set('topic')}>
                  <option value="general">General question</option>
                  <option value="sales">Sales and pricing</option>
                  <option value="support">Product support</option>
                  <option value="partnership">Partnership</option>
                  <option value="press">Press</option>
                </select>
              </label>
            </div>
            {products.length > 0 && (
              <label className="block text-sm">Product
                <select className={field} value={form.productSlug} onChange={set('productSlug')}>
                  <option value="">Not sure / all products</option>
                  {products.map((p) => <option key={p.slug} value={p.slug}>{p.name}</option>)}
                </select>
              </label>
            )}
            <label className="block text-sm">Message *<textarea rows={6} className={field} value={form.message} onChange={set('message')} maxLength={5000} /></label>
            {/* Honeypot for bots: hidden from people and screen readers. */}
            <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
              <label>Website<input tabIndex={-1} autoComplete="off" value={form.website} onChange={set('website')} /></label>
            </div>
            {state.error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{state.error}</p>}
            <button type="submit" disabled={state.busy} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
              <Send className="h-4 w-4" aria-hidden="true" /> {state.busy ? 'Sending…' : 'Send message'}
            </button>
          </form>
        )}
        {page?.body_md && <div className="mt-8 text-sm text-gray-600 dark:text-gray-400"><ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>{page.body_md}</ReactMarkdown></div>}
      </div>
    </div>
  )
}

export function NotFoundPage() {
  return (
    <div className="px-4 py-24 text-center">
      <h1 className="text-3xl font-bold">Page not found</h1>
      <p className="mt-3 text-gray-600 dark:text-gray-300">The page you were looking for does not exist or has moved.</p>
      <a href="/" className="mt-6 inline-block rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">Go to the home page</a>
    </div>
  )
}

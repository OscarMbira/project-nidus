/**
 * v1262 — Brand-site section pages (home + Solutions). Renders a page's sections from
 * public.site_sections in order; each of the 11 types has one component here. All copy comes
 * from the database (rule 25.1); a section with nothing to show renders nothing. SSR-safe (the
 * prerender renders these pages for search engines).
 *
 * Buttons: '#get-started' opens the "Which product?" chooser, '#<key>' scrolls to a section, '/…'
 * stays on this site, 'https://…' (another app) opens in a new window.
 */
import { createElement, useState } from 'react'
import {
  AlertTriangle, ArrowRight, BarChart3, BookOpen, Briefcase, CalendarRange, ChevronDown, ClipboardCheck, Clock,
  GitBranch, GraduationCap, Layers, LayoutDashboard, Link2, Quote, Repeat, ShieldCheck, Smartphone, Sparkles,
  Target, TrendingUp, Users, Workflow, CheckCircle2,
} from 'lucide-react'
import GetStartedChooser from '@nidus/ui/site/GetStartedChooser.jsx'
import { resolveSectionCta, sectionHasContent } from '@nidus/shared/site/siteSections.js'
import { activeProductsInOrder, withReferral } from '../lib/siteData.js'
import { ProductCard } from '../pages/BrandHomePage.jsx'

// Presentation lookup for item icon keys (SITE_ICON_KEYS); unknown keys get a neutral tick.
const ICONS = {
  'layout-dashboard': LayoutDashboard, 'graduation-cap': GraduationCap, 'calendar-range': CalendarRange,
  'shield-check': ShieldCheck, 'git-branch': GitBranch, 'bar-chart': BarChart3, users: Users, layers: Layers,
  workflow: Workflow, smartphone: Smartphone, 'clipboard-check': ClipboardCheck, target: Target, briefcase: Briefcase,
  'book-open': BookOpen, sparkles: Sparkles, clock: Clock, link: Link2, 'alert-triangle': AlertTriangle,
  'trending-up': TrendingUp, repeat: Repeat,
}
function ItemIcon({ iconKey, className }) {
  return createElement(ICONS[iconKey] || CheckCircle2, { className, 'aria-hidden': 'true' })
}

const NEW_WINDOW = { target: '_blank', rel: 'noopener noreferrer' }
const BTN = {
  primary: 'inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700',
  secondary: 'inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-900 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-900 dark:text-white dark:hover:bg-gray-800',
  // On the coloured call-to-action band (same in both themes).
  bandPrimary: 'inline-flex items-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-semibold text-blue-700 hover:bg-blue-50',
  bandSecondary: 'inline-flex items-center gap-2 rounded-lg border border-white/70 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10',
}

function CtaButton({ cta, variant = 'primary', onChooser, refCode }) {
  const c = resolveSectionCta(cta)
  if (!c) return null
  const cls = BTN[variant]
  if (c.kind === 'chooser') return <button type="button" onClick={onChooser} className={cls}>{c.label} <ArrowRight className="h-4 w-4" aria-hidden="true" /></button>
  if (c.kind === 'external') return <a href={withReferral(c.href, refCode)} {...NEW_WINDOW} className={cls}>{c.label}</a>
  return <a href={c.href} className={cls}>{c.label}</a>
}

function CtaPair({ section, onChooser, refCode, className = '' }) {
  if (!resolveSectionCta(section.primary_cta) && !resolveSectionCta(section.secondary_cta)) return null
  return (
    <div className={`flex flex-wrap items-center gap-3 ${className}`}>
      <CtaButton cta={section.primary_cta} onChooser={onChooser} refCode={refCode} />
      <CtaButton cta={section.secondary_cta} variant="secondary" onChooser={onChooser} refCode={refCode} />
    </div>
  )
}

function SectionHeading({ section, center = true }) {
  if (!section.heading && !section.subheading) return null
  return (
    <div className={center ? 'mx-auto max-w-3xl text-center' : ''}>
      {section.heading && <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-3xl">{section.heading}</h2>}
      {section.subheading && <p className="mt-3 text-base text-gray-600 dark:text-gray-300 sm:text-lg">{section.subheading}</p>}
    </div>
  )
}

const Image = ({ url, alt, className }) => (url ? <img src={url} alt={alt || ''} loading="lazy" className={className} /> : null)

// ── The 11 section types ─────────────────────────────────────────────────────

function Hero({ section, onChooser, refCode }) {
  const hasImage = Boolean(section.image_url)
  return (
    <div className={`mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 sm:py-20 ${hasImage ? 'lg:grid-cols-2' : ''}`}>
      <div className={hasImage ? '' : 'mx-auto max-w-4xl text-center'}>
        <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-5xl">{section.heading}</h1>
        {section.subheading && <p className="mt-5 text-lg text-gray-600 dark:text-gray-300 sm:text-xl">{section.subheading}</p>}
        {section.body && <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">{section.body}</p>}
        <CtaPair section={section} onChooser={onChooser} refCode={refCode} className={`mt-8 ${hasImage ? '' : 'justify-center'}`} />
      </div>
      {hasImage && (
        <Image url={section.image_url} alt={section.image_alt} className="w-full rounded-2xl border border-gray-200 shadow-xl dark:border-gray-700" />
      )}
    </div>
  )
}

function TrustStrip({ section }) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      {section.heading && <p className="text-center text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{section.heading}</p>}
      <ul className="mt-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-6">
        {section.items.map((item, i) => (
          <li key={i} className="text-center">
            {item.image_url ? (
              <Image url={item.image_url} alt={item.image_alt || item.title} className="h-10 w-auto opacity-80 grayscale hover:opacity-100 hover:grayscale-0" />
            ) : (
              <>
                <span className="block text-3xl font-extrabold text-gray-900 dark:text-white">{item.title}</span>
                {item.text && <span className="block text-sm text-gray-600 dark:text-gray-400">{item.text}</span>}
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

function CardGrid({ section, columns = 'lg:grid-cols-3' }) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-16">
      <SectionHeading section={section} />
      <div className={`mt-10 grid gap-6 sm:grid-cols-2 ${columns}`}>
        {section.items.map((item, i) => (
          <div key={i} className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
              <ItemIcon iconKey={item.icon} className="h-5 w-5" />
            </span>
            <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">{item.title}</h3>
            {item.text && <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{item.text}</p>}
          </div>
        ))}
      </div>
    </div>
  )
}

function ProductCards({ section, data, refCode }) {
  const products = activeProductsInOrder(data?.products)
  if (!products.length) return null
  return (
    <div className="mx-auto max-w-7xl px-4 py-16">
      <SectionHeading section={section} />
      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((p) => <ProductCard key={p.slug} product={p} refCode={refCode} />)}
      </div>
    </div>
  )
}

function Steps({ section }) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-16">
      <SectionHeading section={section} />
      <ol className="mt-10 grid gap-6 md:grid-cols-3">
        {section.items.map((item, i) => (
          <li key={i} className="relative rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">{i + 1}</span>
            <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">{item.title}</h3>
            {item.text && <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{item.text}</p>}
          </li>
        ))}
      </ol>
    </div>
  )
}

function AudienceLinks({ section, refCode }) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-16">
      <SectionHeading section={section} />
      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {section.items.map((item, i) => {
          const cta = resolveSectionCta({ label: item.title, href: item.href })
          const inner = (
            <>
              <ItemIcon iconKey={item.icon} className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">{item.title}</h3>
              {item.text && <p className="mt-2 flex-1 text-sm text-gray-600 dark:text-gray-300">{item.text}</p>}
              {cta && <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-blue-600 dark:text-blue-400">Learn more <ArrowRight className="h-4 w-4" aria-hidden="true" /></span>}
            </>
          )
          const cls = 'flex flex-col rounded-2xl border border-gray-200 bg-white p-6 transition hover:border-blue-500 hover:shadow-md dark:border-gray-700 dark:bg-gray-900'
          if (!cta || cta.kind === 'chooser') return <div key={i} className={cls}>{inner}</div>
          return <a key={i} href={cta.kind === 'external' ? withReferral(cta.href, refCode) : cta.href} {...(cta.kind === 'external' ? NEW_WINDOW : {})} className={cls}>{inner}</a>
        })}
      </div>
    </div>
  )
}

function Testimonials({ section }) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-16">
      <SectionHeading section={section} />
      <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {section.items.map((item, i) => (
          <figure key={i} className="flex flex-col rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
            <Quote className="h-6 w-6 text-blue-600 dark:text-blue-400" aria-hidden="true" />
            <blockquote className="mt-3 flex-1 text-gray-700 dark:text-gray-200">{item.text}</blockquote>
            <figcaption className="mt-5 flex items-center gap-3">
              <Image url={item.image_url} alt={item.image_alt || item.title} className="h-10 w-10 rounded-full object-cover" />
              <span>
                <span className="block text-sm font-semibold text-gray-900 dark:text-white">{item.title}</span>
                {item.subtitle && <span className="block text-xs text-gray-500 dark:text-gray-400">{item.subtitle}</span>}
              </span>
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  )
}

function PricingTeaser({ section, onChooser, refCode }) {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 text-center">
      <SectionHeading section={section} />
      {section.body && <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">{section.body}</p>}
      <CtaPair section={section} onChooser={onChooser} refCode={refCode} className="mt-8 justify-center" />
    </div>
  )
}

function Faq({ section }) {
  const [open, setOpen] = useState(null)
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <SectionHeading section={section} />
      <dl className="mt-10 divide-y divide-gray-200 rounded-2xl border border-gray-200 bg-white dark:divide-gray-700 dark:border-gray-700 dark:bg-gray-900">
        {section.items.map((item, i) => {
          const isOpen = open === i
          const id = `${section.section_key}-answer-${i}`
          return (
            <div key={i} className="px-5">
              <dt>
                <button type="button" aria-expanded={isOpen} aria-controls={id} onClick={() => setOpen(isOpen ? null : i)}
                  className="flex w-full items-center justify-between gap-4 py-4 text-left font-medium text-gray-900 dark:text-white">
                  {item.title}
                  <ChevronDown className={`h-5 w-5 shrink-0 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
                </button>
              </dt>
              <dd id={id} hidden={!isOpen} className="pb-4 text-sm text-gray-600 dark:text-gray-300">{item.text}</dd>
            </div>
          )
        })}
      </dl>
    </div>
  )
}

function CtaBand({ section, onChooser, refCode }) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-16">
      <div className="rounded-3xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-12 text-center text-white sm:px-12">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{section.heading}</h2>
        {section.subheading && <p className="mx-auto mt-3 max-w-2xl text-blue-100">{section.subheading}</p>}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <CtaButton cta={section.primary_cta} variant="bandPrimary" onChooser={onChooser} refCode={refCode} />
          <CtaButton cta={section.secondary_cta} variant="bandSecondary" onChooser={onChooser} refCode={refCode} />
        </div>
      </div>
    </div>
  )
}

const RENDERERS = {
  hero: Hero,
  trust_strip: TrustStrip,
  value_points: (p) => <CardGrid {...p} columns="lg:grid-cols-4" />,
  product_cards: ProductCards,
  feature_grid: (p) => <CardGrid {...p} />,
  steps: Steps,
  audience_links: AudienceLinks,
  testimonials: Testimonials,
  pricing_teaser: PricingTeaser,
  faq: Faq,
  cta_band: CtaBand,
}

// Alternate section backgrounds so the page reads as distinct bands (hero and CTA band excluded).
const BAND_BG = ['bg-gray-50 dark:bg-gray-950', 'bg-white dark:bg-gray-900/40']

/** A page built from sections. `sections` are already filtered to the page and ordered. */
export default function SectionPage({ sections, data, refCode = null }) {
  const [chooserOpen, setChooserOpen] = useState(false)
  const visible = (sections || []).filter(sectionHasContent)
  const products = activeProductsInOrder(data?.products)
  let band = 0
  return (
    <>
      {visible.map((section) => {
        const Renderer = RENDERERS[section.section_type]
        const bg = section.section_type === 'hero' || section.section_type === 'cta_band' ? '' : BAND_BG[band++ % 2]
        return (
          <section key={section.section_key} id={section.section_key} data-section-type={section.section_type} className={`scroll-mt-24 ${bg}`}>
            <Renderer section={section} data={data} refCode={refCode} onChooser={() => setChooserOpen(true)} />
          </section>
        )
      })}
      <GetStartedChooser open={chooserOpen} onClose={() => setChooserOpen(false)} products={products} />
    </>
  )
}

/**
 * The one public header for the Nidus brand site and the Platform, Simulator and Planner public
 * pages. Data only (rule 25.1): pass `chrome` from buildSiteChrome() (brand site: prerendered;
 * apps: useSiteChrome()).
 *
 * v1264 — two layouts, chosen by `currentProduct`:
 *   brand   (brand site, currentProduct null), company-led, as v1241 Amendment A:
 *     [Project Nidus]  Products ▾  Solutions ▾  Pricing  Resources ▾  Company ▾     ☀  Sign in ▾  [CTA]
 *   product (Platform / Simulator / Planner public pages), product-led, one row:
 *     [Project Nidus]  Features  Pricing  Docs …  Project Nidus ▾     ☀  Sign in  [CTA]
 *      Platform        (product name under the wordmark)
 *     Project Nidus ▾ = other products (+ their sign-in), Compare products, Solutions, Resources, Company.
 *
 * - Colours and the primary button (CTA) come from site_header_settings (one row per header),
 *   applied as CSS variables so organisation branding (rule 72) cannot repaint them. The header
 *   keeps its own colours in both page themes (PRD D6).
 * - Links into another application open in a new window (A-D4); in-app paths use LinkComponent.
 * - Below the lg breakpoint the menus collapse into ☰; theme toggle, Sign in and the CTA stay
 *   visible (A-D5 / v1264 D9).
 * - Dropdowns: button + aria-expanded, close on Escape / outside click / link click.
 * - SSR-safe: no browser APIs during render (the brand site prerenders it).
 */
import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Menu as MenuIcon, X, LogIn } from 'lucide-react'
import { brandHref, productHeaderLinks, resolveHeaderCta, resolveNavHref, resolveProductHref } from '@nidus/shared/site/siteChrome.js'
import { headerCssVars, isDarkColor } from '@nidus/shared/site/siteColors.js'
import GetStartedChooser from './GetStartedChooser.jsx'
import { ExtLink, NidusWordmark, ProductIcon, productIcon } from './siteLinks.jsx'

export { ExtLink, productIcon }

function useCloseOnOutside(open, setOpen) {
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return undefined
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, setOpen])
  return ref
}

// Colours are the header's CSS variables (see headerCssVars), not page-theme classes.
const itemCls = 'block rounded-lg px-3 py-2 hover:bg-[var(--nh-hover)]'
const navCls = 'whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium text-[var(--nh-text)] hover:bg-[var(--nh-hover)] hover:text-[var(--nh-strong)]'
const headingCls = 'px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-[var(--nh-muted)]'
const titleCls = 'block text-sm font-medium text-[var(--nh-strong)]'
const descCls = 'block text-xs text-[var(--nh-muted)]'

function Dropdown({ label, children, align = 'left', wide = false }) {
  const [open, setOpen] = useState(false)
  const ref = useCloseOnOutside(open, setOpen)
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen(!open)}
        className={`inline-flex items-center gap-1 ${navCls}`}
      >
        {label}
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      {open && (
        <div
          className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} z-50 mt-2 ${wide ? 'w-96' : 'w-72'} max-h-[75vh] overflow-y-auto rounded-xl border border-[var(--nh-border)] bg-[var(--nh-panel)] p-2 shadow-xl`}
          onClick={(e) => { if (e.target.closest('a')) setOpen(false) }}
        >
          {children}
        </div>
      )}
    </div>
  )
}

function ProductItems({ products, field, currentProduct, showTagline = true }) {
  return products.map((p) => {
    const to = resolveProductHref(p, field, currentProduct)
    if (!to) return null
    return (
      <ExtLink key={p.slug} to={to} className={`${itemCls} flex items-start gap-3`}>
        <ProductIcon iconKey={p.icon_key} className="mt-0.5 h-5 w-5 shrink-0 text-[var(--nh-accent)]" aria-hidden="true" />
        <span>
          <span className={titleCls}>{p.name}</span>
          {showTagline && p.tagline && <span className={descCls}>{p.tagline}</span>}
        </span>
      </ExtLink>
    )
  })
}

function LinkItems({ links, ctx }) {
  return links.map((l) => (
    <ExtLink key={l.link_key} to={resolveNavHref(l, ctx)} className={itemCls}>
      <span className={titleCls}>{l.label}</span>
      {l.description && <span className={descCls}>{l.description}</span>}
    </ExtLink>
  ))
}

/** A titled block inside a dropdown or the mobile menu. */
function Section({ title, children }) {
  return (
    <div className="mb-3 last:mb-0">
      <p className={headingCls}>{title}</p>
      {children}
    </div>
  )
}

/** An in-app path (same window, router Link when given) or another site (ExtLink). */
function AppLink({ href, external = false, LinkComponent, className, children, ...rest }) {
  if (href.startsWith('/') && LinkComponent) return <LinkComponent to={href} className={className} {...rest}>{children}</LinkComponent>
  return <ExtLink to={{ href, external }} className={className} {...rest}>{children}</ExtLink>
}

function CtaButton({ cta, onChooser, LinkComponent }) {
  if (!cta) return null
  const cls = 'whitespace-nowrap rounded-lg bg-[var(--nh-accent)] px-3 py-2 text-sm font-semibold text-[var(--nh-cta-text)] hover:opacity-90 sm:px-4'
  if (cta.chooser) return <button type="button" onClick={onChooser} className={cls}>{cta.label}</button>
  return <AppLink href={cta.href} external={cta.external} LinkComponent={LinkComponent} className={cls}>{cta.label}</AppLink>
}

function MobileToggle({ open, setOpen }) {
  return (
    <button
      type="button"
      className="rounded-md p-2 text-[var(--nh-text)] hover:bg-[var(--nh-hover)] lg:hidden"
      aria-label={open ? 'Close menu' : 'Open menu'}
      aria-expanded={open}
      onClick={() => setOpen(!open)}
    >
      {open ? <X className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
    </button>
  )
}

/** Solutions / Resources / Company as titled sections (switcher and mobile menus). */
function CompanySections({ groups, ctx }) {
  return groups.filter(([, links]) => links.length).map(([label, links]) => (
    <Section key={label} title={label}><LinkItems links={links} ctx={ctx} /></Section>
  ))
}

/** v1264 product layout: everything outside this product, in one place. */
function NidusSwitcherContent({ otherProducts, signIns, currentProduct, pricingTo, groups, ctx }) {
  return (
    <>
      {otherProducts.length > 0 && (
        <Section title="Other products">
          <ProductItems products={otherProducts} field="landing_url" currentProduct={currentProduct} />
        </Section>
      )}
      {pricingTo && (
        <Section title="Pricing">
          <ExtLink to={pricingTo} className={itemCls}><span className={titleCls}>Compare products</span></ExtLink>
        </Section>
      )}
      <CompanySections groups={groups} ctx={ctx} />
      {signIns.length > 0 && (
        <Section title="Sign in to another product">
          <ProductItems products={signIns} field="sign_in_url" currentProduct={currentProduct} showTagline={false} />
        </Section>
      )}
    </>
  )
}

/**
 * props: chrome, currentProduct ('platform'|'simulator'|'planner'|null on the brand site),
 *        onBrandSite, themeToggle (node), LinkComponent (router Link for in-app paths)
 */
export default function NidusSiteHeader({ chrome, currentProduct = null, onBrandSite = false, themeToggle = null, LinkComponent = null }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [chooserOpen, setChooserOpen] = useState(false)
  const products = chrome?.products || []
  const menus = chrome?.menus || { solutions: [], resources: [], company: [] }
  const ctx = { brandUrl: chrome?.brandUrl, onBrandSite }
  const homeTo = onBrandSite ? { href: '/', external: false } : chrome?.brandUrl ? { href: brandHref(chrome.brandUrl), external: true } : null
  const pricingTo = onBrandSite ? { href: '/pricing', external: false } : chrome?.brandUrl ? { href: brandHref(chrome.brandUrl, 'pricing'), external: true } : null
  const groups = [
    ['Solutions', menus.solutions],
    ['Resources', menus.resources],
    ['Company', menus.company],
  ]
  const product = currentProduct ? products.find((p) => p.slug === currentProduct) || null : null
  const settings = chrome?.headers?.[currentProduct || 'brand'] || null
  const cta = chrome ? resolveHeaderCta(chrome, currentProduct) : null
  const style = headerCssVars(settings)
  const productLinks = product ? productHeaderLinks(chrome, currentProduct, cta) : []

  const logo = <NidusWordmark size={product ? 'md' : 'lg'} />
  const logoLink = homeTo ? <ExtLink to={homeTo} aria-label="Project Nidus home" title="Home" className="transition-opacity hover:opacity-80">{logo}</ExtLink> : logo

  const right = product ? (
    <ProductRight product={product} currentProduct={currentProduct} themeToggle={themeToggle} cta={cta} LinkComponent={LinkComponent} />
  ) : (
    <BrandRight products={products} currentProduct={currentProduct} themeToggle={themeToggle} cta={cta} onChooser={() => setChooserOpen(true)} LinkComponent={LinkComponent} />
  )

  return (
    <>
    {/* `dark` on a dark header keeps any dark: styles inside it (e.g. the app's theme toggle) readable. */}
    <header style={style} className={`${isDarkColor(style['--nh-bg']) ? 'dark ' : ''}sticky top-0 z-40 border-b border-[var(--nh-border)] bg-[var(--nh-bg)] text-[var(--nh-text)] backdrop-blur`}>
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2 lg:gap-4">
          <MobileToggle open={mobileOpen} setOpen={setMobileOpen} />
          {product ? (
            <ProductLeft product={product} logoLink={logoLink} links={productLinks} LinkComponent={LinkComponent}>
              <Dropdown label="Project Nidus" wide>
                <NidusSwitcherContent
                  otherProducts={products.filter((p) => p.slug !== currentProduct)}
                  signIns={products.filter((p) => p.slug !== currentProduct && p.sign_in_url)}
                  currentProduct={currentProduct}
                  pricingTo={pricingTo}
                  groups={groups}
                  ctx={ctx}
                />
              </Dropdown>
            </ProductLeft>
          ) : (
            <>
              {logoLink}
              <nav aria-label="Main" className="hidden items-center lg:flex">
                {products.length > 0 && (
                  <Dropdown label="Products" wide>
                    <ProductItems products={products} field="landing_url" currentProduct={currentProduct} />
                  </Dropdown>
                )}
                {menus.solutions.length > 0 && <Dropdown label="Solutions"><LinkItems links={menus.solutions} ctx={ctx} /></Dropdown>}
                {pricingTo && <ExtLink to={pricingTo} className={navCls}>Pricing</ExtLink>}
                {menus.resources.length > 0 && <Dropdown label="Resources"><LinkItems links={menus.resources} ctx={ctx} /></Dropdown>}
                {menus.company.length > 0 && <Dropdown label="Company"><LinkItems links={menus.company} ctx={ctx} /></Dropdown>}
              </nav>
            </>
          )}
        </div>
        {right}
      </div>

      {mobileOpen && (
        <nav aria-label="Main" className="max-h-[70vh] overflow-y-auto border-t border-[var(--nh-border)] px-4 py-3 lg:hidden">
          {product ? (
            <>
              {productLinks.length > 0 && (
                <Section title={product.name}>
                  {productLinks.map((l) => (
                    <AppLink key={l.link_key} href={l.url} LinkComponent={LinkComponent} className={`${itemCls} text-sm font-medium text-[var(--nh-strong)]`}>{l.label}</AppLink>
                  ))}
                </Section>
              )}
              <div className="mt-2 border-t border-[var(--nh-border)] pt-3">
                <p className="px-3 pb-2 text-sm font-semibold text-[var(--nh-strong)]">Project Nidus</p>
                <NidusSwitcherContent
                  otherProducts={products.filter((p) => p.slug !== currentProduct)}
                  signIns={products.filter((p) => p.slug !== currentProduct && p.sign_in_url)}
                  currentProduct={currentProduct}
                  pricingTo={pricingTo}
                  groups={groups}
                  ctx={ctx}
                />
              </div>
            </>
          ) : (
            <>
              {products.length > 0 && (
                <Section title="Products"><ProductItems products={products} field="landing_url" currentProduct={currentProduct} /></Section>
              )}
              {pricingTo && <ExtLink to={pricingTo} className={`${itemCls} mb-3 text-sm font-medium text-[var(--nh-strong)]`}>Pricing</ExtLink>}
              <CompanySections groups={groups} ctx={ctx} />
            </>
          )}
        </nav>
      )}
    </header>
    {/* Outside the header so the chooser follows the page theme. */}
    {!product && <GetStartedChooser open={chooserOpen} onClose={() => setChooserOpen(false)} products={products} currentProduct={currentProduct} />}
    </>
  )
}

/** "Project Nidus Platform" → "Platform" (the wordmark above already says Project Nidus). */
const shortProductName = (name) => String(name || '').replace(/^project\s+nidus\s+/i, '') || name

/** Product layout, left side: wordmark | product name, then the product's own links + switcher. */
function ProductLeft({ product, logoLink, links, LinkComponent, children }) {
  const landing = resolveProductHref(product, 'landing_url', product.slug)
  // Lockup: wordmark with the product name under it, e.g. "Project Nidus" / "Platform".
  const name = (
    <span className="block whitespace-nowrap text-sm font-semibold leading-tight text-[var(--nh-muted)]">
      {shortProductName(product.name)}
    </span>
  )
  return (
    <>
      <div className="flex flex-col items-start">
        {logoLink}
        {landing ? <ExtLink to={landing} aria-label={product.name} className="hover:opacity-80">{name}</ExtLink> : name}
      </div>
      <nav aria-label="Main" className="hidden items-center lg:flex">
        {links.map((l) => <AppLink key={l.link_key} href={l.url} LinkComponent={LinkComponent} className={navCls}>{l.label}</AppLink>)}
        {children}
      </nav>
    </>
  )
}

/** Product layout, right side: theme, a direct Sign in to this product (D3), the product's CTA. */
function ProductRight({ product, currentProduct, themeToggle, cta, LinkComponent }) {
  const signIn = resolveProductHref(product, 'sign_in_url', currentProduct)
  return (
    <div className="flex shrink-0 items-center gap-2">
      {themeToggle}
      {signIn && (
        <ExtLink to={signIn} className={`inline-flex items-center gap-1 ${navCls}`}>
          <LogIn className="h-4 w-4" aria-hidden="true" /><span className="hidden sm:inline">Sign in</span>
        </ExtLink>
      )}
      <CtaButton cta={cta} LinkComponent={LinkComponent} />
    </div>
  )
}

/** Brand layout, right side: theme, Sign in ▾ (every product), the brand CTA (chooser by default). */
function BrandRight({ products, currentProduct, themeToggle, cta, onChooser, LinkComponent }) {
  const signIns = products.filter((p) => p.sign_in_url)
  const hasSignUp = products.some((p) => p.sign_up_url)
  return (
    <div className="flex shrink-0 items-center gap-2">
      {themeToggle}
      {signIns.length > 0 && (
        <Dropdown align="right" label={<><LogIn className="h-4 w-4" aria-hidden="true" /><span className="hidden sm:inline">Sign in</span></>}>
          <ProductItems products={signIns} field="sign_in_url" currentProduct={currentProduct} showTagline={false} />
        </Dropdown>
      )}
      {(!cta?.chooser || hasSignUp) && <CtaButton cta={cta} onChooser={onChooser} LinkComponent={LinkComponent} />}
    </div>
  )
}

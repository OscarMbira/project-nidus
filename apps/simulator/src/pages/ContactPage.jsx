/**
 * ContactPage — v1241 Amendment A (A-D1): this common page now lives only on the Nidus brand site
 * (site_pages 'contact', edited in Admin). The old route here sends visitors there.
 */
import BrandSiteRedirect from '@nidus/ui/site/BrandSiteRedirect.jsx'

export default function ContactPage() {
  return <BrandSiteRedirect path="contact" label="Contact" />
}

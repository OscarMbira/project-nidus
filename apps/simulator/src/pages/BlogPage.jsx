/**
 * BlogPage — v1241 Amendment A (A-D1): this common page now lives only on the Nidus brand site
 * (site_pages 'blog', edited in Admin). The old route here sends visitors there.
 */
import BrandSiteRedirect from '@nidus/ui/site/BrandSiteRedirect.jsx'

export default function BlogPage() {
  return <BrandSiteRedirect path="blog" label="the blog" />
}

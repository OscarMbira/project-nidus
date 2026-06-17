/**
 * Platform Account & Subscription UI (menus, routes, banners, post-login billing redirects).
 * Set VITE_ENABLE_PLATFORM_BILLING=true before deployment to activate.
 */
export function isPlatformBillingEnabled() {
  return import.meta.env.VITE_ENABLE_PLATFORM_BILLING === 'true'
}

export default { isPlatformBillingEnabled }

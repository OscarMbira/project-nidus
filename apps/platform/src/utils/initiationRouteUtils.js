/**
 * Resolve list/CRUD base paths for Initiation & Business Justification documents.
 */

export function resolveInitiationBasePath(pathname = '') {
  if (pathname.startsWith('/pmo/initiation/business-case')) return '/pmo/initiation/business-case'
  if (pathname.startsWith('/pm/initiation/business-case')) return '/pm/initiation/business-case'
  if (pathname.startsWith('/simulator/pmo/initiation/business-case')) return '/simulator/pmo/initiation/business-case'
  if (pathname.startsWith('/simulator/pm/initiation/business-case')) return '/simulator/pm/initiation/business-case'
  if (pathname.startsWith('/platform/business-case')) return '/platform/business-case'
  return '/pmo/initiation/business-case'
}

export function resolveInitiationContext(pathname = '') {
  if (pathname.startsWith('/pmo/')) return 'pmo'
  if (pathname.startsWith('/pm/')) return 'pm'
  if (pathname.startsWith('/simulator/')) return 'simulator'
  if (pathname.startsWith('/platform/')) return 'platform'
  return 'pmo'
}

export function resolveBenefitsReviewPlanViewPath(projectId, pathname = '') {
  if (!projectId) return null
  // Stay inside the current PM/PMO sidebar layout instead of dropping into the generic
  // /platform/projects/* shell (a different, collapsed Sidebar) — see resolveInitiationContext.
  // Prefer project_code when callers pass it; UUID also resolves via usePlatformProjectId.
  const context = resolveInitiationContext(pathname)
  const key = encodeURIComponent(String(projectId).trim())
  const base = context === 'pm' ? '/pm/projects' : context === 'pmo' ? '/pmo/projects' : '/platform/projects'
  return `${base}/${key}/benefits/review-plan`
}

export function riskCategoryBasePath(pathname) {
  return String(pathname || '').startsWith('/simulator')
    ? '/simulator/pmo/risk-categories'
    : '/platform/pmo-admin/risk-categories'
}

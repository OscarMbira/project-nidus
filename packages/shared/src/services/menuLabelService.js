/**
 * Fetch a single menu_items.menu_label by menu_code, so page titles and cross-navigation
 * link text stay in sync with whatever the DB-driven sidebar actually shows. Without this,
 * a page title is a hardcoded string duplicating the DB label — renaming the menu item
 * (as this codebase has done more than once) silently desyncs the page from the sidebar.
 */
export async function getMenuLabel(db, menuCode, fallback = '') {
  if (!db || !menuCode) return fallback
  try {
    const { data, error } = await db
      .from('menu_items')
      .select('menu_label')
      .eq('menu_code', menuCode)
      .eq('is_active', true)
      .maybeSingle()
    if (error) throw error
    return data?.menu_label || fallback
  } catch {
    return fallback
  }
}

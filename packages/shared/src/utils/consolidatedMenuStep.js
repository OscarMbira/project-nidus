/**
 * v1341 — the consolidated-sidebar step of useMenu's applyFetchResult, shared by Platform and
 * Simulator (rule 34.1). Returns null when the organisation's switch is off (or nothing could be
 * built), so the caller keeps today's sidebar exactly as before; otherwise the consolidated items
 * and the extras published for the slot tab strip and Go to page search.
 * Dependencies are injectable so the step can be unit-tested without a database.
 */
import { isConsolidatedMenuEnabled, buildConsolidatedMenuForUser } from './consolidatedMenuData'

/**
 * @param {{
 *   app: 'platform'|'simulator',
 *   finalItems: object[],            today's finished sidebar tree (before pack grouping)
 *   hierarchy: object[],             raw role-granted hierarchy (to rebuild without the profile filter)
 *   fetchedHint: object|null,        layout hint (layout, pmProfile, …)
 *   accountId: string|null,
 *   userId: string|null,             auth user id
 *   layoutScope: 'pm'|'tm'|'pmo'|null,
 *   projectId: string|null,
 *   projectLoading?: boolean,
 *   buildPresentation: (hierarchy: object[], hint: object) => object[],
 *   getPackMap: (accountId: string) => Promise<object|null>,
 *   isEnabled?: (accountId: string) => Promise<boolean>,
 *   build?: (input: object) => Promise<object>,
 * }} input
 * @returns {Promise<null | { items: object[], incomplete: boolean, consolidated: object }>}
 */
export async function applyConsolidatedMenuStep({
  app,
  finalItems,
  hierarchy,
  fetchedHint,
  accountId,
  userId,
  layoutScope,
  projectId,
  projectLoading = false,
  buildPresentation,
  getPackMap,
  isEnabled = isConsolidatedMenuEnabled,
  build = buildConsolidatedMenuForUser,
}) {
  if (!accountId || !Array.isArray(finalItems) || finalItems.length === 0) return null
  if (!(await isEnabled(accountId))) return null

  const isProjectScoped = layoutScope === 'pm' || layoutScope === 'tm'
  // D8: governance profiles use explicit placements, so the keyword profile filter is not
  // applied to the tree the engine places from.
  const tree = fetchedHint?.pmProfile && typeof buildPresentation === 'function'
    ? buildPresentation(hierarchy, { ...fetchedHint, pmProfile: null })
    : finalItems

  const built = await build({
    app,
    tree,
    accountId,
    authUserId: userId,
    layout: layoutScope,
    projectId: isProjectScoped ? (projectId || null) : null,
    packMap: getPackMap(accountId),
  })
  if (!built?.enabled || !Array.isArray(built.items) || built.items.length === 0) return null

  return {
    items: built.items,
    // While the open project is still resolving, the menu is provisional: not cached (R5).
    incomplete: isProjectScoped && !!projectLoading,
    consolidated: {
      placementKey: built.placementKey,
      homeOnly: built.homeOnly,
      projectId: built.projectId,
      version: built.version,
      slotTabs: built.slotTabs,
      pageIndex: built.pageIndex,
      packNames: built.packNames,
      unplacedCount: (built.unplaced || []).length,
    },
  }
}

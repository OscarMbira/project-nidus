/**
 * Selection logic shared by every "pick from the grantable menu tree" surface (Create/Edit Role's
 * menu picker, Menu Bundle create/edit) — pulled out of OrgRoleDetail.jsx (v914) so the picker's
 * cascade behavior lives in exactly one place.
 */

/**
 * Toggles a menu item in/out of a selection Set. Checking a section (a row with `isCategory`
 * true, e.g. "People & Resources") cascades to select every one of its real sub-items too —
 * unchecking it cascades the same sub-items back off — so a granted section is never an empty,
 * non-functional heading. Returns a new Set; never mutates the one passed in.
 *
 * @param {Set<string>} selectedIds
 * @param {string} menuItemId
 * @param {Array<{id: string, menu_label: string, category: string|null, isCategory: boolean}>} grantableMenuItems
 * @returns {Set<string>}
 */
export function toggleMenuItemSelection(selectedIds, menuItemId, grantableMenuItems) {
  const next = new Set(selectedIds)
  const willSelect = !next.has(menuItemId)
  if (willSelect) next.add(menuItemId)
  else next.delete(menuItemId)

  const item = grantableMenuItems.find((mi) => mi.id === menuItemId)
  if (item?.isCategory) {
    for (const child of grantableMenuItems) {
      if (child.category !== item.menu_label) continue
      if (willSelect) next.add(child.id)
      else next.delete(child.id)
    }
  }
  return next
}

/**
 * Expands a set of representative picker ids into every real `menu_items.id` they stand for.
 * A picker row can dedupe several distinct `menu_items` rows sharing one label (legacy
 * layout/tier duplicates, see `getGrantableMenuItems()`) — `ids` carries all of them, so
 * checking one box must grant/save all of them, not just the representative id.
 *
 * @param {Set<string>|Array<string>} selectedIds
 * @param {Array<{id: string, ids: string[]}>} grantableMenuItems
 * @returns {string[]}
 */
export function expandSelectedMenuItemIds(selectedIds, grantableMenuItems) {
  return Array.from(selectedIds).flatMap((repId) => {
    const item = grantableMenuItems.find((mi) => mi.id === repId)
    return item ? item.ids : [repId]
  })
}

/**
 * Maps a flat list of real `menu_items.id`s (e.g. a saved bundle's items, or a role's current
 * grants) back to the picker's deduped representative row ids, so they can seed a
 * `selectedMenuItemIds` Set. The inverse of `expandSelectedMenuItemIds`.
 *
 * @param {Array<string>} menuItemIds
 * @param {Array<{id: string, ids: string[]}>} grantableMenuItems
 * @returns {Set<string>}
 */
export function representativeIdsForMenuItemIds(menuItemIds, grantableMenuItems) {
  const idSet = new Set(menuItemIds)
  const next = new Set()
  for (const mi of grantableMenuItems) {
    if (mi.ids.some((id) => idSet.has(id))) next.add(mi.id)
  }
  return next
}

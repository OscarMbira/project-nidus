import { useState, useMemo } from 'react'
import { Search, LayoutGrid, PanelLeft, Folder, ChevronDown } from 'lucide-react'

/**
 * Menu item picker + live preview, extracted from OrgRoleDetail.jsx (v914) so Create/Edit Role
 * and Create/Edit Menu Bundle share one picker with no duplicated selection logic.
 *
 * Left: a searchable checkbox list of every grantable menu item (sections show how many
 * sub-items checking them will include). Right: a live preview grouped by section — once a
 * section has anything checked (the section itself, or any sub-item), the WHOLE section's
 * sub-items stay visible in the preview, checked or not, so unchecking one sibling never makes
 * the others disappear.
 *
 * `touchedMenuItemIds` (a superset of `selectedMenuItemIds` that the caller only ever grows,
 * never shrinks, for the life of the form) decides what stays VISIBLE in the preview — a row or
 * section that's ever been checked keeps showing up there, unchecked, so it can be revisited.
 * `selectedMenuItemIds` alone decides each checkbox's CHECKED state. Without this distinction,
 * unchecking a section header itself (or any standalone item with no other checked siblings to
 * keep the group anchored) made it vanish from the preview entirely instead of just unchecking.
 *
 * The caller owns `selectedMenuItemIds`/`touchedMenuItemIds` state and the cascade-aware
 * `onToggle` handler (see `toggleMenuItemSelection` in `utils/menuItemSelectionUtils.js`) — this
 * component is purely presentational.
 */
export default function MenuItemPicker({
  grantableMenuItems,
  selectedMenuItemIds,
  touchedMenuItemIds = selectedMenuItemIds,
  onToggle,
  pickerLabel = 'Sidebar menu access',
  helperText = 'Check every item this should have. You can add or remove more later.',
  previewLabel = 'Sidebar preview',
  previewSubtitle = 'What this will include',
}) {
  const [search, setSearch] = useState('')

  const filteredGrantableMenuItems = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return grantableMenuItems
    return grantableMenuItems.filter((mi) => mi.menu_label?.toLowerCase().includes(q))
  }, [grantableMenuItems, search])

  const childCountByCategoryLabel = useMemo(() => {
    const counts = new Map()
    for (const mi of grantableMenuItems) {
      if (!mi.category) continue
      counts.set(mi.category, (counts.get(mi.category) || 0) + 1)
    }
    return counts
  }, [grantableMenuItems])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {pickerLabel} ({selectedMenuItemIds.size} selected)
          </p>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="pl-8 pr-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>
        {grantableMenuItems.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">No menu items available.</p>
        ) : (
          <div className="max-h-64 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg divide-y divide-gray-100 dark:divide-gray-700">
            {filteredGrantableMenuItems.length === 0 ? (
              <p className="p-3 text-sm text-gray-500 dark:text-gray-400">No items match your search.</p>
            ) : (
              filteredGrantableMenuItems.map((mi) => (
                <label
                  key={mi.id}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300"
                >
                  <input
                    type="checkbox"
                    checked={selectedMenuItemIds.has(mi.id)}
                    onChange={() => onToggle(mi.id)}
                    className="rounded border-gray-300 dark:border-gray-600"
                  />
                  <span className={mi.isCategory ? 'font-semibold' : ''}>{mi.menu_label}</span>
                  {mi.isCategory && childCountByCategoryLabel.get(mi.menu_label) > 0 && (
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      · includes {childCountByCategoryLabel.get(mi.menu_label)} sub-item
                      {childCountByCategoryLabel.get(mi.menu_label) === 1 ? '' : 's'}
                    </span>
                  )}
                </label>
              ))
            )}
          </div>
        )}
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{helperText}</p>
      </div>
      <MenuItemPreview
        grantableMenuItems={grantableMenuItems}
        selectedMenuItemIds={selectedMenuItemIds}
        touchedMenuItemIds={touchedMenuItemIds}
        onToggle={onToggle}
        previewLabel={previewLabel}
        previewSubtitle={previewSubtitle}
      />
    </div>
  )
}

function MenuItemPreview({
  grantableMenuItems,
  selectedMenuItemIds,
  touchedMenuItemIds,
  onToggle,
  previewLabel,
  previewSubtitle,
}) {
  const { topLevel, groups, selectedCount } = useMemo(() => {
    const childrenByCategory = new Map()
    const categoryItemByLabel = new Map()
    for (const mi of grantableMenuItems) {
      if (mi.isCategory) {
        categoryItemByLabel.set(mi.menu_label, mi)
      } else if (mi.category) {
        if (!childrenByCategory.has(mi.category)) childrenByCategory.set(mi.category, [])
        childrenByCategory.get(mi.category).push(mi)
      }
    }

    // Visibility is decided by "ever touched" (touchedMenuItemIds), not "currently checked" —
    // otherwise unchecking a section header itself (or a standalone item with no other checked
    // sibling to anchor the group) would remove it from the preview instead of leaving it there,
    // unchecked, to revisit.
    const activeCategoryLabels = new Set()
    for (const mi of grantableMenuItems) {
      if (!touchedMenuItemIds.has(mi.id)) continue
      if (mi.isCategory) activeCategoryLabels.add(mi.menu_label)
      else if (mi.category) activeCategoryLabels.add(mi.category)
    }

    const topLevelFinal = grantableMenuItems.filter(
      (mi) => touchedMenuItemIds.has(mi.id) && !mi.category && !activeCategoryLabels.has(mi.menu_label),
    )
    const groupList = [...activeCategoryLabels].map((label) => ({
      label,
      categoryId: categoryItemByLabel.get(label)?.id,
      items: childrenByCategory.get(label) || [],
    }))

    return { topLevel: topLevelFinal, groups: groupList, selectedCount: selectedMenuItemIds.size }
  }, [grantableMenuItems, selectedMenuItemIds, touchedMenuItemIds])

  const hasAny = topLevel.length > 0 || groups.length > 0

  return (
    <div className="lg:sticky lg:top-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <PanelLeft className="h-4 w-4 text-gray-400" />
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">{previewLabel}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {previewSubtitle} ({selectedCount})
          </p>
        </div>
      </div>
      <nav className="p-2 max-h-[28rem] overflow-y-auto">
        {!hasAny ? (
          <p className="px-3 py-8 text-sm text-gray-500 dark:text-gray-400 text-center">
            Check items on the left to preview them here.
          </p>
        ) : (
          <div className="space-y-0.5">
            {topLevel.map((item) => (
              <label
                key={item.id}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-700 dark:text-gray-200 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 ${item.isCategory ? 'font-semibold' : 'font-medium'}`}
              >
                <input
                  type="checkbox"
                  checked={selectedMenuItemIds.has(item.id)}
                  onChange={() => onToggle(item.id)}
                  className="rounded border-gray-300 dark:border-gray-600 shrink-0"
                />
                {item.isCategory ? (
                  <Folder className="h-4 w-4 text-gray-400 dark:text-gray-500 shrink-0" />
                ) : (
                  <LayoutGrid className="h-4 w-4 text-gray-400 dark:text-gray-500 shrink-0" />
                )}
                <span className="truncate">{item.menu_label}</span>
              </label>
            ))}
            {groups.map((group) => (
              <div key={group.label}>
                <label className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold text-gray-700 dark:text-gray-200 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
                  <input
                    type="checkbox"
                    checked={!!group.categoryId && selectedMenuItemIds.has(group.categoryId)}
                    onChange={() => onToggle(group.categoryId)}
                    disabled={!group.categoryId}
                    className="rounded border-gray-300 dark:border-gray-600 shrink-0"
                  />
                  <Folder className="h-4 w-4 text-gray-400 dark:text-gray-500 shrink-0" />
                  <span className="truncate">{group.label}</span>
                  <ChevronDown className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500 shrink-0 ml-auto" />
                </label>
                {group.items.map((item) => (
                  <label
                    key={item.id}
                    className="flex items-center gap-2 pl-9 pr-3 py-1.5 rounded-lg text-sm text-gray-600 dark:text-gray-300 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <input
                      type="checkbox"
                      checked={selectedMenuItemIds.has(item.id)}
                      onChange={() => onToggle(item.id)}
                      className="rounded border-gray-300 dark:border-gray-600 shrink-0"
                    />
                    <LayoutGrid className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500 shrink-0" />
                    <span className="truncate">{item.menu_label}</span>
                  </label>
                ))}
              </div>
            ))}
          </div>
        )}
      </nav>
    </div>
  )
}

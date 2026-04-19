import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Eye,
  MousePointer2,
  Save,
  RotateCcw,
  Search,
  Lock,
  Folder,
  ChevronRight,
} from 'lucide-react'
import { useToastContext } from '../../context/ToastContext'
import {
  assertCanEditTargetRole,
  clearSidebarMenuCache,
  fetchAllRoles,
  fetchCurrentUserEditorCapabilities,
  fetchFullMenuTree,
  fetchRoleMenuAccess,
  saveRoleMenuAccess,
} from '../../services/menuManagementService'
import { platformDb } from '../../services/supabase/supabaseClient'

const SYSTEM_ADMIN_NAMES = new Set(['system_admin', 'System Admin'])

function buildTree(flat) {
  const byId = new Map()
  for (const m of flat) {
    byId.set(m.id, { ...m, children: [] })
  }
  const roots = []
  for (const m of byId.values()) {
    if (m.parent_menu_id && byId.has(m.parent_menu_id)) {
      byId.get(m.parent_menu_id).children.push(m)
    } else {
      roots.push(m)
    }
  }
  const sortRec = (nodes) => {
    nodes.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
    nodes.forEach((n) => sortRec(n.children || []))
  }
  sortRec(roots)
  return roots
}

function collectVisibleIds(flat, query) {
  const q = query.trim().toLowerCase()
  if (!q) return null
  const match = new Set()
  for (const m of flat) {
    const label = (m.menu_label || '').toLowerCase()
    const code = (m.menu_code || '').toLowerCase()
    if (label.includes(q) || code.includes(q)) {
      match.add(m.id)
    }
  }
  if (match.size === 0) return new Set()
  const ancestors = new Set(match)
  const byId = new Map(flat.map((m) => [m.id, m]))
  for (const id of match) {
    let cur = byId.get(id)
    while (cur?.parent_menu_id) {
      ancestors.add(cur.parent_menu_id)
      cur = byId.get(cur.parent_menu_id)
    }
  }
  return ancestors
}

function MenuRows({
  nodes,
  depth,
  baseline,
  pending,
  readOnly,
  onToggleView,
  onToggleUse,
}) {
  return (
    <>
      {nodes.map((node) => {
        const hasChildren = node.children?.length > 0
        const cur = pending.get(node.id) ?? baseline.get(node.id) ?? { can_view: false, can_use: false }
        const orig = baseline.get(node.id) ?? { can_view: false, can_use: false }
        const dirty =
          cur.can_view !== orig.can_view || cur.can_use !== orig.can_use
        const locked = readOnly || node.is_system_menu

        return (
          <div key={node.id}>
            <div
              className={`flex flex-wrap items-center gap-2 border-b border-gray-100 py-2 pl-1 dark:border-gray-700 ${
                dirty ? 'bg-amber-50/90 dark:bg-amber-900/25' : ''
              }`}
              style={{ paddingLeft: 8 + depth * 16 }}
            >
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  {hasChildren ? (
                    <Folder className="h-4 w-4 shrink-0 text-gray-500 dark:text-gray-400" />
                  ) : (
                    <ChevronRight className="h-4 w-4 shrink-0 text-gray-400 opacity-60" />
                  )}
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {node.menu_label}
                      </span>
                      {node.is_system_menu && (
                        <span title="System-protected menu" className="inline-flex items-center gap-0.5 text-xs text-gray-500 dark:text-gray-400">
                          <Lock className="h-3.5 w-3.5" /> system
                        </span>
                      )}
                    </div>
                    {node.route_path ? (
                      <div className="truncate text-xs text-gray-500 dark:text-gray-400">
                        {node.route_path}
                      </div>
                    ) : null}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <label className="flex cursor-pointer items-center gap-1 text-sm text-gray-700 dark:text-gray-300">
                    <Eye className="h-4 w-4 text-gray-500" />
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 dark:border-gray-600"
                      checked={cur.can_view}
                      disabled={locked}
                      onChange={() => onToggleView(node.id, !cur.can_view, node.is_system_menu)}
                    />
                  </label>
                  <label className="flex cursor-pointer items-center gap-1 text-sm text-gray-700 dark:text-gray-300">
                    <MousePointer2 className="h-4 w-4 text-gray-500" />
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 dark:border-gray-600"
                      checked={cur.can_use}
                      disabled={locked || !cur.can_view}
                      onChange={() => onToggleUse(node.id, !cur.can_use, node.is_system_menu)}
                    />
                  </label>
                </div>
              </div>
            {hasChildren && (
              <MenuRows
                nodes={node.children}
                depth={depth + 1}
                baseline={baseline}
                pending={pending}
                readOnly={readOnly}
                onToggleView={onToggleView}
                onToggleUse={onToggleUse}
              />
            )}
          </div>
        )
      })}
    </>
  )
}

/**
 * @param {'pmo' | 'admin'} props.variant
 */
export default function RoleMenuCustomiser({ variant }) {
  const toast = useToastContext()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [roles, setRoles] = useState([])
  const [menuFlat, setMenuFlat] = useState([])
  const [roleId, setRoleId] = useState('')
  const [editorCap, setEditorCap] = useState(null)
  const [baseline, setBaseline] = useState(new Map())
  const [pending, setPending] = useState(new Map())
  const [filter, setFilter] = useState('')

  const menuMetaById = useMemo(() => {
    const m = new Map()
    for (const row of menuFlat) {
      m.set(row.id, row)
    }
    return m
  }, [menuFlat])

  const displayFlat = useMemo(() => {
    const q = filter.trim()
    if (!q) return menuFlat
    const ids = collectVisibleIds(menuFlat, filter)
    if (ids.size === 0) return []
    return menuFlat.filter((m) => ids.has(m.id))
  }, [menuFlat, filter])

  const displayTree = useMemo(() => buildTree(displayFlat), [displayFlat])

  const selectedRole = useMemo(
    () => roles.find((r) => r.id === roleId) || null,
    [roles, roleId],
  )

  const roleLocked = useMemo(() => {
    if (!editorCap || !selectedRole) return true
    if (editorCap.isSystemAdmin) return false
    if (variant !== 'pmo') return false
    if (SYSTEM_ADMIN_NAMES.has(selectedRole.role_name)) return true
    if (selectedRole.role_level > (editorCap.pmoRoleLevel ?? -1)) return true
    return false
  }, [editorCap, selectedRole, variant])

  const pendingCount = useMemo(() => {
    let n = 0
    for (const m of menuFlat) {
      const p = pending.get(m.id) ?? baseline.get(m.id) ?? { can_view: false, can_use: false }
      const b = baseline.get(m.id) ?? { can_view: false, can_use: false }
      if (p.can_view !== b.can_view || p.can_use !== b.can_use) n += 1
    }
    return n
  }, [pending, baseline, menuFlat])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [cap, r, m] = await Promise.all([
        fetchCurrentUserEditorCapabilities(),
        fetchAllRoles(),
        fetchFullMenuTree(),
      ])
      setEditorCap(cap)
      setRoles(r)
      setMenuFlat(m)
      setRoleId((prev) => (prev && r.some((x) => x.id === prev) ? prev : r[0]?.id || ''))
    } catch (e) {
      console.error(e)
      toast.error(e?.message || 'Failed to load role menu data')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!roleId) return
    let cancelled = false
    ;(async () => {
      try {
        const map = await fetchRoleMenuAccess(roleId)
        if (cancelled) return
        const full = new Map()
        for (const item of menuFlat) {
          const ex = map.get(item.id)
          full.set(item.id, {
            can_view: ex ? !!ex.can_view : false,
            can_use: ex ? !!ex.can_use : false,
          })
        }
        setBaseline(full)
        setPending(new Map(full))
      } catch (e) {
        console.error(e)
        toast.error(e?.message || 'Failed to load access for role')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [roleId, menuFlat, toast])

  const applyPending = (id, next) => {
    setPending((prev) => {
      const n = new Map(prev)
      n.set(id, next)
      return n
    })
  }

  const onToggleView = useCallback(
    (id, nextView, isSystem) => {
      if (roleLocked || isSystem) return
      const base = pending.get(id) ?? baseline.get(id) ?? { can_view: false, can_use: false }
      let can_view = nextView
      let can_use = base.can_use
      if (!can_view) can_use = false
      applyPending(id, { can_view, can_use })
    },
    [pending, baseline, roleLocked],
  )

  const onToggleUse = useCallback(
    (id, nextUse, isSystem) => {
      if (roleLocked || isSystem) return
      const base = pending.get(id) ?? baseline.get(id) ?? { can_view: false, can_use: false }
      let can_use = nextUse
      let can_view = base.can_view || can_use
      applyPending(id, { can_view, can_use })
    },
    [pending, baseline, roleLocked],
  )

  const handleDiscard = () => {
    setPending(new Map(baseline))
  }

  const handleSave = async () => {
    if (!selectedRole || !editorCap) return
    try {
      assertCanEditTargetRole(variant, selectedRole, editorCap)
    } catch (e) {
      toast.error(e?.message || 'Not allowed')
      return
    }

    const changes = []
    for (const m of menuFlat) {
      const p = pending.get(m.id) ?? baseline.get(m.id) ?? { can_view: false, can_use: false }
      const b = baseline.get(m.id) ?? { can_view: false, can_use: false }
      if (p.can_view !== b.can_view || p.can_use !== b.can_use) {
        changes.push({
          menu_item_id: m.id,
          can_view: p.can_view,
          can_use: p.can_use,
        })
      }
    }

    if (changes.length === 0) {
      toast.success('No changes to save')
      return
    }

    setSaving(true)
    try {
      await saveRoleMenuAccess(
        roleId,
        changes,
        variant,
        selectedRole,
        editorCap,
        menuMetaById,
      )
      const { data: auth } = await platformDb.auth.getUser()
      if (auth?.user?.id) clearSidebarMenuCache(auth.user.id)
      toast.success('Role menu access saved')
      const map = await fetchRoleMenuAccess(roleId)
      const full = new Map()
      for (const item of menuFlat) {
        const ex = map.get(item.id)
        full.set(item.id, {
          can_view: ex ? !!ex.can_view : false,
          can_use: ex ? !!ex.can_use : false,
        })
      }
      setBaseline(full)
      setPending(new Map(full))
    } catch (e) {
      console.error(e)
      toast.error(e?.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  if (loading || !editorCap) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-gray-600 dark:text-gray-300">
        Loading…
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
            Role Menu Access
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Choose a role, adjust visibility and use permissions, then save. Changes apply within a few
            minutes for other users, or immediately for you after save.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {pendingCount > 0 && (
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-900/40 dark:text-amber-100">
              {pendingCount} unsaved
            </span>
          )}
          <button
            type="button"
            onClick={handleDiscard}
            disabled={pendingCount === 0 || saving}
            className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            <RotateCcw className="h-4 w-4" />
            Discard
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={pendingCount === 0 || saving || roleLocked}
            className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {roleLocked && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-100">
          This role is read-only for your account (PMO Admin cannot edit System Admin or higher-level
          roles).
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-end gap-4">
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Role
          </label>
          <select
            value={roleId}
            onChange={(e) => setRoleId(e.target.value)}
            className="min-w-[220px] rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
          >
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.role_display_name || r.role_name} (L{r.role_level})
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-[200px] flex-1">
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Filter
          </label>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search menu items…"
              className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 shadow-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
            />
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-2 text-xs font-medium uppercase tracking-wide text-gray-500 dark:border-gray-700 dark:text-gray-400">
          <span>Menu item</span>
          <div className="flex gap-8 pr-1">
            <span className="flex items-center gap-1">
              <Eye className="h-3.5 w-3.5" /> Visible
            </span>
            <span className="flex items-center gap-1">
              <MousePointer2 className="h-3.5 w-3.5" /> Use
            </span>
          </div>
        </div>
        <div className="max-h-[calc(100vh-16rem)] overflow-y-auto px-2 py-1">
          {filter.trim() && displayFlat.length === 0 ? (
            <div className="px-3 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
              No menu items match your search.
            </div>
          ) : (
            <MenuRows
              nodes={displayTree}
              depth={0}
              baseline={baseline}
              pending={pending}
              readOnly={roleLocked}
              onToggleView={onToggleView}
              onToggleUse={onToggleUse}
            />
          )}
        </div>
      </div>
    </div>
  )
}

import { ChevronRight, ChevronDown, Plus, Pencil, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'

function buildTree(nodes) {
  const byParent = new Map()
  for (const n of nodes || []) {
    const p = n.parent_id || '__root__'
    if (!byParent.has(p)) byParent.set(p, [])
    byParent.get(p).push(n)
  }
  for (const [, arr] of byParent) {
    arr.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0) || (a.wbs_code || '').localeCompare(b.wbs_code || ''))
  }
  return byParent
}

function Row({ node, byParent, depth, expanded, toggle, canEdit, onEdit, onDelete, onAddChild }) {
  const id = node.id
  const kids = byParent.get(id) || []
  const open = expanded.has(id)
  return (
    <div className="select-none">
      <div
        className="flex items-center gap-2 rounded-lg py-1.5 px-2 text-sm text-gray-200 hover:bg-gray-800/80"
        style={{ paddingLeft: 8 + depth * 16 }}
      >
        {kids.length > 0 ? (
          <button type="button" className="p-0.5 text-gray-400 hover:text-white" onClick={() => toggle(id)} aria-expanded={open}>
            {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        ) : (
          <span className="w-5" />
        )}
        <span className="font-mono text-xs text-gray-500">{node.wbs_code || '—'}</span>
        <span className="flex-1 font-medium text-gray-100">{node.title}</span>
        {canEdit && (
          <span className="flex gap-1">
            <button type="button" className="rounded p-1 text-blue-400 hover:bg-gray-700" onClick={() => onAddChild(node)} title="Add child">
              <Plus className="h-4 w-4" />
            </button>
            <button type="button" className="rounded p-1 text-amber-400 hover:bg-gray-700" onClick={() => onEdit(node)} title="Edit">
              <Pencil className="h-4 w-4" />
            </button>
            <button type="button" className="rounded p-1 text-red-400 hover:bg-gray-700" onClick={() => onDelete(node)} title="Delete">
              <Trash2 className="h-4 w-4" />
            </button>
          </span>
        )}
      </div>
      {open &&
        kids.map((k) => (
          <Row
            key={k.id}
            node={k}
            byParent={byParent}
            depth={depth + 1}
            expanded={expanded}
            toggle={toggle}
            canEdit={canEdit}
            onEdit={onEdit}
            onDelete={onDelete}
            onAddChild={onAddChild}
          />
        ))}
    </div>
  )
}

export default function WBSTreeView({ nodes, canEdit, onEdit, onDelete, onAddChild }) {
  const byParent = useMemo(() => buildTree(nodes), [nodes])
  const roots = byParent.get('__root__') || []
  const [expanded, setExpanded] = useState(() => new Set(roots.map((r) => r.id)))

  const toggle = (id) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  if (!roots.length) {
    return <p className="text-sm text-gray-500 dark:text-gray-400">No WBS nodes yet.{canEdit && ' Add a root node to begin.'}</p>
  }

  return (
    <div className="rounded-xl border border-gray-700 bg-gray-900/40 p-3">
      {roots.map((n) => (
        <Row
          key={n.id}
          node={n}
          byParent={byParent}
          depth={0}
          expanded={expanded}
          toggle={toggle}
          canEdit={canEdit}
          onEdit={onEdit}
          onDelete={onDelete}
          onAddChild={onAddChild}
        />
      ))}
    </div>
  )
}

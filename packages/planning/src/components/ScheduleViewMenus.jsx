/**
 * v1265 — the schedule views grouped into four dropdown menus instead of one long row of tabs
 * (owner request 2026-10-13). The group holding the current view is highlighted and shows that
 * view's name. Menus: button + aria-expanded, close on Escape, outside click or choosing a view;
 * arrow keys move through the items.
 *
 * props: groups ([{ key, label, items: [{ sub, label }] }]), to(sub) → link, isActive(sub) → bool
 */
import { useEffect, useRef, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'

function Menu({ group, to, isActive }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const listRef = useRef(null)
  const current = group.items.find((i) => isActive(i.sub))

  useEffect(() => {
    if (!open) return undefined
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    listRef.current?.querySelector('a')?.focus()
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const moveFocus = (e) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
    e.preventDefault()
    const links = [...(listRef.current?.querySelectorAll('a') || [])]
    const i = links.indexOf(document.activeElement)
    const next = e.key === 'ArrowDown' ? (i + 1) % links.length : (i - 1 + links.length) % links.length
    links[next]?.focus()
  }

  return (
    <div ref={ref} className="relative">
      <button type="button" aria-haspopup="true" aria-expanded={open} onClick={() => setOpen(!open)}
        className={`inline-flex items-center gap-1 whitespace-nowrap rounded-lg px-3 py-2 text-sm ${
          current
            ? 'bg-blue-50 font-medium text-blue-700 ring-1 ring-blue-200 dark:bg-blue-900/30 dark:text-blue-200 dark:ring-blue-800'
            : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
        }`}>
        {group.label}{current && <span className="font-normal">: {current.label}</span>}
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      {open && (
        <ul ref={listRef} onKeyDown={moveFocus} aria-label={group.label}
          className="absolute left-0 z-40 mt-1 min-w-[12rem] rounded-lg border border-gray-200 bg-white p-1 shadow-lg dark:border-gray-700 dark:bg-gray-800">
          {group.items.map((item) => (
            <li key={item.sub}>
              <NavLink to={to(item.sub)} onClick={() => setOpen(false)} aria-current={isActive(item.sub) ? 'page' : undefined}
                className={`block rounded-md px-3 py-2 text-sm ${
                  isActive(item.sub)
                    ? 'bg-blue-50 font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-200'
                    : 'text-gray-700 hover:bg-gray-100 focus:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700 dark:focus:bg-gray-700'
                }`}>
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function ScheduleViewMenus({ groups, to, isActive }) {
  return (
    <nav aria-label="Schedule views" className="flex flex-wrap items-center gap-2 border-b border-gray-200 pb-2 dark:border-gray-700">
      {groups.map((g) => <Menu key={g.key} group={g} to={to} isActive={isActive} />)}
    </nav>
  )
}

/**
 * v1239 Slice 5.2 — lean shell for the Nidus Project Planner (D17): header with the trial badge,
 * a sidebar built from the database menu (planner_menu(): role grants ∩ planner allow-list, pln_
 * rows only — never a hard-coded nav tree, rule 25.1), mobile drawer, theme toggle.
 * Presentational only: the Planner app passes the menu tree, workspace status and handlers.
 *
 * props:
 *   menu         tree [{ id, menu_label, route_path, menu_icon, children }]
 *   workspace    { name, userName, email }
 *   status       account_planner_status() jsonb ({ is_trial, days_left, read_only, is_paid })
 *   upgradePath  where the trial badge links (e.g. '/app/upgrade')
 *   onSignOut, theme ('dark'|'light'), onToggleTheme, children
 */
import { createElement, useState } from 'react'
import { NavLink, Link } from 'react-router-dom'
import {
  Menu as MenuIcon, X, LogOut, Sun, Moon, Home, FolderKanban, CalendarRange, BarChart3, Users,
  Clock, Settings, ArrowLeftRight, LayoutGrid, Lightbulb, ChevronDown, ChevronRight, Circle,
} from 'lucide-react'

const ICONS = {
  home: Home, folder: FolderKanban, 'folder-kanban': FolderKanban, calendar: CalendarRange, 'calendar-range': CalendarRange,
  'bar-chart-2': BarChart3, chart: BarChart3, users: Users, clock: Clock, settings: Settings, exchange: ArrowLeftRight,
  'arrow-left-right': ArrowLeftRight, 'layout-grid': LayoutGrid, lightbulb: Lightbulb,
}
const iconFor = (name) => ICONS[String(name || '').toLowerCase()] || Circle

export function TrialBadge({ status, upgradePath }) {
  if (!status || status.edition !== 'planner' || status.is_paid) return null
  if (status.read_only) {
    return (
      <Link to={upgradePath} className="px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200">
        Trial ended — read only · Upgrade
      </Link>
    )
  }
  if (!status.is_trial) return null
  const d = status.days_left ?? 0
  return (
    <Link to={upgradePath} className={`px-2.5 py-1 rounded-full text-xs font-medium ${d <= 3 ? 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100' : 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200'}`}>
      Trial · {d} day{d === 1 ? '' : 's'} left
    </Link>
  )
}

function NavItem({ node, depth, onNavigate }) {
  const [open, setOpen] = useState(true)
  const pad = { paddingLeft: `${0.75 + depth * 0.75}rem` }
  if (node.children?.length && !node.route_path) {
    return (
      <li>
        <button type="button" onClick={() => setOpen(!open)} style={pad}
          className="w-full flex items-center gap-2 pr-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
          aria-expanded={open}>
          {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          {node.menu_label}
        </button>
        {open && <ul>{node.children.map((c) => <NavItem key={c.id} node={c} depth={depth + 1} onNavigate={onNavigate} />)}</ul>}
      </li>
    )
  }
  return (
    <li>
      <NavLink to={node.route_path} end={node.route_path === '/app'} onClick={onNavigate} style={pad}
        className={({ isActive }) => `flex items-center gap-2 pr-3 py-2 text-sm rounded-md mx-2 ${
          isActive ? 'bg-blue-600 text-white' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
        }`}>
        {createElement(iconFor(node.menu_icon), { className: 'h-4 w-4 shrink-0' })}
        <span className="truncate">{node.menu_label}</span>
      </NavLink>
      {node.children?.length > 0 && <ul>{node.children.map((c) => <NavItem key={c.id} node={c} depth={depth + 1} onNavigate={onNavigate} />)}</ul>}
    </li>
  )
}

export default function PlannerShell({ menu = [], workspace = {}, status = null, upgradePath = '/app/upgrade', onSignOut, theme = 'dark', onToggleTheme, children }) {
  const [drawer, setDrawer] = useState(false)
  const sidebar = (
    <nav aria-label="Planner menu" className="py-3 overflow-y-auto h-full">
      {menu.length === 0 ? (
        <p className="px-4 text-sm text-gray-500 dark:text-gray-400">No menu items are available to your role yet.</p>
      ) : (
        <ul className="space-y-0.5">{menu.map((n) => <NavItem key={n.id} node={n} depth={0} onNavigate={() => setDrawer(false)} />)}</ul>
      )}
    </nav>
  )
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      <header className="h-14 shrink-0 flex items-center justify-between gap-3 px-3 sm:px-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="flex items-center gap-2 min-w-0">
          <button type="button" className="lg:hidden p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800" aria-label="Open menu" onClick={() => setDrawer(true)}>
            <MenuIcon className="h-5 w-5" />
          </button>
          <Link to="/app" className="font-semibold whitespace-nowrap">Nidus Planner</Link>
          {workspace.name && <span className="hidden sm:inline text-sm text-gray-500 dark:text-gray-400 truncate">· {workspace.name}</span>}
        </div>
        <div className="flex items-center gap-2">
          <TrialBadge status={status} upgradePath={upgradePath} />
          {onToggleTheme && (
            <button type="button" onClick={onToggleTheme} aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800">
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          )}
          <span className="hidden md:inline text-sm text-gray-600 dark:text-gray-300 max-w-[12rem] truncate" title={workspace.email}>{workspace.userName || workspace.email}</span>
          {onSignOut && (
            <button type="button" onClick={onSignOut} aria-label="Sign out" title="Sign out" className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800">
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
      </header>
      <div className="flex flex-1 min-h-0">
        <aside className="hidden lg:block w-64 shrink-0 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">{sidebar}</aside>
        {drawer && (
          <div className="lg:hidden fixed inset-0 z-40 flex" role="dialog" aria-modal="true" aria-label="Menu">
            <div className="w-72 max-w-[85vw] bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col">
              <div className="h-14 flex items-center justify-between px-3 border-b border-gray-200 dark:border-gray-800">
                <span className="font-semibold">Menu</span>
                <button type="button" aria-label="Close menu" onClick={() => setDrawer(false)} className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"><X className="h-5 w-5" /></button>
              </div>
              <div className="flex-1 min-h-0">{sidebar}</div>
            </div>
            <button type="button" aria-label="Close menu" className="flex-1 bg-black/40" onClick={() => setDrawer(false)} />
          </div>
        )}
        <main className="flex-1 min-w-0 overflow-x-hidden">{children}</main>
      </div>
    </div>
  )
}

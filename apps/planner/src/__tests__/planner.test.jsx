// v1239 Slices 5–8 — Planner app: menu tree, route guard, sign-up checks, invitations, checkout.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

vi.mock('@nidus/supabase', () => ({ platformDb: { rpc: vi.fn(async () => ({ data: false, error: null })), auth: {}, from: vi.fn() }, simDb: {} }))

import { buildMenuTree } from '../lib/plannerApi.js'
import { isRouteAllowed, sectionOf, flattenMenu } from '../lib/routeGuard.js'
import { validateSignup } from '../pages/public/AuthPages.jsx'
import { buildInviteEmail } from '../lib/inviteEmail.js'
import { inviteTokenFromPath, rememberPendingInvite, readPendingInvite, clearPendingInvite } from '../lib/pendingInvite.js'
import { checkoutAmount } from '../lib/billingApi.js'
import { planCtaPath, rememberPendingPlan, readPendingPlan, clearPendingPlan } from '../lib/pendingPlan.js'
import { TrialBadge } from '@nidus/ui/PlannerShell'

const rows = [
  { id: 'h', menu_code: 'pln_home', menu_label: 'Home', route_path: '/app', parent_menu_id: null, sort_order: 10 },
  { id: 's', menu_code: 'pln_schedule', menu_label: 'Schedule', route_path: null, parent_menu_id: null, sort_order: 30 },
  { id: 'g', menu_code: 'pln_schedule_gantt', menu_label: 'Gantt', route_path: '/app/schedule/gantt', parent_menu_id: 's', sort_order: 20 },
  { id: 't', menu_code: 'pln_schedule_tasks', menu_label: 'Plan grid', route_path: '/app/schedule/activities', parent_menu_id: 's', sort_order: 10 },
  { id: 'e', menu_code: 'pln_settings', menu_label: 'Settings', route_path: null, parent_menu_id: null, sort_order: 90 },
  { id: 'leak', menu_code: 'plat_pm_planning_gantt', menu_label: 'Gantt (Platform)', route_path: '/platform/projects/:id/schedule/gantt', parent_menu_id: null, sort_order: 1 },
]

describe('planner sidebar', () => {
  it('builds a sorted tree, hides empty groups, and never shows a plat_/sim_ row', () => {
    const tree = buildMenuTree(rows)
    expect(tree.map((n) => n.menu_code)).toEqual(['pln_home', 'pln_schedule'])
    expect(tree[1].children.map((n) => n.menu_label)).toEqual(['Plan grid', 'Gantt'])
    expect(flattenMenu(tree).some((n) => !n.menu_code.startsWith('pln_'))).toBe(false)
  })
})

describe('route guard', () => {
  const granted = flattenMenu(buildMenuTree(rows))
  it('allows sections the menu grants, plus home, invite and upgrade', () => {
    expect(sectionOf('/app/schedule/gantt?projectId=X')).toBe('schedule')
    expect(isRouteAllowed('/app', granted)).toBe(true)
    expect(isRouteAllowed('/app/schedule/tasks/TSK-1/edit', granted)).toBe(true)
    expect(isRouteAllowed('/app/invite/abc123', granted)).toBe(true)
    expect(isRouteAllowed('/app/upgrade', granted)).toBe(true)
  })
  it('redirects sections the role does not have', () => {
    expect(isRouteAllowed('/app/planning/health', granted)).toBe(false)
    expect(isRouteAllowed('/app/billing', granted)).toBe(false)
    expect(isRouteAllowed('/app/members', granted)).toBe(false)
  })
  it('public pages are never guarded', () => {
    expect(isRouteAllowed('/pricing', [])).toBe(true)
  })
})

describe('sign-up', () => {
  it('asks only for name, email and a password of 8+ characters', () => {
    expect(validateSignup({ fullName: '', email: 'a@b.co', password: '12345678' })).toMatch(/name/)
    expect(validateSignup({ fullName: 'Ann', email: 'nope', password: '12345678' })).toMatch(/email/)
    expect(validateSignup({ fullName: 'Ann', email: 'a@b.co', password: 'short' })).toMatch(/8 characters/)
    expect(validateSignup({ fullName: 'Ann', email: 'a@b.co', password: '12345678' })).toBeNull()
  })
})

describe('invitations', () => {
  beforeEach(() => clearPendingInvite())

  it('builds the planner email with the link and escapes names', () => {
    const { subject, html, text } = buildInviteEmail({ inviterName: 'Sam <b>', projectName: 'Bridge', workspaceName: 'Acme', roleName: 'plan_viewer', link: 'https://p/app/invite/t1' })
    expect(subject).toContain('Bridge')
    expect(html).toContain('https://p/app/invite/t1')
    expect(html).toContain('Sam &lt;b&gt;')
    expect(html).toContain('Viewer')
    expect(text).not.toContain('<')
  })

  it('remembers an invite token across sign-up', () => {
    expect(inviteTokenFromPath('/app/invite/abc123')).toBe('abc123')
    expect(inviteTokenFromPath('/app/schedule')).toBeNull()
    rememberPendingInvite('abc123')
    expect(readPendingInvite()).toBe('abc123')
    clearPendingInvite()
    expect(readPendingInvite()).toBeNull()
  })
})

describe('checkout', () => {
  it('charges per seat for the planner and the plan price for an upgrade', () => {
    expect(checkoutAmount({ price: 7.5 }, { action: 'planner_subscribe', seats: 4 })).toBe(30)
    expect(checkoutAmount({ price: 7.5 }, { action: 'planner_subscribe', seats: 0 })).toBe(7.5)
    expect(checkoutAmount({ price: 49 }, { action: 'planner_upgrade_platform', seats: 10 })).toBe(49)
  })
})

describe('paid sign-up from the pricing page', () => {
  it('sends visitors to sign-up and signed-in users to checkout, with the plan', () => {
    expect(planCtaPath('p 1', false)).toBe('/signup?plan=p%201')
    expect(planCtaPath('p1', true)).toBe('/app/upgrade?plan=p1')
  })
  it('remembers the chosen plan across email confirmation', () => {
    rememberPendingPlan('p1')
    expect(readPendingPlan()).toBe('p1')
    clearPendingPlan()
    expect(readPendingPlan()).toBeNull()
  })
})

describe('trial badge', () => {
  const at = (status) => render(<MemoryRouter><TrialBadge status={status} upgradePath="/app/upgrade" /></MemoryRouter>)
  it('shows days left during the trial', () => {
    at({ edition: 'planner', is_trial: true, days_left: 1 })
    expect(screen.getByText(/1 day left/)).toBeInTheDocument()
  })
  it('shows read-only after the trial', () => {
    at({ edition: 'planner', read_only: true })
    expect(screen.getByText(/read only/)).toBeInTheDocument()
  })
  it('shows nothing on a paid or Platform account', () => {
    const { container } = at({ edition: 'planner', is_paid: true })
    expect(container.textContent).toBe('')
  })
})

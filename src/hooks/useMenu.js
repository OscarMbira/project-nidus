import { useState, useEffect } from 'react'
import { platformDb } from '../services/supabaseClient'

const MENU_CACHE_TTL = 5 * 60 * 1000 // 5 minutes
const MENU_CACHE_KEY_PREFIX = 'nidus_menu_v18_'
const LEGACY_MENU_CACHE_KEY_PREFIX = 'nidus_menu_'

function getCacheKey(userId) {
  return `${MENU_CACHE_KEY_PREFIX}${userId}`
}

function getCacheKeys(userId) {
  return [
    `${MENU_CACHE_KEY_PREFIX}${userId}`,
    `nidus_menu_v17_${userId}`,
    `nidus_menu_v16_${userId}`,
    `nidus_menu_v15_${userId}`,
    `nidus_menu_v14_${userId}`,
    `nidus_menu_v13_${userId}`,
    `nidus_menu_v5_${userId}`,
    `nidus_menu_v4_${userId}`,
    `nidus_menu_v3_${userId}`,
    `nidus_menu_v2_${userId}`,
    `${LEGACY_MENU_CACHE_KEY_PREFIX}${userId}`,
  ]
}

function readFromStorage(storage, key) {
  try {
    if (!storage) return null
    return storage.getItem(key)
  } catch {
    return null
  }
}

function writeToStorage(storage, key, value) {
  try {
    if (!storage) return
    storage.setItem(key, value)
  } catch {
    // ignore storage write failures (private mode/quota)
  }
}

function readCache(userId) {
  try {
    for (const key of getCacheKeys(userId)) {
      const raw = readFromStorage(localStorage, key) ?? readFromStorage(sessionStorage, key)
      if (!raw) continue
      const { items, at } = JSON.parse(raw)
      if (Date.now() - at < MENU_CACHE_TTL) return items
    }
    return null
  } catch { return null }
}

/** Returns cached menu items even if expired (for fallback when fetch fails). */
function readStaleCache(userId) {
  try {
    for (const key of getCacheKeys(userId)) {
      const raw = readFromStorage(localStorage, key) ?? readFromStorage(sessionStorage, key)
      if (!raw) continue
      const { items } = JSON.parse(raw)
      if (Array.isArray(items)) return items
    }
    return null
  } catch { return null }
}

function writeCache(userId, items) {
  try {
    const key = getCacheKey(userId)
    const payload = JSON.stringify({ items, at: Date.now() })
    writeToStorage(localStorage, key, payload)
    writeToStorage(sessionStorage, key, payload)
  } catch { /* storage unavailable */ }
}

function buildHierarchy(menuRows = [], canUseById = new Map()) {
  const menuMap = new Map()
  const rootMenus = []

  menuRows.forEach((menu) => {
    if (!menu || !menu.is_visible || !menu.is_active) return
    menuMap.set(menu.id, { ...menu, canUse: !!canUseById.get(menu.id), children: [] })
  })

  menuMap.forEach((menu) => {
    if (menu.parent_menu_id) {
      const parent = menuMap.get(menu.parent_menu_id)
      if (parent) parent.children.push(menu)
      else rootMenus.push(menu)
    } else {
      rootMenus.push(menu)
    }
  })

  const sort = (menus) =>
    menus
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
      .map(m => ({ ...m, children: sort(m.children || []) }))

  return sort(rootMenus)
}

/** Inject Industry Plan menu links for PM sidebar when DB seed (v577) was not applied. */
function ensureIndustryPlanMenusForPm(menuItems = []) {
  const roots = Array.isArray(menuItems) ? menuItems : []
  const norm = (v) => String(v || '').trim().toLowerCase()
  const hasIndustryBrowse = (nodes) => {
    for (const n of nodes) {
      if (norm(n.menu_code) === 'pm_industry_templates_browse') return true
      if (/\/platform\/industry-templates\b/.test(String(n.route_path || ''))) return true
      if (n.children?.length && hasIndustryBrowse(n.children)) return true
    }
    return false
  }
  if (hasIndustryBrowse(roots)) return roots

  const industryBrowse = {
    id: 'virtual-pm-industry-templates-browse',
    menu_code: 'pm_industry_templates_browse',
    menu_label: 'Industry Templates',
    menu_description: 'Browse PMO industry plan blueprints',
    parent_menu_id: null,
    menu_level: 2,
    sort_order: 50,
    route_path: '/platform/industry-templates',
    external_url: null,
    menu_icon: 'layers',
    menu_color: null,
    badge_text: null,
    badge_color: null,
    is_visible: true,
    is_active: true,
    canUse: false,
    children: [],
  }

  const industryPlan = {
    ...industryBrowse,
    id: 'virtual-pm-industry-plan',
    menu_code: 'pm_industry_plan',
    menu_label: 'My Industry Plan',
    menu_description: 'Project industry plan copy',
    sort_order: 60,
    route_path: '/platform/projects/__PROJECT__/industry-plan',
    menu_icon: 'map',
    canUse: true,
  }

  const attachToKnowledge = (nodes) => {
    for (const n of nodes) {
      if (
        norm(n.menu_code) === 'pm_section_knowledge_resources' ||
        norm(n.menu_label) === 'knowledge & resources'
      ) {
        const children = [...(n.children || [])]
        if (!children.some((c) => norm(c.menu_code) === 'pm_industry_templates_browse')) {
          children.push(industryBrowse, industryPlan)
        }
        n.children = children.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
        return true
      }
      if (n.children?.length && attachToKnowledge(n.children)) return true
    }
    return false
  }

  const clone = roots.map((n) => ({ ...n, children: [...(n.children || [])] }))
  if (!attachToKnowledge(clone)) {
    clone.push({
      ...industryBrowse,
      menu_level: 1,
      parent_menu_id: null,
      sort_order: 295,
    })
  }
  return clone
}

/** Merge legacy split invite links into Send Role Invitation (v596). */
function ensurePmSendRoleInvitationMenu(menuItems = []) {
  const roots = Array.isArray(menuItems) ? menuItems : []
  const norm = (v) => String(v || '').trim().toLowerCase()
  const legacyCodes = new Set([
    'pm_invite_team_manager',
    'pm_invite_team_member',
    'pm_invite_project_member',
  ])

  const stripLegacy = (nodes) =>
    (nodes || [])
      .filter((n) => !legacyCodes.has(norm(n.menu_code)))
      .map((n) => ({ ...n, children: stripLegacy(n.children) }))

  const hasSendRole = (nodes) => {
    for (const n of nodes) {
      if (norm(n.menu_code) === 'pm_send_role_invitation') return true
      if (/action=send-invite/.test(String(n.route_path || ''))) return true
      if (n.children?.length && hasSendRole(n.children)) return true
    }
    return false
  }

  const cleaned = stripLegacy(roots)
  if (hasSendRole(cleaned)) return cleaned

  const sendItem = {
    id: 'virtual-pm-send-role-invitation',
    menu_code: 'pm_send_role_invitation',
    menu_label: 'Send Role Invitation',
    menu_description: 'Invite one user (choose role) or upload a bulk invite file',
    parent_menu_id: null,
    menu_level: 2,
    sort_order: 20,
    route_path: '/app/project-members?action=send-invite',
    external_url: null,
    menu_icon: 'mail',
    menu_color: null,
    badge_text: null,
    badge_color: null,
    is_visible: true,
    is_active: true,
    canUse: true,
    children: [],
  }

  const attachToTeamMembers = (nodes) => {
    for (const n of nodes) {
      if (
        norm(n.menu_code) === 'pm_team_members_section' ||
        norm(n.menu_label) === 'team & members'
      ) {
        const children = stripLegacy(n.children || [])
        if (!children.some((c) => norm(c.menu_code) === 'pm_send_role_invitation')) {
          children.push(sendItem)
        }
        n.children = children.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
        return true
      }
      if (n.children?.length && attachToTeamMembers(n.children)) return true
    }
    return false
  }

  const clone = cleaned.map((n) => ({ ...n, children: [...(n.children || [])] }))
  attachToTeamMembers(clone)
  return clone
}

/** Inject Invitation Status under Team & Members when DB seed (v595) was not applied. */
function ensurePmInvitationTrackerMenu(menuItems = []) {
  const roots = Array.isArray(menuItems) ? menuItems : []
  const norm = (v) => String(v || '').trim().toLowerCase()
  const hasTracker = (nodes) => {
    for (const n of nodes) {
      if (norm(n.menu_code) === 'pm_invitation_tracker') return true
      if (/\/app\/invitation-tracker\b/.test(String(n.route_path || ''))) return true
      if (n.children?.length && hasTracker(n.children)) return true
    }
    return false
  }
  if (hasTracker(roots)) return roots

  const trackerItem = {
    id: 'virtual-pm-invitation-tracker',
    menu_code: 'pm_invitation_tracker',
    menu_label: 'Invitation Status',
    menu_description: 'Track all project invitations you have sent',
    parent_menu_id: null,
    menu_level: 2,
    sort_order: 35,
    route_path: '/app/invitation-tracker',
    external_url: null,
    menu_icon: 'mail-check',
    menu_color: null,
    badge_text: null,
    badge_color: null,
    is_visible: true,
    is_active: true,
    canUse: true,
    children: [],
  }

  const attachToTeamMembers = (nodes) => {
    for (const n of nodes) {
      if (
        norm(n.menu_code) === 'pm_team_members_section' ||
        norm(n.menu_label) === 'team & members'
      ) {
        const children = [...(n.children || [])]
        if (!children.some((c) => norm(c.menu_code) === 'pm_invitation_tracker')) {
          children.push(trackerItem)
        }
        n.children = children.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
        return true
      }
      if (n.children?.length && attachToTeamMembers(n.children)) return true
    }
    return false
  }

  const clone = roots.map((n) => ({ ...n, children: [...(n.children || [])] }))
  if (!attachToTeamMembers(clone)) {
    clone.push({
      ...trackerItem,
      menu_level: 1,
      sort_order: 51,
      children: [],
    })
  }
  return clone
}

/** Detect team-member context: no PMO, no PM signals, menu codes are all tm_ prefixed */
function isTeamMemberContext(baseline = []) {
  const norm = (v) => String(v || '').trim().toLowerCase()
  const hasTeamMemberCode = baseline.some(n => norm(n.menu_code).startsWith('tm_'))
  const hasPMSignal = baseline.some(n => {
    const s = `${norm(n.menu_code)} ${norm(n.route_path)}`
    return s.includes('action=send-invite') || s.includes('/pm/planning') || s.includes('pm_planning')
  })
  return hasTeamMemberCode || (!hasPMSignal && baseline.some(n => {
    const s = norm(n.menu_label)
    return s === 'my work' || s === 'timesheets' || s === 'communications'
  }))
}

/** Detect team lead/manager: has workstream plans or charter edit access */
function isTeamLeadContext(baseline = []) {
  const norm = (v) => String(v || '').trim().toLowerCase()
  return baseline.some(n => {
    const code = norm(n.menu_code)
    const route = norm(n.route_path || '')
    return (
      code === 'tm_team_workstream_plans' ||
      code === 'tm_team_charter_edit' ||
      code === 'tm_team_timesheets' ||
      route.includes('/platform/plans/team-workstreams') ||
      route.includes('/team-charter/edit') ||
      route.includes('/timesheets/team')
    )
  })
}

function makeVirtual(id, code, label, description, route, icon, canUse = true, sortOrder = 0, parentId = null) {
  return {
    id,
    menu_code: code,
    menu_label: label,
    menu_description: description,
    parent_menu_id: parentId,
    menu_level: parentId ? 2 : 1,
    sort_order: sortOrder,
    route_path: route,
    external_url: null,
    menu_icon: icon,
    menu_color: null,
    badge_text: null,
    badge_color: null,
    is_visible: true,
    is_active: true,
    canUse,
    children: [],
  }
}

/** Build the full team-member virtual sidebar when DB seed hasn't been applied yet */
function ensureTeamMemberMenus(menuItems = [], isLead = false) {
  const norm = (v) => String(v || '').trim().toLowerCase()

  const hasTmSection = (nodes) =>
    nodes.some(n => norm(n.menu_code).startsWith('tm_section_'))

  if (hasTmSection(menuItems)) return menuItems

  const section = (id, code, label, icon, sort, route = null) =>
    makeVirtual(id, code, label, label, route, icon, true, sort)

  const leaf = (id, code, label, route, icon, sort, parentId, canUse = true) =>
    makeVirtual(id, code, label, label, route, icon, canUse, sort, parentId)

  const sectionDashboard    = section('vtm-s-dash',    'tm_section_dashboard',      'Dashboard',             'layout-dashboard',  10, '/platform/dashboard')
  const sectionMyWork       = section('vtm-s-mw',      'tm_section_my_work',        'My Work',               'user-check',        20)
  const sectionMyProjects   = section('vtm-s-mp',      'tm_section_my_projects',    'My Projects',           'folder-kanban',     30)
  const sectionPlans        = section('vtm-s-pl',      'tm_section_plans',          'Plans',                 'git-branch',        40)
  const sectionControls     = section('vtm-s-cr',      'tm_section_controls',       'Controls & Registers',  'list-checks',       50)
  const sectionForms        = section('vtm-s-fm',      'tm_section_forms',          'Process Group Forms',   'file-text',         60)
  const sectionCharter      = section('vtm-s-ch',      'tm_section_team_charter',   'Team Charter',          'shield-check',      70)
  const sectionComms        = section('vtm-s-co',      'tm_section_communications', 'Communications',        'message-square',    80)
  const sectionTeam         = section('vtm-s-tm',      'tm_section_team',           'Team & Collaboration',  'users',             90)
  const sectionStakeholders = section('vtm-s-sh',      'tm_section_stakeholders',   'Stakeholders',          'network',           100)
  const sectionReporting    = section('vtm-s-rp',      'tm_section_reporting',      'Reporting & Status',    'bar-chart-2',       110)
  const sectionTimesheets   = section('vtm-s-ts',      'tm_section_timesheets',     'Timesheets',            'clock',             120)
  const sectionKnowledge    = section('vtm-s-kn',      'tm_section_knowledge',      'Knowledge & Resources', 'book-open',         130)
  const sectionAppointment  = section('vtm-s-ap',      'tm_section_appointment',    'Appointment Status',    'mail-check',        140, '/app/invitation-tracker')
  const sectionSettings     = section('vtm-s-st',      'tm_section_settings',       'Profile / Settings',    'settings',          150, '/platform/settings')

  sectionMyWork.children = [
    leaf('vtm-tasks',     'tm_my_tasks',       'My Tasks',           '/platform/tasks',             'check-square', 10, 'vtm-s-mw'),
    leaf('vtm-board',     'tm_task_board',     'Task Board',         '/platform/tasks/board',       'layout',       20, 'vtm-s-mw'),
    leaf('vtm-cal',       'tm_task_calendar',  'Task Calendar',      '/platform/tasks/calendar',    'calendar',     30, 'vtm-s-mw', false),
    leaf('vtm-dlog',      'tm_daily_log',      'Daily Log',          '/app/daily-log/my-entries',   'notebook-pen', 40, 'vtm-s-mw'),
    leaf('vtm-lesson',    'tm_lesson_actions', 'My Lesson Actions',  '/app/lessons/my-actions',     'lightbulb',    50, 'vtm-s-mw'),
    leaf('vtm-issue',     'tm_issue_actions',  'My Issue Actions',   '/app/issues/my-actions',      'alert-triangle', 60, 'vtm-s-mw'),
  ]

  sectionMyProjects.children = [
    leaf('vtm-proj',    'tm_projects_list',   'My Projects',      '/platform/projects',   'folder',      10, 'vtm-s-mp'),
    leaf('vtm-members', 'tm_proj_members',    'Project Members',  '/app/project-members', 'users',       20, 'vtm-s-mp'),
  ]

  sectionPlans.children = [
    leaf('vtm-myplans', 'tm_my_plans',      'My Plans',           '/platform/plans/my-plans',        'user-square',  10, 'vtm-s-pl'),
    leaf('vtm-newplan', 'tm_new_plan',      'Create New Plan',    '/platform/plans/new',              'plus-circle',  20, 'vtm-s-pl'),
    leaf('vtm-draftq',  'tm_plan_drafts',   'Draft Plans',        '/pm/planning/microplans/drafts',   'file-clock',   30, 'vtm-s-pl'),
    leaf('vtm-planov',  'tm_plans_overview','Plans Overview',     '/pm/planning/microplans',          'layout-grid',  40, 'vtm-s-pl'),
    ...(isLead ? [leaf('vtm-twp', 'tm_team_workstream_plans', 'Team Workstream Plans', '/platform/plans/team-workstreams', 'network', 50, 'vtm-s-pl')] : []),
  ]

  sectionControls.children = [
    leaf('vtm-risk',       'tm_risk_register',   'Risk Register',    '/pmo/oversight/risk-register',    'shield-alert',    10, 'vtm-s-cr'),
    leaf('vtm-issues',     'tm_issue_log',       'Issue Log',        '/pmo/oversight/issue-register',   'alert-circle',    20, 'vtm-s-cr'),
    leaf('vtm-change',     'tm_change_log',      'Change Log',       '/platform/change-requests',       'git-pull-request',30, 'vtm-s-cr'),
    leaf('vtm-delay',      'tm_delay_log',       'Delay Log',        '/platform/delays',                'clock-4',         40, 'vtm-s-cr'),
    leaf('vtm-defect',     'tm_defect_register', 'Defect Register',  '/platform/testing/defects',       'bug',             50, 'vtm-s-cr'),
    leaf('vtm-decision',   'tm_decision_log',    'Decision Log',     '/platform/governance/decisions',  'gavel',           60, 'vtm-s-cr'),
    leaf('vtm-decision-new','tm_new_decision',   'New Decision',     '/platform/governance/decisions/new','plus-circle',    70, 'vtm-s-cr'),
  ]

  sectionForms.children = [
    leaf('vtm-finit',  'tm_form_initiating', 'Initiating',           '/platform/projects/:projectId/forms?group=Initiating', 'play-circle',  10, 'vtm-s-fm', false),
    leaf('vtm-fplan',  'tm_form_planning',   'Planning',             '/platform/projects/:projectId/forms?group=Planning',   'map',          20, 'vtm-s-fm', false),
    leaf('vtm-fexec',  'tm_form_executing',  'Executing',            '/platform/projects/:projectId/forms?group=Executing',  'zap',          30, 'vtm-s-fm', false),
    leaf('vtm-fmon',   'tm_form_monitoring', 'Monitoring & Control', '/platform/projects/:projectId/forms?group=Monitoring', 'activity',     40, 'vtm-s-fm', false),
    leaf('vtm-fclose', 'tm_form_closing',    'Closing',              '/platform/projects/:projectId/forms?group=Closing',    'check-circle', 50, 'vtm-s-fm', false),
    leaf('vtm-fdraft', 'tm_draft_forms',     'My Draft Forms',       '/platform/projects/:projectId/forms/drafts',           'file-clock',   60, 'vtm-s-fm'),
  ]

  sectionCharter.children = [
    leaf('vtm-charter-view', 'tm_team_charter_view', 'View Team Charter', '/platform/team-charter',      'shield-check', 10, 'vtm-s-ch'),
    ...(isLead ? [leaf('vtm-charter-edit', 'tm_team_charter_edit', 'Edit Team Charter', '/platform/team-charter/edit', 'file-edit', 20, 'vtm-s-ch')] : []),
  ]

  sectionComms.children = [
    leaf('vtm-chat',  'tm_team_chat',   'Team Chat',   '/platform/communications/chat',        'message-circle', 10, 'vtm-s-co'),
    leaf('vtm-video', 'tm_video_calls', 'Video Calls', '/platform/communications/video-calls', 'video',          20, 'vtm-s-co'),
    leaf('vtm-voice', 'tm_voice_calls', 'Voice Calls', '/platform/communications/voice-calls', 'phone',          30, 'vtm-s-co'),
  ]

  sectionTeam.children = [
    leaf('vtm-myteam', 'tm_my_team',        'My Team',       '/platform/teams/my-team', 'users',       10, 'vtm-s-tm', false),
    leaf('vtm-teamdir','tm_team_directory', 'Team Directory', '/platform/teams',         'address-book',20, 'vtm-s-tm', false),
  ]

  sectionStakeholders.children = [
    leaf('vtm-sreg', 'tm_stakeholder_register', 'Stakeholder Register', '/platform/stakeholders/register', 'network',   10, 'vtm-s-sh'),
    leaf('vtm-sana', 'tm_stakeholder_analysis', 'Stakeholder Analysis', '/platform/stakeholders/analysis', 'pie-chart', 20, 'vtm-s-sh'),
  ]

  sectionReporting.children = [
    leaf('vtm-highlight',   'tm_highlight_reports',  'Highlight Reports',   '/pm/reporting/highlight-reports',  'bar-chart-2',  10, 'vtm-s-rp'),
    leaf('vtm-checkpoint',  'tm_checkpoint_reports', 'Checkpoint Reports',  '/pm/reporting/checkpoint-reports', 'check-square', 20, 'vtm-s-rp'),
    leaf('vtm-replib',      'tm_reports_library',    'Reports Library',     '/platform/reports',                'library',      30, 'vtm-s-rp'),
  ]

  sectionTimesheets.children = [
    leaf('vtm-mytime', 'tm_my_timesheets',   'My Timesheets',   '/platform/timesheets',      'clock',       10, 'vtm-s-ts'),
    leaf('vtm-logtime','tm_log_time',        'Log Time',         '/platform/timesheets/new',  'plus-circle', 20, 'vtm-s-ts'),
    ...(isLead ? [leaf('vtm-teamtime', 'tm_team_timesheets', 'Team Timesheets', '/platform/timesheets/team', 'users-round', 30, 'vtm-s-ts')] : []),
  ]

  sectionKnowledge.children = [
    leaf('vtm-indtemp', 'tm_industry_templates', 'Industry Templates', '/platform/industry-templates', 'layers', 10, 'vtm-s-kn'),
  ]

  return [
    sectionDashboard,
    sectionMyWork,
    sectionMyProjects,
    sectionPlans,
    sectionControls,
    sectionForms,
    sectionCharter,
    sectionComms,
    sectionTeam,
    sectionStakeholders,
    sectionReporting,
    sectionTimesheets,
    sectionKnowledge,
    sectionAppointment,
    sectionSettings,
  ]
}

function applyRoleSidebarRevamp(menuItems = []) {
  const roots = Array.isArray(menuItems) ? menuItems : []
  const norm = (value) => String(value || '').trim().toLowerCase()
  const score = (node) => ((node?.children?.length || 0) * 100) + (node?.sort_order || 0)
  const signal = (node) => `${norm(node?.menu_code)} ${norm(node?.menu_label)} ${norm(node?.route_path)}`
  const route = (node) => String(node?.route_path || '').trim()
  const label = (node) => norm(node?.menu_label)

  const normalizeNode = (node) => {
    const next = { ...node }
    if (route(next) === '/platform/pmo-admin/branding') {
      next.route_path = '/platform/organisation/branding'
    }
    return next
  }

  const chooseBest = (a, b) => {
    if (!a) return b
    if (!b) return a
    const sa = signal(a)
    const sb = signal(b)
    const aPMO = sa.includes('/pmo/') || sa.includes('pmo') || sa.includes('oversight') || sa.includes('governance')
    const bPMO = sb.includes('/pmo/') || sb.includes('pmo') || sb.includes('oversight') || sb.includes('governance')
    if (aPMO !== bPMO) return bPMO ? b : a
    return score(b) > score(a) ? b : a
  }

  const dedupeByLabelAndRoute = (items = []) => {
    const byRoute = new Map()
    const byLabel = new Map()
    for (const raw of items) {
      const item = normalizeNode(raw)
      const routeKey = norm(item?.route_path)
      const labelKey = label(item)
      if (routeKey) byRoute.set(routeKey, chooseBest(byRoute.get(routeKey), item))
      byLabel.set(labelKey, chooseBest(byLabel.get(labelKey), item))
    }
    const merged = new Map()
    for (const item of [...byRoute.values(), ...byLabel.values()]) {
      merged.set(label(item), chooseBest(merged.get(label(item)), item))
    }
    return [...merged.values()].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
  }

  const baseline = dedupeByLabelAndRoute(roots)
  const hasPMOContext = baseline.some((n) => {
    const s = signal(n)
    return (
      s.includes('/pmo/') ||
      s.includes('pmo') ||
      s.includes('oversight') ||
      s.includes('portfolio') ||
      (s.includes('programme') && !s.includes('/app/') && !s.includes('/platform/projects'))
    )
  })

  if (!hasPMOContext) {
    const isTM = isTeamMemberContext(baseline)
    if (isTM) {
      const isLead = isTeamLeadContext(baseline)
      return ensureTeamMemberMenus(baseline, isLead)
    }
    return ensurePmInvitationTrackerMenu(
      ensurePmSendRoleInvitationMenu(ensureIndustryPlanMenusForPm(baseline)),
    )
  }

  const pmOnlyLabels = new Set([
    'delivery management',
    'controls & registers',
    'initiation & business justification',
    'agile delivery',
    'project closure',
    'org knowledge',
    'template library',
    'communications',
  ])

  const pmoBase = dedupeByLabelAndRoute(
    baseline.filter((n) => {
      const s = signal(n)
      if (s.includes('/simulator/')) return false
      if (s.includes('/pm/')) return false
      if (s.includes('pm_')) return false
      if (pmOnlyLabels.has(label(n))) return false
      return true
    })
  )

  /** Unpack legacy “Portfolio & Programme” section headers so children land in the right category. */
  const flattenPortfolioProgrammeSectionRoots = (items = []) => {
    const out = []
    for (const item of items) {
      const pathStr = route(item)
      if (pathStr) {
        out.push(item)
        continue
      }
      const hint = `${norm(item?.menu_label)} ${norm(item?.menu_code)}`
      const looksCombined =
        /portfolio\s*[&]\s*programme(\s+management)?|portfolio\s+and\s+programme(\s+management)?/.test(hint)
      const kids = item?.children
      if (looksCombined && Array.isArray(kids) && kids.length > 0) {
        out.push(...kids.map((c) => ({ ...c })))
      } else {
        out.push(item)
      }
    }
    return out
  }

  /** Unpack a top-level “Projects” wrapper so nested items classify individually. */
  const flattenProjectsSectionRoots = (items = []) => {
    const out = []
    for (const item of items) {
      const pathStr = route(item)
      if (pathStr) {
        out.push(item)
        continue
      }
      const lbl = norm(item?.menu_label || '').trim()
      const hint = `${lbl} ${norm(item?.menu_code)}`
      const looksProjectsHeader =
        lbl === 'projects' ||
        /^projects\s+(hub|menu|home)$/.test(lbl) ||
        /\bplatform_projects\b|\bplatform-projects\b/.test(hint)
      const kids = item?.children
      if (looksProjectsHeader && Array.isArray(kids) && kids.length > 0) {
        out.push(...kids.map((c) => ({ ...c })))
      } else {
        out.push(item)
      }
    }
    return out
  }

  /** True when this node is the redundant Platform “Projects” hub (nested under category Projects). */
  const isNestedProjectsHubNode = (node) => {
    const kids = node?.children
    if (!Array.isArray(kids) || kids.length === 0) return false
    const lbl = norm(node?.menu_label || '').trim()
    const code = norm(node?.menu_code || '')
    const p = norm(node?.route_path || '').replace(/\/$/, '')
    const pathOk = !p || p === '/platform/projects'
    const labelOk = lbl === 'projects'
    const codeOk =
      code === 'projects' ||
      code === 'platform-projects' ||
      code === 'platform_projects' ||
      code.includes('platform_projects')
    return pathOk && (labelOk || codeOk)
  }

  /** Hoist children of nested Projects hub into a flat list (avoids Projects → Projects in sidebar). */
  const hoistNestedProjectsHubs = (items = []) => {
    const out = []
    for (const item of items) {
      if (isNestedProjectsHubNode(item)) {
        out.push(...(item.children || []).map((c) => ({ ...c })))
      } else {
        out.push(item)
      }
    }
    return out
  }

  const normalizeRouteKey = (path) => norm(String(path || '').trim()).replace(/\/$/, '')

  /** Drop duplicate links (same route_path); prefer DB rows over virtual sidebar fillers. */
  const dedupeProjectsCategoryByRoute = (items = []) => {
    const byRoute = new Map()
    const noRoute = []
    const prefer = (a, b) => {
      const aVirt = String(a?.id || '').startsWith('virtual-proj-')
      const bVirt = String(b?.id || '').startsWith('virtual-proj-')
      if (aVirt !== bVirt) return aVirt ? b : a
      return (a.sort_order ?? 9999) <= (b.sort_order ?? 9999) ? a : b
    }
    for (const item of items) {
      const key = normalizeRouteKey(item?.route_path)
      if (!key) {
        noRoute.push(item)
        continue
      }
      const prev = byRoute.get(key)
      byRoute.set(key, prev ? prefer(prev, item) : item)
    }
    const merged = [...noRoute, ...byRoute.values()]
    return merged.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
  }

  /** Projects scoped dashboard (Platform Dashboard → Projects tab), not executive Overview. */
  const PROJECT_DASHBOARD_SCOPE_PATH = '/platform/dashboard?tab=projects'

  const rewriteProjectsBucketDashboardLinks = (items) => {
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      const lbl = norm(item?.menu_label || '').trim()
      const rp = String(item?.route_path || '').trim()
      const lower = rp.toLowerCase()
      const base = lower.split('?')[0].replace(/\/$/, '')
      if (lbl === 'project dashboard' && base === '/platform/dashboard' && !/[?&]tab=/.test(lower)) {
        items[i] = { ...item, route_path: PROJECT_DASHBOARD_SCOPE_PATH }
      }
    }
  }

  const isProjectsDashboardNavItem = (item) => {
    const lbl = norm(item?.menu_label || '').trim()
    const rp = norm(String(item?.route_path || ''))
    return lbl === 'project dashboard' || (rp.startsWith('/platform/dashboard') && rp.includes('tab=projects'))
  }

  const sortProjectsSectionPutDashboardFirst = (items = []) => {
    const dash = []
    const rest = []
    for (const item of items) {
      if (isProjectsDashboardNavItem(item)) dash.push(item)
      else rest.push(item)
    }
    dash.sort((a, b) => (a.sort_order ?? 9999) - (b.sort_order ?? 9999))
    rest.sort((a, b) => (a.sort_order ?? 9999) - (b.sort_order ?? 9999))
    return [...dash, ...rest]
  }

  /**
   * Category-named DB section headers (no route_path) must be unpacked into their children
   * so each child is individually re-classified by matchCategory.  Without this step, a DB
   * node called e.g. "Risk, Issues & Quality" (no route) falls through every specific pattern
   * in matchCategory → gets placed in the pmo-cat-admin fallback bucket → appears again as a
   * child item under "PMO Administration", duplicating the top-level category node.
   * Applied recursively so nested containers (e.g. "Administration" → "PMO Administration") are
   * fully unpacked in one pass.
   */
  const categoryHeaderLabels = new Set([
    'delivery management',
    'portfolio',
    'programme',
    'projects',
    'project oversight',
    'delivery controls',
    'financial & commercial management',
    'risk, issues & quality',
    'governance & standards',
    'reporting & intelligence',
    'workflows & approvals',
    'people & stakeholders',
    'teams',
    'stakeholders',
    'knowledge & assets',
    'audit trail & compliance',
    'pmo administration',
    'pmo admin',              // nested sub-section alias — must be flattened like the parent
    'administration',
    'system administration',  // platform/IT admin section — kept separate from PMO admin
    'platform administration',
    'governance & admin',
    'governance & administration',
  ])

  const flattenLegacyCategoryHeaders = (items = []) => {
    const out = []
    for (const item of items) {
      const pathStr = route(item)
      // Items with a real route are navigable leaves — always keep as-is
      if (pathStr) { out.push(item); continue }
      const lbl = norm(item?.menu_label || '').trim()
      const code = norm(item?.menu_code || '')
      const isCategoryHeader =
        categoryHeaderLabels.has(lbl) || code === 'platform_governance_admin'
      const kids = item?.children
      if (isCategoryHeader && Array.isArray(kids) && kids.length > 0) {
        // Replace the container with its children; recurse to handle nested containers
        out.push(...flattenLegacyCategoryHeaders(kids.map((c) => ({ ...c }))))
      } else {
        out.push(item)
      }
    }
    return out
  }

  const pmoRootsForGrouping = flattenLegacyCategoryHeaders(
    flattenProjectsSectionRoots(flattenPortfolioProgrammeSectionRoots(pmoBase))
  )

  /** Nested under "Delivery Management" (not top-level sidebar rows). */
  const deliveryManagementSubDefs = [
    { id: 'pmo-cat-portfolio', label: 'Portfolio', order: 1 },
    { id: 'pmo-cat-programme', label: 'Programme', order: 2 },
    { id: 'pmo-cat-projects', label: 'Projects', order: 3 },
    { id: 'pmo-cat-project-oversight', label: 'Project Oversight', order: 4 },
    { id: 'pmo-cat-delivery-controls', label: 'Delivery Controls', order: 5 },
  ]

  const categoryDefs = [
    { id: 'pmo-cat-exec', label: 'Executive Overview', order: 1 },
    { id: 'pmo-cat-delivery-management', label: 'Delivery Management', order: 2, isDeliveryManagementParent: true },
    { id: 'pmo-cat-financial-commercial', label: 'Financial & Commercial Management', order: 3 },
    { id: 'pmo-cat-risk-issues-quality', label: 'Risk, Issues & Quality', order: 4 },
    { id: 'pmo-cat-governance-standards', label: 'Governance & Standards', order: 5 },
    { id: 'pmo-cat-reporting-intelligence', label: 'Reporting & Intelligence', order: 6 },
    { id: 'pmo-cat-workflows-approvals', label: 'Workflows & Approvals', order: 7 },
    { id: 'pmo-cat-teams', label: 'Teams', order: 8 },
    { id: 'pmo-cat-stakeholders', label: 'Stakeholders', order: 9 },
    { id: 'pmo-cat-knowledge-assets', label: 'Knowledge & Assets', order: 10 },
    { id: 'pmo-cat-audit-compliance', label: 'Audit Trail & Compliance', order: 11 },
    { id: 'pmo-cat-email-notifications', label: 'Email & Notifications', order: 12 },
    { id: 'pmo-cat-admin', label: 'PMO Administration', order: 13 },
    { id: 'pmo-cat-system-admin', label: 'System Administration', order: 14 },
    { id: 'pmo-cat-help', label: 'Help', order: 15 },
    { id: 'pmo-cat-support', label: 'Support', order: 16 },
  ]

  const categoryFallbacks = {
    'pmo-cat-exec': { label: 'PMO Dashboard', path: '/platform/dashboard' },
    'pmo-cat-portfolio': { label: 'Portfolio View', path: '/platform/portfolio' },
    'pmo-cat-programme': { label: 'Programme View', path: '/platform/programme' },
    'pmo-cat-projects': { label: 'My Projects', path: '/platform/projects' },
    'pmo-cat-project-oversight': { label: 'Project Oversight View', path: '/platform/dashboard' },
    'pmo-cat-delivery-controls': { label: 'Delivery Controls View', path: '/platform/dashboard' },
    'pmo-cat-financial-commercial': { label: 'Financial View', path: '/platform/financial-reports' },
    'pmo-cat-risk-issues-quality': { label: 'Risk & Quality View', path: '/pmo/oversight/risk-register' },
    'pmo-cat-governance-standards': { label: 'Governance View', path: '/pmo/governance/mandate' },
    'pmo-cat-reporting-intelligence': { label: 'Reporting View', path: '/platform/reports' },
    'pmo-cat-workflows-approvals': { label: 'Pending Approvals', path: '/pmo/forms?status=in_review' },
    'pmo-cat-teams': { label: 'Manager assignments', path: '/platform/pmo-admin/manager-assignments' },
    'pmo-cat-stakeholders': { label: 'Stakeholder Register', path: '/platform/stakeholders/register' },
    'pmo-cat-knowledge-assets': { label: 'Org Knowledge Hub', path: '/platform/org-knowledge' },
    'pmo-cat-audit-compliance': { label: 'Compliance View', path: '/platform/reports' },
    'pmo-cat-email-notifications': { label: 'Email Settings', path: '/platform/admin/email-settings' },
    'pmo-cat-admin': { label: 'Organisation Settings', path: '/platform/pmo-admin/settings' },
    'pmo-cat-system-admin': { label: 'Platform Settings', path: '/platform/settings' },
    'pmo-cat-help': { label: 'Help Center', path: '/help' },
    'pmo-cat-support': { label: 'Support Center', path: '/support' },
  }

  const matchCategory = (item) => {
    const s = signal(item)
    if (/\/platform\/dashboard\b/.test(s) && /\b(projects|project)\b/.test(s)) return 'pmo-cat-projects'
    // Platform-level monitoring dashboards belong in System Administration, not the executive overview
    if (/monitoring dashboard|performance dashboard/.test(s)) return 'pmo-cat-system-admin'
    if (/dashboard|executive|kpi|alert|critical decision|governance events|portfolio health/.test(s)) return 'pmo-cat-exec'
    if (/\/platform\/programme\b/.test(s)) return 'pmo-cat-programme'
    if (/\/platform\/benefits\b/.test(s)) return 'pmo-cat-programme'
    if (/programme management|\bprogrammes\b|programme projects|programme dependencies|programme benefits|benefits management|\bprogramme\b/.test(s)) return 'pmo-cat-programme'
    if (/\/platform\/portfolio\b/.test(s)) return 'pmo-cat-portfolio'
    if (/portfolio collisions|planning\/collisions/.test(s)) return 'pmo-cat-portfolio'
    if (/strategic alignment|benefits pipeline|investment|roadmap|\bstrategy\b/.test(s)) return 'pmo-cat-portfolio'
    if (/\bportfolio\b/.test(s)) return 'pmo-cat-portfolio'
    if (/\/pmo\/industry-templates\b/.test(s)) return 'pmo-cat-projects'
    if (/\/platform\/industry-templates\b/.test(s)) return 'pmo-cat-knowledge-assets'
    if (/industry templates|industry plan/.test(s)) return 'pmo-cat-projects'
    if (/\/platform\/templates\b/.test(s)) return 'pmo-cat-projects'
    if (/\/platform\/projects\b/.test(s)) return 'pmo-cat-projects'
    if (/\/app\/projects\b/.test(s)) return 'pmo-cat-projects'
    if (/\/app\/project-members\b/.test(s)) return 'pmo-cat-projects'
    if (/\/platform\/project-members\b/.test(s)) return 'pmo-cat-projects'
    if (/\/app\/daily-log\b/.test(s)) return 'pmo-cat-projects'
    if (
      /^projects$|^projects\s+(hub|menu|home)$|\bproject dashboard\b|\bmy projects\b|\bproject list\b|\bbrowse\b.*\bedit\b|\ball projects\b|\bcreate project\b|\bquick create\b|\bnew wizard\b|project templates|template library|\bdaily log\b|\blessons log\b|\bproduct descriptions\b|\bmanage members\b|\bmembers\b.*\broles\b|\binvite\b.*\bassign\b|\brisk register\b|\bissue log\b|\bchange log\b|\brequirements register\b|\bstatus reports\b|process group forms|\barchived projects\b|\bon hold\b.*\bdrafts\b|\bbusiness cases?\b|\bproject brief\b|\binitiation\b/.test(
        s
      )
    ) {
      return 'pmo-cat-projects'
    }
    if (/project oversight|active projects|project health|project status|escalation|intervention|project exceptions/.test(s)) return 'pmo-cat-project-oversight'
    // "dependenc" prefix covers both "dependency" (singular) and "dependencies" (plural).
    // "change request" belongs in delivery controls — it represents scope/delivery impact.
    // "\btasks?\b" covers task lists that are delivery artefacts in a PMO context.
    if (/scope|schedule|milestone|dependenc|baseline|delivery performance|delay|change request|\btasks?\b/.test(s)) return 'pmo-cat-delivery-controls'
    if (/budget|cost|forecast|procurement|vendor|commercial|expense|financial/.test(s)) return 'pmo-cat-financial-commercial'
    // "\bquality\b" catches bare "Quality" section headers; "\btesting\b" catches "Testing and QA".
    if (/risk register|enterprise risk|issue register|quality assurance|audit findings|capa|quality register|\bquality\b|\btesting\b/.test(s)) return 'pmo-cat-risk-issues-quality'
    if (/governance|framework|methodology|policy|lifecycle standards|compliance checks|itto/.test(s)) return 'pmo-cat-governance-standards'
    if (/reports|reporting|analytics|intelligence|report builder/.test(s)) return 'pmo-cat-reporting-intelligence'
    if (/pending approvals|workflow|decision log|change approvals|stage gate|draft submissions|approv/.test(s)) return 'pmo-cat-workflows-approvals'
    // "Roles & Permissions" is system-level role management — must be caught before the generic
    // "role" keyword routes project role assignments to people-stakeholders.
    if (/roles\s*[&]\s*permissions?|roles\s+and\s+permissions?/.test(s)) return 'pmo-cat-system-admin'
    // Routes live under /platform/pmo-admin/ but belong with people — the generic `admin` rule below
    // matches the substring "admin" in "pmo-admin", so these must be detected first.
    if (
      /send role invitation|send-role-invitation|pm_send_role_invitation|action=send-invite|send-role-invites/.test(
        s
      )
    ) {
      return 'pmo-cat-teams'
    }
    if (
      /assign.roles.to.projects|assign-roles-to-projects|pmo_admin_assign_roles/.test(s)
    ) {
      return 'pmo-cat-teams'
    }
    if (
      /invitation tracker|invitation-tracker|invitation status|pm_invitation_tracker|pmo_admin_invitation_tracker/.test(
        s
      )
    ) {
      return 'pmo-cat-teams'
    }
    if (
      /manager-assignments|manager-assignment-settings|pmo_assign_managers|pmo_assignment_settings|pmo_manager_assignments|\bassign managers\b/.test(
        s
      )
    ) {
      return 'pmo-cat-teams'
    }
    if (
      /appointment.tracker|pmo-admin\/appointments|pmo_appointment_tracker/.test(s)
    ) {
      return 'pmo-cat-teams'
    }
    if (
      /\/platform\/teams|\/teams\/|teams_all|teams_my|teams_directory|teams_workload|teams_my_team|resource directory|skill matrix|team directory|workload view|\bmy team\b|project-members|project-users|add users to project/.test(
        s
      )
    ) {
      return 'pmo-cat-teams'
    }
    if (/\bteams\b/.test(s) && !/stakeholder/.test(s)) return 'pmo-cat-teams'
    if (
      /stakeholder|\/platform\/stakeholders|assessment matrix|assessment-matrix|engagement planning|communication plans|power.interest|stakeholder analysis|stakeholder monitoring|seam/.test(
        s
      )
    ) {
      return 'pmo-cat-stakeholders'
    }
    if (/accountability|communications overview/.test(s) && /stakeholder/.test(s)) {
      return 'pmo-cat-stakeholders'
    }
    if (/template library|templates|playbook|reusable|best practice|knowledge base|lessons learned|forms & documents|org knowledge/.test(s)) return 'pmo-cat-knowledge-assets'
    if (/activity logs|change history|approval history|document version history|compliance evidence|access logs|audit/.test(s)) return 'pmo-cat-audit-compliance'
    if (/email settings|sender profiles|invitation templates|invitation expiry|email-sender-profiles|invitation-settings|email notifications/.test(s)) {
      return 'pmo-cat-email-notifications'
    }
    // Platform/IT administration items — authentication, encryption, GDPR, security, help content
    // management, and feedback analysis belong in System Administration, not PMO business config.
    if (/\bauthentication\b|\bencryption\b|\bgdpr\b|gdpr compliance|\bsecurity\b|help management|feedback analysis/.test(s)) return 'pmo-cat-system-admin'
    // "\bsettings\b" catches bare "Settings" section headers; "user management" and "project types/statuses"
    // are PMO config items that belong in administration regardless of their specific route.
    if (/admin|organisation settings|branding|menu configuration|approval rules|master data|configuration|role menu access|subscription|pwa settings|\/platform\/settings|\bsettings\b|user management|project types|project statuses/.test(s)) return 'pmo-cat-admin'
    if (/help|guides|faq|tutorials|documentation/.test(s)) return 'pmo-cat-help'
    if (/support|ticket|contact support|feedback/.test(s)) return 'pmo-cat-support'
    return null
  }

  const groupedCategoryIds = [
    ...categoryDefs.map((c) => c.id),
    ...deliveryManagementSubDefs.map((s) => s.id),
  ]
  const grouped = new Map(groupedCategoryIds.map((id) => [id, []]))

  const pushToCategory = (categoryId, item) => {
    const bucketId = categoryId || 'pmo-cat-admin'
    if (!grouped.has(bucketId)) grouped.set(bucketId, [])
    grouped.get(bucketId).push(item)
  }

  for (const item of pmoRootsForGrouping) {
    const code = norm(item?.menu_code || '')
    if (code === 'platform_stakeholders' || code === 'platform_people_stakeholders') {
      continue
    }
    const categoryId = matchCategory(item) || 'pmo-cat-admin'
    pushToCategory(categoryId, item)
  }

  /** Collect route paths from a menu subtree (virtual fillers must not duplicate these). */
  const collectRoutePathsDeep = (nodes = []) => {
    const paths = new Set()
    const walk = (n) => {
      if (!n) return
      const key = normalizeRouteKey(n.route_path)
      if (key) paths.add(key)
      ;(n.children || []).forEach(walk)
    }
    nodes.forEach(walk)
    return paths
  }

  /** Only when DB menu omitted key routes entirely — avoids doubling links already under Projects hub. */
  const fillMissingProjectNavGaps = (items = []) => {
    const paths = collectRoutePathsDeep(items)
    const addIfMissing = (labelText, path, icon, sortOrder) => {
      const key = normalizeRouteKey(path)
      if (!key || paths.has(key)) return
      paths.add(key)
      items.push({
        id: `virtual-proj-${key.replace(/[^a-z0-9]+/g, '-')}`,
        menu_code: `virtual_proj_${norm(labelText).replace(/[^a-z0-9]+/g, '_')}`,
        menu_label: labelText,
        menu_description: labelText,
        parent_menu_id: null,
        menu_level: 1,
        sort_order: sortOrder,
        route_path: path,
        external_url: null,
        menu_icon: icon,
        menu_color: null,
        badge_text: null,
        badge_color: null,
        is_visible: true,
        is_active: true,
        canUse: true,
        children: [],
      })
    }
    addIfMissing('Project dashboard', PROJECT_DASHBOARD_SCOPE_PATH, 'layout-dashboard', -10)
    addIfMissing('My Projects', '/platform/projects', 'folder-kanban', 20)
    addIfMissing('Project list (browse & edit)', '/platform/projects/all', 'briefcase', 30)
    addIfMissing('Create project', '/platform/projects/create', 'file-plus', 40)
    addIfMissing('Quick create (new wizard)', '/platform/projects/new', 'file-plus', 45)
    addIfMissing('Archived projects', '/platform/projects/archives', 'package-open', 50)
    addIfMissing('On hold / drafts', '/app/projects/on-hold', 'pause', 55)
    addIfMissing('Members & roles (invite / assign)', '/app/project-members', 'users', 60)
    addIfMissing('Templates', '/platform/templates', 'layers', 65)
    addIfMissing('Industry Templates', '/pmo/industry-templates', 'layers', 66)
    addIfMissing('Add Industry Template', '/pmo/industry-templates/new', 'plus-circle', 67)
    addIfMissing('Template Drafts', '/pmo/industry-templates/on-hold', 'pause-circle', 68)
    addIfMissing('My daily log entries', '/app/daily-log/my-entries', 'book-open', 70)
  }

  const projectsBucket = grouped.get('pmo-cat-projects')
  const projectsFlattened = hoistNestedProjectsHubs(projectsBucket)
  projectsBucket.length = 0
  projectsBucket.push(...projectsFlattened)
  rewriteProjectsBucketDashboardLinks(projectsBucket)
  fillMissingProjectNavGaps(projectsBucket)
  const projectsDeduped = dedupeProjectsCategoryByRoute(projectsBucket)
  const projectsSorted = sortProjectsSectionPutDashboardFirst(projectsDeduped)
  projectsBucket.length = 0
  projectsBucket.push(...projectsSorted)

  const ensureAdminItem = (labelText, path, icon = 'settings') => {
    const adminItems = grouped.get('pmo-cat-admin')
    const exists = adminItems.some((i) => norm(i.menu_label) === norm(labelText) || norm(i.route_path) === norm(path))
    if (!exists) {
      adminItems.push({
        id: `virtual-${norm(labelText).replace(/[^a-z0-9]+/g, '-')}`,
        menu_code: `virtual_${norm(labelText).replace(/[^a-z0-9]+/g, '_')}`,
        menu_label: labelText,
        menu_description: labelText,
        parent_menu_id: null,
        menu_level: 1,
        sort_order: 1000 + adminItems.length,
        route_path: path,
        external_url: null,
        menu_icon: icon,
        menu_color: null,
        badge_text: null,
        badge_color: null,
        is_visible: true,
        is_active: true,
        canUse: true,
        children: [],
      })
    }
  }

  ensureAdminItem('Branding & Identity', '/platform/organisation/branding')
  ensureAdminItem('Branding History', '/platform/organisation/branding-history')
  ensureAdminItem('Platform Settings', '/platform/settings')
  ensureAdminItem('PWA Settings', '/platform/pwa-settings')
  const ensureEmailNotificationsItem = (labelText, path, icon = 'mail') => {
    const emailItems = grouped.get('pmo-cat-email-notifications')
    const exists = emailItems.some(
      (i) => norm(i.menu_label) === norm(labelText) || norm(i.route_path) === norm(path)
    )
    if (!exists) {
      emailItems.push({
        id: `virtual-email-${norm(labelText).replace(/[^a-z0-9]+/g, '-')}`,
        menu_code: `virtual_email_${norm(labelText).replace(/[^a-z0-9]+/g, '_')}`,
        menu_label: labelText,
        menu_description: labelText,
        parent_menu_id: null,
        menu_level: 1,
        sort_order: 10 + emailItems.length,
        route_path: path,
        external_url: null,
        menu_icon: icon,
        menu_color: null,
        badge_text: null,
        badge_color: null,
        is_visible: true,
        is_active: true,
        canUse: true,
        children: [],
      })
    }
  }

  ensureEmailNotificationsItem('Email Settings', '/platform/admin/email-settings', 'mail')
  ensureEmailNotificationsItem('Sender Profiles', '/platform/admin/email-sender-profiles', 'at-sign')
  ensureEmailNotificationsItem('Invitation Templates', '/app/settings/invitation-templates', 'file-text')
  ensureEmailNotificationsItem('Invitation Expiry', '/platform/admin/invitation-settings', 'clock')

  const pushVirtualToCategory = (categoryId, labelText, path, icon = 'users', sortOrder = 1000) => {
    const bucketId = categoryId || 'pmo-cat-admin'
    if (!grouped.has(bucketId)) grouped.set(bucketId, [])
    const bucket = grouped.get(bucketId)
    // A DB group node that has no route_path of its own should not block a virtual
    // item that carries the correct direct-navigation path.
    const exists = bucket.some((i) => {
      const iPath = norm(i.route_path)
      if (iPath && iPath === norm(path)) return true   // same path → duplicate
      if (!iPath) return false                          // null-path group node → let virtual through
      return norm(i.menu_label) === norm(labelText)    // same label, non-null path → duplicate
    })
    if (!exists) {
      bucket.push({
        id: `virtual-${categoryId}-${norm(labelText).replace(/[^a-z0-9]+/g, '-')}`,
        menu_code: `virtual_${categoryId}_${norm(labelText).replace(/[^a-z0-9]+/g, '_')}`,
        menu_label: labelText,
        menu_description: labelText,
        parent_menu_id: null,
        menu_level: 1,
        sort_order: sortOrder,
        route_path: path,
        external_url: null,
        menu_icon: icon,
        menu_color: null,
        badge_text: null,
        badge_color: null,
        is_visible: true,
        is_active: true,
        canUse: true,
        children: [],
      })
    }
  }

  pushVirtualToCategory('pmo-cat-teams', 'Manager assignments', '/platform/pmo-admin/manager-assignments', 'user-check', 10)
  pushVirtualToCategory(
    'pmo-cat-teams',
    'Assignment settings',
    '/platform/pmo-admin/manager-assignment-settings',
    'settings',
    20
  )
  pushVirtualToCategory(
    'pmo-cat-teams',
    'Assign Roles to Projects',
    '/platform/admin/assign-roles-to-projects',
    'shield',
    30
  )
  pushVirtualToCategory(
    'pmo-cat-teams',
    'Send Role Invitations',
    '/platform/admin/send-role-invites',
    'mail',
    40
  )
  pushVirtualToCategory(
    'pmo-cat-teams',
    'Invitation Tracker',
    '/platform/admin/invitation-tracker',
    'mail-check',
    50
  )
  pushVirtualToCategory(
    'pmo-cat-teams',
    'Appointment Tracker',
    '/platform/pmo-admin/appointments',
    'clipboard-check',
    60
  )
  pushVirtualToCategory('pmo-cat-teams', 'All Teams', '/platform/teams', 'users', 110)
  pushVirtualToCategory('pmo-cat-teams', 'My Teams', '/platform/teams/my', 'users', 120)
  pushVirtualToCategory('pmo-cat-teams', 'Team Directory', '/platform/teams/directory', 'address-book', 130)
  pushVirtualToCategory('pmo-cat-teams', 'Workload View', '/platform/teams/workload', 'chart-mixed', 140)
  pushVirtualToCategory('pmo-cat-teams', 'My Team', '/platform/teams/my-team', 'users', 150)

  pushVirtualToCategory(
    'pmo-cat-stakeholders',
    'Stakeholder Register',
    '/platform/stakeholders/register',
    'users',
    10
  )
  pushVirtualToCategory(
    'pmo-cat-stakeholders',
    'Stakeholder Analysis',
    '/platform/stakeholders/analysis',
    'target',
    20
  )
  pushVirtualToCategory(
    'pmo-cat-stakeholders',
    'Stakeholder Assessment Matrix',
    '/platform/stakeholders/assessment-matrix',
    'table-2',
    25
  )
  pushVirtualToCategory(
    'pmo-cat-stakeholders',
    'Engagement Planning',
    '/platform/stakeholders/engagement',
    'handshake',
    30
  )
  pushVirtualToCategory(
    'pmo-cat-stakeholders',
    'Communication Plans',
    '/platform/stakeholders/communications',
    'megaphone',
    40
  )
  pushVirtualToCategory(
    'pmo-cat-stakeholders',
    'Monitoring',
    '/platform/stakeholders/monitoring',
    'chart-bar',
    50
  )

  const teamsAdminSortKey = (item) => {
    const s = signal(item)
    if (/manager.?assignments?/.test(s)) return 10
    if (/assignment settings/.test(s)) return 20
    if (/assign roles/.test(s)) return 30
    if (/send role/.test(s)) return 40
    if (/invitation tracker|invitation status/.test(s)) return 50
    if (/appointment tracker/.test(s)) return 60
    return 200
  }

  const isTeamsHubNode = (item) => {
    const lbl = label(item)
    const code = norm(item?.menu_code || '')
    const kids = item?.children
    return (
      (code === 'teams' || lbl === 'teams') &&
      Array.isArray(kids) &&
      kids.length > 0
    )
  }

  const isTeamsNavLeaf = (item) => {
    const s = signal(item)
    const lbl = label(item)
    if (isTeamsHubNode(item)) return false
    if (teamsAdminSortKey(item) < 200) return false
    return (
      /\/platform\/teams|\/teams\//.test(s) ||
      ['all teams', 'my teams', 'team directory', 'workload view', 'my team', 'resource directory', 'skill matrix'].includes(
        lbl
      )
    )
  }

  const organizeTeamsCategoryItems = (items = []) => {
    const adminOps = []
    const teamNavLeaves = []
    let hub = null
    for (const item of items) {
      if (isTeamsHubNode(item)) {
        hub = { ...item, children: [...(item.children || [])] }
        continue
      }
      if (isTeamsNavLeaf(item)) {
        teamNavLeaves.push(item)
        continue
      }
      adminOps.push(item)
    }
    adminOps.sort((a, b) => teamsAdminSortKey(a) - teamsAdminSortKey(b) || (a.sort_order || 0) - (b.sort_order || 0))
    const mergedNav = dedupeByLabelAndRoute([
      ...(hub?.children || []),
      ...teamNavLeaves,
    ]).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
    if (mergedNav.length === 0 && !hub) return adminOps
    const teamsHub = hub || {
      id: 'virtual-teams-hub',
      menu_code: 'teams',
      menu_label: 'Teams',
      menu_description: 'Team directory, workload, and membership',
      parent_menu_id: null,
      menu_level: 1,
      sort_order: 100,
      route_path: '/platform/teams',
      external_url: null,
      menu_icon: 'users',
      menu_color: null,
      badge_text: null,
      badge_color: null,
      is_visible: true,
      is_active: true,
      canUse: true,
      children: [],
    }
    teamsHub.children = mergedNav
    return [...adminOps, teamsHub]
  }

  const isStakeholderHubNode = (item) => {
    const lbl = label(item)
    const code = norm(item?.menu_code || '')
    const kids = item?.children
    return (
      (code === 'stakeholders' ||
        code === 'pm_section_stakeholders' ||
        lbl === 'stakeholders') &&
      Array.isArray(kids) &&
      kids.length > 0
    )
  }

  const isStakeholderNavLeaf = (item) => {
    const s = signal(item)
    if (isStakeholderHubNode(item)) return false
    return /stakeholder|\/platform\/stakeholders/.test(s)
  }

  /** Category header is already "Stakeholders" — do not nest a second Stakeholders hub. */
  const isRedundantStakeholderSectionHeader = (item) => {
    const lbl = label(item)
    const code = norm(item?.menu_code || '')
    if (code === 'platform_stakeholders' || code === 'platform_people_stakeholders') return true
    if (
      (code === 'stakeholders' || code === 'pm_section_stakeholders' || lbl === 'stakeholders') &&
      !String(item?.route_path || '').trim() &&
      !(item?.children?.length > 0)
    ) {
      return true
    }
    return false
  }

  const organizeStakeholdersCategoryItems = (items = []) => {
    const collected = []
    for (const item of items) {
      if (isRedundantStakeholderSectionHeader(item)) continue
      if (isStakeholderHubNode(item)) {
        collected.push(...(item.children || []))
        continue
      }
      if (isStakeholderNavLeaf(item)) {
        collected.push(item)
        continue
      }
      collected.push(item)
    }
    return dedupeByLabelAndRoute(collected).sort(
      (a, b) => (a.sort_order || 0) - (b.sort_order || 0)
    )
  }

  const toCategoryNode = (def) => {
    let items = dedupeByLabelAndRoute(grouped.get(def.id) || [])
    if (def.id === 'pmo-cat-teams') items = organizeTeamsCategoryItems(items)
    if (def.id === 'pmo-cat-stakeholders') items = organizeStakeholdersCategoryItems(items)
    if (items.length === 0) {
      const fallback = categoryFallbacks[def.id]
      if (fallback) {
        items = [{
          id: `virtual-${def.id}-fallback`,
          menu_code: `virtual_${def.id}_fallback`,
          menu_label: fallback.label,
          menu_description: fallback.label,
          parent_menu_id: null,
          menu_level: 1,
          sort_order: 1,
          route_path: fallback.path,
          external_url: null,
          menu_icon: 'layout-dashboard',
          menu_color: null,
          badge_text: null,
          badge_color: null,
          is_visible: true,
          is_active: true,
          canUse: true,
          children: [],
        }]
      }
    }
    return {
      id: def.id,
      menu_code: def.id,
      menu_label: def.label,
      menu_description: def.label,
      parent_menu_id: null,
      menu_level: 1,
      sort_order: def.order,
      route_path: null,
      external_url: null,
      menu_icon: null,
      menu_color: null,
      badge_text: null,
      badge_color: null,
      is_visible: true,
      is_active: true,
      canUse: true,
      children: items,
    }
  }

  return categoryDefs
    .map((def) => {
      if (def.isDeliveryManagementParent) {
        return {
          id: def.id,
          menu_code: def.id,
          menu_label: def.label,
          menu_description: def.label,
          parent_menu_id: null,
          menu_level: 1,
          sort_order: def.order,
          route_path: null,
          external_url: null,
          menu_icon: 'layers',
          menu_color: null,
          badge_text: null,
          badge_color: null,
          is_visible: true,
          is_active: true,
          canUse: true,
          children: deliveryManagementSubDefs
            .map((sub) => toCategoryNode(sub))
            .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)),
        }
      }
      return toCategoryNode(def)
    })
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
}

// Pure DB fetch — returns { items, error }. No fallback; menu data is from DB only.
// Use two separate queries to avoid PostgREST "more than one relationship" embed error between users and user_roles.
async function fetchMenuFromDB(user) {
  let { data: userRow, error: userError } = await platformDb
    .from('users')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (userError || !userRow?.id) {
    // auth_user_id not linked yet (invited user) — attempt repair then retry once
    await platformDb.rpc('link_auth_account').catch(() => {})
    const { data: retriedRow } = await platformDb
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .maybeSingle()
    if (!retriedRow?.id) {
      const msg = userError?.message || 'User record not found'
      const isNetwork = /failed to fetch|network|load failed/i.test(String(msg))
      const friendly = isNetwork ? 'Connection problem. Check your network and try again.' : msg
      console.warn('useMenu: failed to load user:', msg)
      return { items: null, error: `Menu unavailable: ${friendly}` }
    }
    // Repair succeeded — continue with the found row
    userRow = retriedRow
  }

  const { data: roleRows, error: rolesError } = await platformDb
    .from('user_roles')
    .select('role_id, is_active, is_deleted')
    .eq('user_id', userRow.id)
    .eq('is_active', true)

  if (rolesError) {
    console.warn('useMenu: failed to load user roles:', rolesError.message)
    return { items: null, error: `Menu unavailable: ${rolesError.message}. Please contact support if this persists.` }
  }

  const roleIds = (roleRows || [])
    .filter(ur => !ur.is_deleted)
    .map(ur => ur.role_id)

  if (roleIds.length === 0) {
    const msg = 'No roles assigned. Menu cannot be loaded.'
    console.warn('useMenu:', msg)
    return { items: null, error: msg }
  }

  const { data: roleMenuRows, error: menuError } = await platformDb
    .from('role_menu_items')
    .select('menu_item_id, can_use')
    .in('role_id', roleIds)
    .eq('can_view', true)
    .eq('is_active', true)
    .eq('is_deleted', false)

  if (menuError) {
    const msg = menuError.message || ''
    const isNetwork = /failed to fetch|network|load failed/i.test(String(msg))
    const friendly = isNetwork ? 'Connection problem. Check your network and try again.' : msg
    console.error('useMenu: error fetching menu items:', menuError)
    return { items: null, error: friendly ? `Menu unavailable: ${friendly}` : 'Failed to load sidebar menu.' }
  }

  const uniqueMenuIds = [...new Set((roleMenuRows || []).map((r) => r.menu_item_id).filter(Boolean))]
  if (uniqueMenuIds.length === 0) {
    return { items: [], error: null }
  }

  const canUseById = new Map()
  for (const row of roleMenuRows || []) {
    if (!row?.menu_item_id) continue
    canUseById.set(row.menu_item_id, !!row.can_use || !!canUseById.get(row.menu_item_id))
  }

  const menuSelect = `
    id,
    menu_code,
    menu_label,
    menu_description,
    parent_menu_id,
    menu_level,
    sort_order,
    route_path,
    external_url,
    menu_icon,
    menu_color,
    badge_text,
    badge_color,
    is_visible,
    is_active
  `

  // Step 2: fetch assigned menu rows, then hydrate full ancestor chain.
  const menuMap = new Map()
  let pendingIds = [...uniqueMenuIds]

  while (pendingIds.length > 0) {
    const { data: fetchedRows, error: menuRowsError } = await platformDb
      .from('menu_items')
      .select(menuSelect)
      .in('id', pendingIds)
      .eq('is_active', true)
      .eq('is_visible', true)

    if (menuRowsError) {
      const msg = menuRowsError.message || ''
      const isNetwork = /failed to fetch|network|load failed/i.test(String(msg))
      const friendly = isNetwork ? 'Connection problem. Check your network and try again.' : msg
      return { items: null, error: friendly ? `Menu unavailable: ${friendly}` : 'Failed to load sidebar menu.' }
    }

    for (const row of fetchedRows || []) {
      menuMap.set(row.id, row)
    }

    const missingParentIds = new Set()
    for (const row of fetchedRows || []) {
      const pid = row?.parent_menu_id
      if (pid && !menuMap.has(pid)) {
        missingParentIds.add(pid)
      }
    }
    pendingIds = [...missingParentIds]
  }

  const menuRows = [...menuMap.values()]
  const hierarchy = buildHierarchy(menuRows, canUseById)
  const items = applyRoleSidebarRevamp(hierarchy)
  return { items: items.length > 0 ? items : [], error: null }
}

export function useMenu() {
  const [menuItems, setMenuItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadMenu()
  }, [])

  const loadMenu = async () => {
    try {
      setError(null)

      const { data: { user } } = await platformDb.auth.getUser()
      if (!user) {
        setMenuItems([])
        setLoading(false)
        return
      }

      const cached = readCache(user.id)
      const stale = readStaleCache(user.id)
      const sanitizeMenuItems = (items) => {
        if (!Array.isArray(items) || items.length === 0) return []
        return applyRoleSidebarRevamp(items)
      }
      const sanitizedCached = sanitizeMenuItems(cached)
      const sanitizedStale = sanitizeMenuItems(stale)
      const initial = (sanitizedCached.length > 0 ? sanitizedCached : sanitizedStale)

      if (initial) {
        setMenuItems(initial)
        setLoading(false)
      } else {
        setLoading(true)
      }

      const { items, error: fetchError } = await fetchMenuFromDB(user)
      if (fetchError) {
        // If a usable initial menu is already rendered (cache/stale),
        // don't show transient fetch errors as a blocking banner.
        if (!initial) setError(fetchError)
        if (!initial) {
          setMenuItems(sanitizedStale)
        }
      } else {
        setMenuItems(items || [])
        if (items && items.length > 0) {
          writeCache(user.id, items)
        }
      }
    } catch (err) {
      const msg = err?.message || 'Failed to load sidebar menu'
      const isNetwork = /failed to fetch|network|load failed/i.test(String(msg))
      setError(isNetwork ? 'Connection problem. Check your network and try again.' : msg)
      try {
        const { data: { user } } = await platformDb.auth.getUser()
        if (user?.id) {
          const stale = readStaleCache(user.id)
          if (Array.isArray(stale) && stale.length > 0) setMenuItems(applyRoleSidebarRevamp(stale))
          else setMenuItems([])
        } else setMenuItems([])
      } catch (_) {
        setMenuItems([])
      }
      console.error('useMenu error:', err)
    } finally {
      setLoading(false)
    }
  }

  return { menuItems, loading, error, refetch: loadMenu }
}

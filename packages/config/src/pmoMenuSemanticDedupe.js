/**
 * PMO sidebar semantic dedupe — legacy v638, v681 plat_*, and v671 canonical rows
 * often describe the same feature with different labels/routes.
 */

export function normalizeMenuLabel(label = '') {
  return String(label || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

function nodeSignal(node = {}) {
  const code = String(node?.menu_code || '').trim().toLowerCase()
  const label = normalizeMenuLabel(node?.menu_label)
  const path = String(node?.route_path || '').trim().toLowerCase()
  return { code, label, path, text: `${code} ${label} ${path}` }
}

function isWorkflowApproval(signal) {
  return /pending approval|pending approvals|authorisation queue|wf_mandate|wf_brief|workflows_mandate|workflows_brief|workflows-mandate|workflows-brief|mandates\/approvals|briefs\/approvals|mandate approvals|project brief approvals/.test(
    signal
  )
}

/** @returns {string|null} */
export function planningLeafSemanticKey(node = {}) {
  const { code, label, path, text } = nodeSignal(node)

  if (
    /^planning hub$/.test(label) ||
    code.includes('plan_intel_hub') ||
    code.includes('planning_hub') ||
    code.includes('planning-hub') ||
    /^\/pmo\/planning\/?$/.test(path) ||
    /^\/simulator\/pmo\/planning\/?$/.test(path)
  ) {
    return 'planning:hub'
  }

  if (
    /^intelligence rules$/.test(label) ||
    code.includes('intel_rules') ||
    code.includes('planning_intelligence') ||
    code.includes('planning-intelligence') ||
    /\/planning\/intelligence/.test(text)
  ) {
    return 'planning:intelligence-rules'
  }

  if (
    /^governance rules/i.test(label) ||
    code.includes('gov_rules') ||
    code.includes('governance_config') ||
    code.includes('governance-config') ||
    /\/planning\/governance/.test(text)
  ) {
    return 'planning:governance-rules'
  }

  return null
}

/** @returns {string|null} */
export function executiveDashboardSemanticKey(node = {}, layout = 'pmo') {
  const { code, label, path, text } = nodeSignal(node)

  if (/monitoring|performance dashboard|project dashboard|analytics dashboard|dashboard builder|lifecycle dashboard/.test(text)) {
    return null
  }

  const knownExecDashboardCode =
    code === 'plat_dashboard_pmo' ||
    code === 'pmo_dashboard' ||
    code === 'pmo-dashboard' ||
    code === 'plat_pm_dashboard' ||
    code.includes('sim_pmo_dashboard')

  const isDashboardLabel = label === 'dashboard' || (layout === 'sim_pmo' && /^practice dashboard$/.test(label))
  const execRoute =
    !path ||
    path === '/' ||
    (layout === 'sim_pmo' ? /\/simulator\/(pmo\/)?dashboard/.test(path) : /\/platform\/dashboard/.test(path) && !/tab=/.test(path))

  if ((isDashboardLabel || knownExecDashboardCode) && execRoute) {
    return layout === 'sim_pmo' ? 'exec:dashboard:sim' : 'exec:dashboard'
  }

  return null
}

/** @returns {string|null} */
function initiationLeafSemanticKey(node = {}) {
  const { label, path, text } = nodeSignal(node)
  if (isWorkflowApproval(text)) return null
  if (/\/mandates\/approvals|\/briefs\/approvals/.test(path)) return null
  if (/governance\/|itto template|communication management strategy/.test(text)) return null

  if (/mandate/.test(text)) {
    if (/\/mandates\/create|create mandate/.test(text)) return 'init:mandate:create'
    if (/\/mandates\/unlinked|unlinked mandate/.test(text)) return 'init:mandate:unlinked'
    return 'init:mandate:list'
  }

  if (/brief/.test(text)) {
    if (/\/briefs\/create|create brief/.test(text)) return 'init:brief:create'
    return 'init:brief:list'
  }

  if (/business case/.test(text)) {
    if (/create business case|\/business-cases\/create/.test(text)) return 'init:business-case:create'
    return 'init:business-case:list'
  }

  if (/benefits review/.test(text)) return 'init:benefits-review'
  if (/pre-project|pre project|process-templates\/pre-project/.test(text)) return 'init:pre-project-templates'

  return null
}

/** @returns {string|null} */
function governanceLeafSemanticKey(node = {}) {
  const { text } = nodeSignal(node)

  if (/pid|project initiation document|\(pids\)/i.test(text)) return 'gov:pid'
  if (/\/initiation\//.test(text)) return null

  if (/communication strategy|communication management strategy|communication mgmt strategy|\/communication-strategy/.test(text)) {
    return 'gov:cms'
  }
  if (/configuration strategy|configuration management strategy|configuration mgmt strategy|\/configuration-strategy/.test(text)) {
    return 'gov:config-ms'
  }
  if (/quality strategy|quality management strategy|quality mgmt strategy|\/quality-strategy/.test(text)) return 'gov:qms'
  if (/risk strategy|risk management strategy|risk mgmt strategy|\/risk-strategy/.test(text)) return 'gov:rms'
  if (/itto template|itto draft|itto templates \/ drafts|\/itto\/templates|\/itto\/drafts/.test(text)) {
    return 'gov:itto'
  }
  if (/enterprise environmental|\/eef\b|\beef\b/.test(text)) return 'gov:eef'
  if (
    /organisational process assets|\(opa\)/i.test(text) ||
    (/\/platform\/opa(?:\/?$|\?)/.test(text) && !/\/platform\/opa\/(new|on-hold|bulk-upload)/.test(text))
  ) {
    return 'gov:opa'
  }

  return null
}

/** @returns {string|null} */
function oversightLeafSemanticKey(node = {}) {
  const { text } = nodeSignal(node)
  if (/delay template|delays\/templates/.test(text)) return null

  if (/risk register|enterprise risk|\/oversight\/risk|\/oversight\/risks/.test(text)) return 'oversight:risk'
  if (/issue register|issue log|\/oversight\/issue/.test(text)) return 'oversight:issue'
  if (/quality register|\/oversight\/quality/.test(text)) return 'oversight:quality'
  if (/lessons log|\/oversight\/lessons/.test(text)) return 'oversight:lessons'
  if (/delay register|\/oversight\/delay/.test(text)) return 'oversight:delay-register'
  if (/scope oversight|\/oversight\/scope/.test(text)) return 'oversight:scope'
  if (/schedule oversight|\/oversight\/schedule/.test(text)) return 'oversight:schedule'
  if (/change register|\/registers\/changes|\/oversight\/change/.test(text)) return 'oversight:change'

  return null
}

/** @returns {string|null} */
function peopleLeafSemanticKey(node = {}) {
  const { text, path } = nodeSignal(node)

  if (/stakeholder register|plat_people_stakeholders/.test(text)) return null

  if (/assignment settings|assign_settings|manager-assignment-settings|platform_teams_assignment_settings|plat_people_assign_settings/.test(text)) {
    return 'people:assignment-settings'
  }
  if (/appointment tracker|appt_tracker|platform_teams_appointment|pmo_admin_appointment/.test(text)) {
    return 'people:appointment-tracker'
  }
  if (/invitation tracker|inv_tracker|platform_teams_invitation/.test(text)) {
    return 'people:invitation-tracker'
  }
  if (/send invitation|send-role-inv|send_role_inv|platform_teams_send/.test(text)) {
    return 'people:send-invitations'
  }
  if (/manage roles|manage-roles|pmo-people-manage-roles|pmo_people_manage_roles|plat_pm_manage_roles/.test(text)) {
    return 'people:manage-roles'
  }
  if (/assign roles|assign-roles|platform_teams_assign_roles|pmo_people_assign_roles/.test(text)) {
    return 'people:assign-roles'
  }
  if (/add users|project.members|platform_teams_add_users|pmo_people_add_users|plat_people_add_users/.test(text)) {
    return 'people:add-users'
  }
  if (/resource directory|teams\/directory|platform_teams_directory|plat_people_resource_dir/.test(text)) {
    return 'people:resource-directory'
  }
  if (/team capacity|teams\/capacity|teams\/workload|resources\/capacity|platform_teams_workload|plat_people_team_capacity/.test(text)) {
    return 'people:team-capacity'
  }
  if (/manager assignment|manager-assignments|mgr_assign|platform_teams_manager|pmo_manager_assignments|pmo_assign_managers|plat_people_mgr_assign/.test(text)) {
    return 'people:manager-assignments'
  }

  return null
}

/** @returns {string|null} */
function workflowLeafSemanticKey(node = {}) {
  const { text } = nodeSignal(node)

  if (/mandate pending|mandate approvals|mandates\/approvals|wf_mandate/.test(text)) return 'workflow:mandate-approvals'
  if (/brief pending|project brief approvals|briefs\/approvals|wf_brief/.test(text)) return 'workflow:brief-approvals'
  if (/authorisation queue|auth.queue|\/authorisation\/queue/.test(text)) return 'auth:queue'
  if (/lifecycle dashboard|auth.dashboard|\/authorisation\/dashboard/.test(text)) return 'auth:dashboard'
  if (/configure rules|auth.configure|\/authorisation\/configure/.test(text)) return 'auth:configure'
  if (/approval chains|auth.chains|\/authorisation\/chains/.test(text)) return 'auth:chains'
  if (/archive retention|auth.archive-retention/.test(text)) return 'auth:archive-retention'
  if (/archive vault|auth.archive(?!-)/.test(text)) return 'auth:archive'

  return null
}

/** @returns {string|null} */
function reportingLeafSemanticKey(node = {}) {
  const { text } = nodeSignal(node)
  if (/financial|expense|portfolio evm|expense threshold/.test(text)) return null

  if (/highlight report/.test(text)) return 'report:highlight'
  if (/exception report/.test(text)) return 'report:exception'
  if (/end stage report/.test(text)) return 'report:end-stage'
  if (/end project report/.test(text)) return 'report:end-project'
  if (/lessons report/.test(text)) return 'report:lessons'
  if (/report library|\/platform\/reports\/?$/.test(text)) return 'report:library'
  if (/analytics dashboard|reports\/analytics/.test(text)) return 'report:analytics'
  if (/dashboard builder|reports\/builder/.test(text)) return 'report:builder'
  if (/scheduled report|reports\/scheduled/.test(text)) return 'report:scheduled'
  if (/agile metrics hub/.test(text)) return 'report:agile-metrics'

  return null
}

/** @returns {string|null} */
function evmLeafSemanticKey(node = {}) {
  const { label, path, text } = nodeSignal(node)

  if (/portfolio evm|\/portfolio\/evm|\/portfolio-evm/.test(text)) return 'evm:portfolio'
  if (/programme evm|\/programme\/evm/.test(text) && !/\/programme\/[^/]+\/evm/.test(path)) return 'evm:programme'
  if (/project evm|\/projects\/evm/.test(text) && !/\/projects\/[^/]+\/evm/.test(path)) return 'evm:projects'
  if (/\/programme\/[^/]+\/evm/.test(path)) return null
  if (/\/projects\/[^/]+\/evm/.test(path)) return null

  return null
}

/** @returns {string|null} */
function portfolioLeafSemanticKey(node = {}) {
  const { label, path, text } = nodeSignal(node)

  if (/portfolio overview|^\/platform\/portfolio\/?$|^\/simulator\/portfolio\/?$/.test(text)) {
    return 'portfolio:overview'
  }
  if (/portfolio dependencies|\/portfolio\/dependencies|\/dependencies/.test(text)) {
    return 'portfolio:dependencies'
  }
  if (/portfolio collisions|\/collisions/.test(text)) {
    return 'portfolio:collisions'
  }

  return null
}

/** @returns {string|null} */
function processTemplateLeafSemanticKey(node = {}) {
  const { path, text } = nodeSignal(node)

  if (/agile template|process-templates\/agile|plat_pt_agile|pmo_pt_agile/.test(text)) return 'pt:agile'
  if (/^\/pmo\/process-templates\/?$/.test(path)) return 'pt:hub'
  if (/\/platform\/templates\/manage/.test(path)) return 'pt:manage'
  if (/\/platform\/templates\/new|process-templates\/create/.test(path)) return 'pt:new'
  if (/\/platform\/templates\/?$/.test(path)) return 'pt:browse'
  if (/industry template|industry-templates|process-templates\/industry/.test(text)) return 'pt:industry'
  if (/delay template|delays\/templates|plat_pt_delay|pmo_pt_delay/.test(text)) return 'pt:delay'

  return null
}

/** @returns {string|null} */
function emailLeafSemanticKey(node = {}) {
  const { label, path, text } = nodeSignal(node)

  if (/notification preference|notif_prefs|plat_notif|pmo_notification_pref/.test(text)) return null

  if (/email settings|email-settings|pmo_admin_email|plat_email_settings/.test(text)) return 'email:settings'
  if (/sender profile|email-sender|email_senders|plat_email_senders/.test(text)) return 'email:sender-profiles'
  if (/invitation template|invitation-templates|invitation_templates|projects_invitation|plat_email_inv_templates/.test(text)) {
    return 'email:invitation-templates'
  }
  if (/invitation expiry|invitation-settings|invitation_expiry|plat_email_inv_expiry/.test(text)) return 'email:invitation-expiry'
  if (/pending ai review|pending-review|ai-reviews|plat_email_ai|pmo_comms_pending/.test(text)) return 'email:pending-ai-reviews'
  if (/meetings|comms\/meetings|plat_email_meetings|pmo_comms_meetings/.test(text)) return 'email:meetings'
  if (/direct message|comms\/direct|direct-messages|plat_email_direct|pmo_comms_direct/.test(text)) return 'email:direct-messages'
  if (
    /^messages$/.test(label) ||
    /comms\/messages|plat_email_messages|pmo_comms_messages/.test(text)
  ) {
    return 'email:messages'
  }

  return null
}

/** @returns {string|null} */
function notificationPreferencesLeafSemanticKey(node = {}) {
  const { text } = nodeSignal(node)
  if (/notification preference|notif_prefs|\/settings\/notifications|\/notification-preferences/.test(text)) {
    return 'notif:preferences'
  }
  return null
}

/** @returns {string|null} */
function adminLeafSemanticKey(node = {}) {
  const { text } = nodeSignal(node)

  if (/platform settings|pwa settings|authentication settings|encryption|gdpr compliance|roles & permissions|help content|feedback analysis|monitoring dashboard|pmo_sys_/.test(text)) {
    return null
  }

  if (/local data extension|local_data_extensions|plat_admin_local_data/.test(text)) return 'admin:local-data-extensions'
  if (/form template|plat_admin_form/.test(text)) return 'admin:form-templates'
  if (/organisation settings|org_settings|plat_admin_org/.test(text)) return 'admin:org-settings'
  if (/user management|pmo_admin_users|plat_admin_user/.test(text)) return 'admin:user-management'
  if (/role menu access|role_menu_access|plat_admin_role/.test(text)) return 'admin:role-menu-access'
  if (/project types|pmo_admin_project_types|plat_admin_project_types/.test(text)) return 'admin:project-types'
  if (/project statuses|pmo_admin_project_statuses|plat_admin_proj_status/.test(text)) return 'admin:project-statuses'
  if (/funding source|pmo_admin_funding|plat_admin_funding/.test(text)) return 'admin:funding-sources'
  if (/budget categor|pmo_admin_budget|plat_admin_budget_cats/.test(text)) return 'admin:budget-categories'
  if (/subscription|plat_admin_subscription/.test(text) && !/manage subscription/.test(text)) return 'admin:subscription'
  if (/branding & identity|branding history|pmo_admin_branding|plat_admin_branding/.test(text)) return 'admin:branding'
  if (/integrations hub|integrations|pmo_admin_integrations|pmo_integrations_hub|plat_admin_integrations/.test(text)) {
    return 'admin:integrations'
  }

  return null
}

/** @returns {string|null} */
export function pmoMenuLeafSemanticKey(node = {}, layout = 'pmo') {
  return (
    executiveDashboardSemanticKey(node, layout) ||
    planningLeafSemanticKey(node) ||
    initiationLeafSemanticKey(node) ||
    governanceLeafSemanticKey(node) ||
    oversightLeafSemanticKey(node) ||
    peopleLeafSemanticKey(node) ||
    workflowLeafSemanticKey(node) ||
    reportingLeafSemanticKey(node) ||
    portfolioLeafSemanticKey(node) ||
    evmLeafSemanticKey(node) ||
    emailLeafSemanticKey(node) ||
    notificationPreferencesLeafSemanticKey(node) ||
    adminLeafSemanticKey(node) ||
    processTemplateLeafSemanticKey(node) ||
    null
  )
}

export function isPreferredPlanningRoute(path = '') {
  const normalized = String(path).trim().toLowerCase()
  return /\/(intelligence-rules|governance-rules)\/?$/.test(normalized)
}

export function pmoMenuLeafPreferenceScore(node = {}) {
  const { code, label, path } = nodeSignal(node)
  let score = 0

  if (/^pmo-init-|^pmo-gov-|^pmo-report-|^pmo-auth-|^pmo-workflows-|^pmo-people-|^pmo-email-|^pmo-comms-|^pmo-notification-|^pmo-admin-|^pmo-oversight-|^pmo-pt-/.test(code)) {
    score += 60
  }

  if (
    /\/mandates\/list|\/mandates\/create|\/mandates\/unlinked|\/briefs\/list|\/briefs\/create|\/platform\/initiation\/pids|\/pmo\/initiation\/benefits-review-plan|intelligence-rules|governance-rules|\/mandates\/approvals|\/briefs\/approvals/.test(
      path
    )
  ) {
    score += 45
  }

  if (/^all |^create |unlinked/.test(label)) score += 35
  if (/\(pids\)/i.test(node?.menu_label || '')) score += 25
  if (/business cases|benefits review plans|project briefs/i.test(node?.menu_label || '')) score += 15

  if (/^plat_/.test(code) && !/^plat_pm_s_/.test(code) && !/^plat_s_/.test(code)) score += 20
  if (/^platform_teams_/.test(code)) score += 15
  if (/^plat_people_/.test(code)) score -= 20
  if (/^plat_email_/.test(code)) score -= 20
  if (/^plat_admin_/.test(code)) score -= 20
  if (/^pmo_email_/.test(code)) score += 5
  if (/^pmo_comms_/.test(code)) score += 5
  if (/^pmo_admin_/.test(code)) score += 5
  if (/^pmo_/.test(code)) score += 10

  if (/^plat_s_/.test(code)) score -= 15
  if (/^plat_pm_s_/.test(code)) score -= 25
  if (code === 'pmo_init_project_mandate' || code === 'pmo_init_project_brief') score -= 10

  if (/\/pmo\/mandates\/?$/.test(path) && !/\/mandates\/(list|create|unlinked)/.test(path)) score -= 20
  if (/\/platform\/brief\/?$/.test(path)) score -= 15
  if (/\/platform\/pid\/?$/.test(path)) score -= 15
  if (/\/pm\/initiation\/benefits-review-plan/.test(path)) score -= 10
  if (/\/pmo\/initiation\/project-brief/.test(path) && /\/platform\/briefs\//.test(path) === false) score -= 5

  if (isPreferredPlanningRoute(path)) score += 30

  return score
}

export function pickPreferredPmoMenuLeaf(existing, incoming) {
  if (!existing) return incoming
  if (!incoming) return existing

  const existingScore = pmoMenuLeafPreferenceScore(existing)
  const incomingScore = pmoMenuLeafPreferenceScore(incoming)
  if (incomingScore > existingScore) return incoming
  if (existingScore > incomingScore) return existing

  const existingPath = String(existing?.route_path || '')
  const incomingPath = String(incoming?.route_path || '')
  const existingPreferred = isPreferredPlanningRoute(existingPath)
  const incomingPreferred = isPreferredPlanningRoute(incomingPath)
  if (incomingPreferred && !existingPreferred) return incoming
  if (existingPreferred && !incomingPreferred) return existing

  const incomingCode = String(incoming?.menu_code || '')
  const existingCode = String(existing?.menu_code || '')
  const incomingIsDb = /^(plat_|sim_)/.test(incomingCode)
  const existingIsDb = /^(plat_|sim_)/.test(existingCode)
  if (incomingIsDb && !existingIsDb) return incoming
  if (existingIsDb && !incomingIsDb) return existing

  return incoming
}

export function pmoMenuNodeDedupeKey(node = {}, layout = 'pmo') {
  const semantic = pmoMenuLeafSemanticKey(node, layout)
  if (semantic) return semantic

  const path = String(node?.route_path || '').trim().toLowerCase()
  if (path) return `path:${path}`

  const code = String(node?.menu_code || '').trim()
  if (code) return `code:${code}`

  return `label:${normalizeMenuLabel(node?.menu_label)}`
}

export function dedupePmoMenuSiblings(nodes = [], layout = 'pmo') {
  const byKey = new Map()
  for (const node of nodes || []) {
    const key = pmoMenuNodeDedupeKey(node, layout)
    if (!key) continue
    byKey.set(key, pickPreferredPmoMenuLeaf(byKey.get(key), node))
  }
  return [...byKey.values()]
}

export function dedupePmoMenuTree(nodes = [], layout = 'pmo') {
  const deduped = dedupePmoMenuSiblings(nodes, layout)
  return deduped.map((node) => ({
    ...node,
    children: node.children?.length ? dedupePmoMenuTree(node.children, layout) : node.children || [],
  }))
}

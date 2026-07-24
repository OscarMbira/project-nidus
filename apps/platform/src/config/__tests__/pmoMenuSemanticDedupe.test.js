import { describe, expect, it } from 'vitest'
import {
  dedupePmoMenuSiblings,
  dedupePmoMenuTree,
  pmoMenuLeafSemanticKey,
  pmoMenuNodeDedupeKey,
} from '../pmoMenuSemanticDedupe.js'
import { nestV671TrackCategories } from '../pmoMenuHierarchyUtils.js'

describe('pmoMenuSemanticDedupe', () => {
  it('maps initiation duplicates to shared semantic keys', () => {
    expect(pmoMenuNodeDedupeKey({ menu_label: 'All Mandates', route_path: '/platform/mandates/list' })).toBe(
      'init:mandate:list'
    )
    expect(pmoMenuNodeDedupeKey({ menu_label: 'Project Mandate', route_path: '/pmo/mandates' })).toBe(
      'init:mandate:list'
    )
    expect(pmoMenuNodeDedupeKey({ menu_code: 'plat_pm_s_business_case', menu_label: 'Business Case' })).toBe(
      'init:business-case:list'
    )
    expect(pmoMenuNodeDedupeKey({ menu_label: 'Benefits Review Plans', route_path: '/pmo/initiation/benefits-review-plan' })).toBe(
      'init:benefits-review'
    )
    expect(
      pmoMenuNodeDedupeKey({
        menu_label: 'Benefits Review Plan',
        route_path: '/pm/initiation/benefits-review-plan',
      })
    ).toBe('init:benefits-review')
  })

  it('dedupes Administration leaves across canonical, pmo_admin_, and plat_admin_ rows', () => {
    const merged = dedupePmoMenuSiblings([
      {
        menu_code: 'pmo-admin-org-settings',
        menu_label: 'Organisation Settings',
        route_path: '/platform/pmo-admin/settings',
      },
      {
        menu_code: 'pmo_admin_org_settings',
        menu_label: 'Organisation Settings',
        route_path: '/platform/pmo-admin/settings',
      },
      {
        menu_code: 'plat_admin_org_settings',
        menu_label: 'Organisation Settings',
        route_path: '/platform/organisation/profile',
      },
      {
        menu_code: 'pmo-admin-local-data-extensions',
        menu_label: 'Local Data Extensions',
        route_path: '/app/local-data-extensions',
      },
      {
        menu_code: 'local_data_extensions',
        menu_label: 'Local Data Extensions',
        route_path: '/app/local-data-extensions',
      },
      {
        menu_code: 'pmo-admin-integrations',
        menu_label: 'Integrations',
        route_path: '/pmo/admin/integrations',
      },
      {
        menu_code: 'pmo_admin_integrations',
        menu_label: 'Integrations Hub',
        route_path: '/pmo/admin/integrations',
      },
    ])

    expect(merged).toHaveLength(3)
    expect(merged.map((n) => n.menu_code)).toEqual([
      'pmo-admin-org-settings',
      'pmo-admin-local-data-extensions',
      'pmo-admin-integrations',
    ])
  })

  it('dedupes Email & Notifications leaves across canonical, pmo_email_, and plat_email_ rows', () => {
    const merged = dedupePmoMenuSiblings([
      {
        menu_code: 'pmo-email-settings',
        menu_label: 'Email Settings',
        route_path: '/platform/admin/email-settings',
      },
      {
        menu_code: 'pmo_email_settings',
        menu_label: 'Email Settings',
        route_path: '/platform/admin/email-settings',
      },
      {
        menu_code: 'plat_email_settings',
        menu_label: 'Email Settings',
        route_path: '/platform/email-settings',
      },
      {
        menu_code: 'pmo-comms-direct',
        menu_label: 'Direct Messages',
        route_path: '/platform/comms/direct',
      },
      {
        menu_code: 'pmo_comms_direct',
        menu_label: 'Direct Messages',
        route_path: '/platform/comms/direct',
      },
      {
        menu_code: 'plat_email_direct_msgs',
        menu_label: 'Direct Messages',
        route_path: '/platform/comms/direct-messages',
      },
      {
        menu_code: 'pmo-notification-preferences',
        menu_label: 'Notification Preferences',
        route_path: '/platform/settings/notifications',
      },
      {
        menu_code: 'pmo_notification_preferences',
        menu_label: 'Notification Preferences',
        route_path: '/pmo/notifications/preferences',
      },
    ])

    expect(merged).toHaveLength(3)
    expect(merged.map((n) => n.menu_code)).toEqual([
      'pmo-email-settings',
      'pmo-comms-direct',
      'pmo-notification-preferences',
    ])
  })

  it('dedupes People & Resources leaves across canonical, platform_teams_, and plat_people_ rows', () => {
    const merged = dedupePmoMenuSiblings([
      {
        menu_code: 'pmo-people-manager-assignments',
        menu_label: 'Manager Assignments',
        route_path: '/platform/pmo-admin/manager-assignments',
      },
      {
        menu_code: 'platform_teams_manager_assignments',
        menu_label: 'Manager Assignments',
        route_path: '/platform/pmo-admin/manager-assignments',
      },
      {
        menu_code: 'plat_people_mgr_assign',
        menu_label: 'Manager Assignments',
        route_path: '/pmo-admin/manager-assignments',
      },
      {
        menu_code: 'pmo-people-team-capacity',
        menu_label: 'Team Capacity',
        route_path: '/platform/teams/capacity',
      },
      {
        menu_code: 'plat_people_team_capacity',
        menu_label: 'Team Capacity',
        route_path: '/platform/resources/capacity',
      },
    ])

    expect(merged).toHaveLength(2)
    expect(merged.map((n) => n.menu_code)).toEqual([
      'pmo-people-manager-assignments',
      'pmo-people-team-capacity',
    ])
  })

  it('dedupes workflow mandate and brief approvals across canonical and plat_ rows', () => {
    expect(
      pmoMenuNodeDedupeKey({
        menu_code: 'pmo-workflows-mandate-approvals',
        menu_label: 'Mandate Approvals',
        route_path: '/platform/mandates/approvals',
      })
    ).toBe('workflow:mandate-approvals')

    const merged = dedupePmoMenuSiblings([
      {
        menu_code: 'pmo-workflows-mandate-approvals',
        menu_label: 'Mandate Approvals',
        route_path: '/platform/mandates/approvals',
        menu_icon: 'file-check',
      },
      {
        menu_code: 'plat_wf_mandate_approvals',
        menu_label: 'Mandate Approvals',
        route_path: '/pmo/authorisation/queue',
        menu_icon: 'file-text',
      },
      {
        menu_code: 'pmo-workflows-brief-approvals',
        menu_label: 'Project Brief Approvals',
        route_path: '/platform/briefs/approvals',
        menu_icon: 'file-check',
      },
      {
        menu_code: 'plat_wf_brief_approvals',
        menu_label: 'Project Brief Approvals',
        route_path: '/pmo/authorisation/queue',
        menu_icon: 'file',
      },
    ])

    expect(merged).toHaveLength(2)
    expect(merged.map((n) => n.menu_code)).toEqual([
      'pmo-workflows-mandate-approvals',
      'pmo-workflows-brief-approvals',
    ])
  })

  it('prefers granular canonical initiation leaves over v681 aggregates', () => {
    const merged = dedupePmoMenuSiblings([
      { menu_code: 'pmo-init-mandates-all', menu_label: 'All Mandates', route_path: '/platform/mandates/list' },
      { menu_code: 'plat_s_mandates', menu_label: 'Project Mandates', route_path: '/pmo/mandates' },
      { menu_code: 'plat_pm_s_mandate', menu_label: 'Project Mandate', route_path: '/pmo/mandates' },
      { menu_code: 'pmo-init-mandates-create', menu_label: 'Create Mandate', route_path: '/platform/mandates/create' },
    ])

    expect(merged).toHaveLength(2)
    expect(merged.map((n) => n.menu_label)).toEqual(['All Mandates', 'Create Mandate'])
  })

  it('dedupes governance strategy singular/plural labels', () => {
    expect(pmoMenuLeafSemanticKey({ menu_label: 'Communication Management Strategy' })).toBe('gov:cms')
    expect(pmoMenuLeafSemanticKey({ menu_label: 'Communication Strategy' })).toBe('gov:cms')
    const merged = dedupePmoMenuSiblings([
      {
        menu_code: 'pmo-gov-communication-strategy',
        menu_label: 'Communication Management Strategy',
        route_path: '/pmo/governance/communication-strategy',
      },
      {
        menu_code: 'plat_s_cms',
        menu_label: 'Communication Mgmt Strategy',
        route_path: '/pm/governance/communication-strategy',
      },
    ])
    expect(merged).toHaveLength(1)
    expect(merged[0].menu_code).toBe('pmo-gov-communication-strategy')
  })

  it('nestV671TrackCategories groups Initiation Hub into subsections', () => {
    const trackCategoryNodes = [
      {
        menu_code: 'pmo-cat-initiation',
        menu_label: 'Initiation Hub',
        children: [
          { menu_code: 'pmo-init-mandates-all', menu_label: 'All Mandates', route_path: '/platform/mandates/list', children: [] },
          { menu_code: 'pmo-init-mandates-create', menu_label: 'Create Mandate', route_path: '/platform/mandates/create', children: [] },
          { menu_code: 'pmo-init-mandates-unlinked', menu_label: 'Unlinked Mandates', route_path: '/platform/mandates/unlinked', children: [] },
          { menu_code: 'pmo-init-briefs-all', menu_label: 'All Briefs', route_path: '/platform/briefs/list', children: [] },
          { menu_code: 'pmo-init-briefs-create', menu_label: 'Create Brief', route_path: '/platform/briefs/create', children: [] },
          { menu_code: 'pmo-init-business-case', menu_label: 'Business Cases', route_path: '/pmo/initiation/business-case', children: [] },
          { menu_code: 'pmo-init-business-case-create', menu_label: 'Create Business Case', route_path: '/platform/initiation/business-cases/create', children: [] },
          { menu_code: 'pmo-init-pid', menu_label: 'Project Initiation Documents (PIDs)', route_path: '/platform/initiation/pids', children: [] },
          { menu_code: 'pmo-init-benefits-review-plan', menu_label: 'Benefits Review Plans', route_path: '/pmo/initiation/benefits-review-plan', children: [] },
          { menu_code: 'plat_s_mandates', menu_label: 'Project Mandates', route_path: '/pmo/mandates', children: [] },
          { menu_code: 'plat_s_briefs', menu_label: 'Project Briefs', route_path: '/platform/brief', children: [] },
          { menu_code: 'plat_s_business_cases', menu_label: 'Business Cases', route_path: '/pmo/initiation/business-case', children: [] },
          { menu_code: 'plat_s_pids', menu_label: 'Project Initiation Documents', route_path: '/platform/pid', children: [] },
          { menu_code: 'plat_s_benefits_review', menu_label: 'Benefits Review Plans', route_path: '/pm/initiation/benefits-review-plan', children: [] },
          { menu_code: 'plat_pm_s_mandate', menu_label: 'Project Mandate', route_path: '/pmo/mandates', children: [] },
          { menu_code: 'plat_pm_s_brief', menu_label: 'Project Brief', route_path: '/platform/brief', children: [] },
          { menu_code: 'plat_pm_s_business_case', menu_label: 'Business Case', route_path: '/pmo/initiation/business-case', children: [] },
          { menu_code: 'plat_pm_s_pid', menu_label: 'Project Initiation Document', route_path: '/platform/pid', children: [] },
          { menu_code: 'plat_pm_s_benefits_rp', menu_label: 'Benefits Review Plan', route_path: '/pm/initiation/benefits-review-plan', children: [] },
        ],
      },
    ]

    const [initiation] = nestV671TrackCategories(trackCategoryNodes, 'pmo')
    expect(initiation.children.map((c) => c.menu_label)).toEqual([
      'Project Mandates',
      'Project Briefs',
      'Business Cases',
      'Benefits Review Plans',
      'Pre-Project Templates',
    ])

    const mandates = initiation.children.find((c) => c.menu_label === 'Project Mandates')
    expect(mandates.children.map((c) => c.menu_label)).toEqual([
      'All Mandates',
      'Create Mandate',
      'Unlinked Mandates',
    ])

    const briefs = initiation.children.find((c) => c.menu_label === 'Project Briefs')
    expect(briefs.children.map((c) => c.menu_label)).toEqual(['All Briefs', 'Create Brief'])

    const businessCases = initiation.children.find((c) => c.menu_label === 'Business Cases')
    expect(businessCases.children.map((c) => c.menu_label)).toEqual(['Business Cases', 'Create Business Case'])
  })

  it('places Project Initiation Documents (PIDs) under Governance & Standards', () => {
    const trackCategoryNodes = [
      {
        menu_code: 'pmo-cat-initiation',
        menu_label: 'Initiation Hub',
        children: [
          {
            menu_code: 'pmo-init-pid',
            menu_label: 'Project Initiation Documents (PIDs)',
            route_path: '/platform/initiation/pids',
            children: [],
          },
        ],
      },
      { menu_code: 'pmo-cat-governance-standards', menu_label: 'Governance & Standards', children: [] },
    ]
    const nested = nestV671TrackCategories(trackCategoryNodes, 'pmo')
    const initiation = nested.find((n) => n.menu_code === 'pmo-cat-initiation')
    const governance = nested.find((n) => n.menu_code === 'pmo-cat-governance-standards')
    expect(initiation?.children?.some((c) => /project initiation documents/i.test(c.menu_label))).toBe(false)
    expect(governance?.children?.some((c) => c.menu_label === 'Project Initiation Documents (PIDs)')).toBe(true)
  })

  it('dedupePmoMenuTree recurses into nested sections', () => {
    const tree = dedupePmoMenuTree([
      {
        menu_code: 'pmo-cat-initiation',
        menu_label: 'Initiation Hub',
        children: [
          { menu_label: 'All Mandates', route_path: '/platform/mandates/list' },
          { menu_label: 'Project Mandate', route_path: '/pmo/mandates' },
        ],
      },
    ])
    expect(tree[0].children).toHaveLength(1)
  })
})

import { describe, it, expect } from 'vitest'
import {
  applyCategoryPresentationLabels,
  applyPmLayoutSanitization,
  applyPmoSectionNesting,
  filterPmLayoutMenuItems,
  inferPmoCategoryId,
  LEGACY_CATEGORY_SHELL_TARGETS,
  nestExecutiveOverviewSections,
  nestProjectDeliverySections,
  nestV671CategoryNode,
  nestV671TrackCategories,
  reorganizeMenuRoots,
  reorganizePmoMenuRoots,
} from '../pmoMenuHierarchyUtils'

describe('applyPmLayoutSanitization organisational templates', () => {
  it('promotes Templates out of Projects to a top-level Organisational Templates row', () => {
    const { universalNodes } = applyPmLayoutSanitization(
      [
        {
          menu_code: 'plat_grp_pm_projects',
          menu_label: 'Projects',
          route_path: null,
          children: [
            {
              menu_code: 'plat_pm_all_projects',
              menu_label: 'All Projects',
              route_path: '/platform/projects',
              children: [],
            },
            {
              menu_code: 'plat_pm_templates',
              menu_label: 'Templates',
              route_path: '/platform/templates',
              children: [],
            },
          ],
        },
      ],
      []
    )

    const projects = universalNodes.find((n) => n.menu_code === 'plat_grp_pm_projects')
    const orgTemplates = universalNodes.find((n) => n.menu_code === 'plat_pm_templates')

    expect(projects?.children?.some((c) => c.menu_code === 'plat_pm_templates')).toBe(false)
    expect(orgTemplates?.route_path).toBe('/platform/templates')
    expect(orgTemplates?.children || []).toEqual([])
  })
})

describe('filterPmLayoutMenuItems dashboard leaf', () => {
  it('removes Executive Dashboard and keeps Dashboard as a direct link', () => {
    const filtered = filterPmLayoutMenuItems([
      {
        menu_code: 'plat_pm_dashboard',
        menu_label: 'Dashboard',
        route_path: '/platform/dashboard',
        children: [
          {
            menu_code: 'plat_exec_dashboard',
            menu_label: 'Executive Dashboard',
            route_path: '/platform/executive/dashboard',
            children: [],
          },
        ],
      },
    ])

    expect(filtered).toHaveLength(1)
    expect(filtered[0].menu_label).toBe('Dashboard')
    expect(filtered[0].route_path).toBe('/platform/dashboard')
    expect(filtered[0].children).toEqual([])
  })

  it('promotes a lone child route onto a Dashboard shell with no own route', () => {
    const filtered = filterPmLayoutMenuItems([
      {
        menu_code: 'plat_pm_dashboard',
        menu_label: 'Dashboard',
        route_path: null,
        children: [
          {
            menu_code: 'plat_pm_dashboard_leaf',
            menu_label: 'Dashboard',
            route_path: '/pm/dashboard',
            children: [],
          },
        ],
      },
    ])

    expect(filtered).toHaveLength(1)
    expect(filtered[0].route_path).toBe('/pm/dashboard')
    expect(filtered[0].children).toEqual([])
  })
})

describe('inferPmoCategoryId', () => {
  it('maps security admin routes to system admin category', () => {
    expect(
      inferPmoCategoryId({ menu_code: 'platform_security', route_path: '/platform/settings/security' })
    ).toBe('pmo-cat-system-admin')
  })

  it('maps initiation routes to initiation track category', () => {
    expect(
      inferPmoCategoryId({ menu_code: 'biz_case_list', route_path: '/platform/initiation/business-cases' })
    ).toBe('pmo-cat-initiation')
  })

  it('maps legacy portfolio shell to Portfolio & Delivery not Administration', () => {
    expect(inferPmoCategoryId({ menu_code: 'pmo-cat-portfolio', menu_label: 'Portfolio' })).toBe(
      'pmo-cat-project-delivery'
    )
    expect(LEGACY_CATEGORY_SHELL_TARGETS['pmo-cat-portfolio']).toBe('pmo-cat-project-delivery')
  })

  it('maps OKR routes to Knowledge & Operations', () => {
    expect(inferPmoCategoryId({ menu_code: 'pmo_okr_dashboard', route_path: '/pmo/okr' })).toBe(
      'pmo-cat-knowledge-assets'
    )
  })

  it('maps invitation admin routes to People & Resources', () => {
    expect(
      inferPmoCategoryId({
        menu_code: 'pmo_invite',
        route_path: '/platform/admin/invitation-tracker',
      })
    ).toBe('pmo-cat-teams')
  })
})

describe('reorganizePmoMenuRoots', () => {
  it('buckets orphan roots under universal categories in PMO_CATEGORY_DEFS order', () => {
    const roots = [
      { menu_code: 'security', menu_label: 'Security', sort_order: 1, children: [] },
      { menu_code: 'pmo_dashboard', menu_label: 'Dashboard', route_path: '/platform/dashboard', sort_order: 2, children: [] },
      { menu_code: 'pmo-cat-initiation', menu_label: 'Pre-Project Docs', sort_order: 3, children: [] },
    ]
    const { universalNodes, trackCategoryNodes, orphanCount } = reorganizePmoMenuRoots(roots)
    expect(orphanCount).toBe(2)
    expect(trackCategoryNodes).toHaveLength(1)
    const exec = universalNodes.find((n) => n.menu_code === 'pmo-cat-exec')
    expect(exec?.children?.some((c) => c.menu_code === 'pmo_dashboard')).toBe(true)
    const sysAdmin = universalNodes.find((n) => n.menu_code === 'pmo-cat-system-admin')
    expect(sysAdmin?.children?.some((c) => c.menu_code === 'security')).toBe(true)
  })

  it('nestExecutiveOverviewSections keeps Dashboard only (portfolio/programme/planning → Portfolio & Delivery)', () => {
    const universalNodes = [
      {
        menu_code: 'pmo-cat-exec',
        menu_label: 'Executive Overview',
        children: [
          { menu_code: 'dash', menu_label: 'Dashboard', route_path: '/platform/dashboard', sort_order: 1, children: [] },
          { menu_code: 'p1', menu_label: 'Portfolio Dependencies', route_path: '/platform/dependencies', children: [] },
          { menu_code: 'prog', menu_label: 'Programme Management', route_path: '/platform/programme', children: [] },
          { menu_code: 'ben', menu_label: 'Benefits Management', route_path: '/platform/benefits', children: [] },
          { menu_code: 'hub', menu_label: 'Planning Hub', route_path: '/pmo/planning', children: [] },
        ],
      },
      { menu_code: 'pmo-cat-project-delivery', menu_label: 'Portfolio & Delivery', children: [] },
    ]
    const { universalNodes: nested } = applyPmoSectionNesting(universalNodes, 'pmo')
    const exec = nested.find((n) => n.menu_code === 'pmo-cat-exec')
    const delivery = nested.find((n) => n.menu_code === 'pmo-cat-project-delivery')
    expect(exec.children.map((c) => c.menu_label)).toEqual(['Dashboard'])
    expect(delivery.children.map((c) => c.menu_label)).toEqual(
      expect.arrayContaining(['Portfolio', 'Programme', 'Planning Intelligence'])
    )
    const programme = delivery.children.find((c) => c.menu_label === 'Programme')
    expect(programme?.children?.map((c) => c.menu_label)).toEqual(
      expect.arrayContaining(['Programme Management', 'Benefits Management'])
    )
  })

  it('v719: fills Portfolio and Programme from canonical when delivery bucket is sparse', () => {
    const universalNodes = [
      {
        menu_code: 'pmo-cat-exec',
        menu_label: 'Executive Overview',
        children: [
          { menu_code: 'dash', menu_label: 'Dashboard', route_path: '/platform/dashboard', children: [] },
        ],
      },
      { menu_code: 'pmo-cat-project-delivery', menu_label: 'Portfolio & Delivery', children: [] },
    ]
    const { universalNodes: nested } = applyPmoSectionNesting(universalNodes, 'pmo')
    const delivery = nested.find((n) => n.menu_code === 'pmo-cat-project-delivery')
    const labels = delivery.children.map((c) => c.menu_label)
    expect(labels).toEqual(
      expect.arrayContaining(['Portfolio', 'Programme', 'Planning Intelligence', 'Project Execution'])
    )
    expect(delivery.children.find((c) => c.menu_label === 'Portfolio')?.children?.length).toBeGreaterThanOrEqual(3)
    expect(delivery.children.find((c) => c.menu_label === 'Programme')?.children?.length).toBe(2)
    expect(delivery.children.find((c) => c.menu_label === 'Project Execution')?.children?.length).toBe(2)
  })

  it('v671: Programme and Planning Intelligence only show plan leaves; dedupes Dashboard', () => {
    const universalNodes = [
      {
        menu_code: 'pmo-cat-exec',
        menu_label: 'Executive Overview',
        children: [
          { menu_code: 'dash_a', menu_label: 'Dashboard', route_path: '/platform/dashboard', children: [] },
          { menu_code: 'dash_b', menu_label: 'Dashboard', route_path: '/platform/dashboard', children: [] },
          {
            menu_code: 'programme',
            menu_label: 'Programme',
            children: [
              { menu_code: 'programme_all', menu_label: 'All Programmes', route_path: '/programme', children: [] },
              { menu_code: 'programme_dashboard', menu_label: 'Programme Dashboard', route_path: '/programme', children: [] },
              { menu_code: 'pmo-pp-programme', menu_label: 'Programme Management', route_path: '/platform/programme', children: [] },
              { menu_code: 'pmo-pp-benefits', menu_label: 'Benefits Management', route_path: '/platform/benefits', children: [] },
              { menu_code: 'programme_reports', menu_label: 'Reports', route_path: '/programme', children: [] },
            ],
          },
          {
            menu_code: 'pmo-planning',
            menu_label: 'Planning Intelligence',
            children: [
              { menu_code: 'pmo-planning-hub', menu_label: 'Planning Hub', route_path: '/pmo/planning', children: [] },
              { menu_code: 'pmo_planning_poker', menu_label: 'Planning Poker', route_path: '/pmo/planning/poker', children: [] },
              { menu_code: 'pmo-planning-intelligence', menu_label: 'Intelligence Rules', route_path: '/pmo/planning/intelligence', children: [] },
              {
                menu_code: 'pmo-planning-governance-config',
                menu_label: 'Governance Rules Config',
                route_path: '/pmo/planning/governance-config',
                children: [],
              },
            ],
          },
        ],
      },
      { menu_code: 'pmo-cat-project-delivery', menu_label: 'Portfolio & Delivery', children: [] },
    ]
    const { universalNodes: nested } = applyPmoSectionNesting(universalNodes, 'pmo')
    const exec = nested.find((n) => n.menu_code === 'pmo-cat-exec')
    const delivery = nested.find((n) => n.menu_code === 'pmo-cat-project-delivery')
    expect(exec.children.filter((c) => c.menu_label === 'Dashboard')).toHaveLength(1)

    const programme = delivery.children.find((c) => c.menu_label === 'Programme')
    expect(programme.children.map((c) => c.menu_label)).toEqual([
      'Programme Management',
      'Benefits Management',
    ])

    const planning = delivery.children.find((c) => c.menu_label === 'Planning Intelligence')
    expect(planning.children.map((c) => c.menu_label)).toEqual([
      'Planning Hub',
      'Intelligence Rules',
      'Governance Rules Configuration',
    ])
  })

  it('dedupes Planning Intelligence leaves across legacy and v681 routes', () => {
    const universalNodes = [
      {
        menu_code: 'pmo-cat-exec',
        menu_label: 'Executive Overview',
        children: [
          {
            menu_code: 'pmo-planning',
            menu_label: 'Planning Intelligence',
            children: [
              { menu_code: 'plat_plan_intel_hub', menu_label: 'Planning Hub', route_path: '/pmo/planning', children: [] },
              {
                menu_code: 'plat_plan_intel_rules',
                menu_label: 'Intelligence Rules',
                route_path: '/pmo/planning/intelligence-rules',
                children: [],
              },
              {
                menu_code: 'plat_plan_gov_rules',
                menu_label: 'Governance Rules Configuration',
                route_path: '/pmo/planning/governance-rules',
                children: [],
              },
              {
                menu_code: 'pmo-planning-intelligence',
                menu_label: 'Intelligence Rules',
                route_path: '/pmo/planning/intelligence',
                children: [],
              },
              {
                menu_code: 'pmo-planning-governance-config',
                menu_label: 'Governance Rules Config',
                route_path: '/pmo/planning/governance-config',
                children: [],
              },
            ],
          },
        ],
      },
      { menu_code: 'pmo-cat-project-delivery', menu_label: 'Portfolio & Delivery', children: [] },
    ]
    const { universalNodes: nested } = applyPmoSectionNesting(universalNodes, 'pmo')
    const delivery = nested.find((n) => n.menu_code === 'pmo-cat-project-delivery')
    const planning = delivery.children.find((c) => c.menu_label === 'Planning Intelligence')
    expect(planning.children).toHaveLength(3)
    expect(planning.children.map((c) => c.menu_label)).toEqual([
      'Planning Hub',
      'Intelligence Rules',
      'Governance Rules Configuration',
    ])
    expect(planning.children.find((c) => /intelligence rules/i.test(c.menu_label))?.route_path).toBe(
      '/pmo/planning/intelligence-rules'
    )
    expect(planning.children.find((c) => /governance rules/i.test(c.menu_label))?.route_path).toBe(
      '/pmo/planning/governance-rules'
    )
  })

  it('excludes mis-coded planning hub rows that reuse Dashboard label and route', () => {
    const universalNodes = [
      {
        menu_code: 'pmo-cat-exec',
        menu_label: 'Executive Overview',
        children: [
          { menu_code: 'plat_dashboard_pmo', menu_label: 'Dashboard', route_path: '/platform/dashboard', children: [] },
          {
            menu_code: 'plat_grp_plan_intel',
            menu_label: 'Planning Intelligence',
            route_path: null,
            children: [
              { menu_code: 'pmo_planning_hub', menu_label: 'Dashboard', route_path: '/platform/dashboard', children: [] },
              { menu_code: 'plat_plan_intel_rules', menu_label: 'Intelligence Rules', route_path: '/pmo/planning/intelligence-rules', children: [] },
            ],
          },
        ],
      },
      { menu_code: 'pmo-cat-project-delivery', menu_label: 'Portfolio & Delivery', children: [] },
    ]
    const { universalNodes: nested } = applyPmoSectionNesting(universalNodes, 'pmo')
    const delivery = nested.find((n) => n.menu_code === 'pmo-cat-project-delivery')
    const planning = delivery.children.find((c) => c.menu_label === 'Planning Intelligence')
    expect(planning.children.some((c) => c.menu_label === 'Dashboard')).toBe(false)
  })

  it('excludes executive Dashboard nested under Planning Intelligence group', () => {
    const universalNodes = [
      {
        menu_code: 'pmo-cat-exec',
        menu_label: 'Executive Overview',
        children: [
          { menu_code: 'plat_dashboard_pmo', menu_label: 'Dashboard', route_path: '/platform/dashboard', children: [] },
          {
            menu_code: 'plat_grp_plan_intel',
            menu_label: 'Planning Intelligence',
            route_path: null,
            children: [
              { menu_code: 'plat_plan_intel_hub', menu_label: 'Planning Hub', route_path: '/pmo/planning', children: [] },
              {
                menu_code: 'plat_plan_intel_rules',
                menu_label: 'Intelligence Rules',
                route_path: '/pmo/planning/intelligence-rules',
                children: [],
              },
              {
                menu_code: 'plat_plan_gov_rules',
                menu_label: 'Governance Rules Configuration',
                route_path: '/pmo/planning/governance-rules',
                children: [],
              },
              {
                menu_code: 'plat_dashboard_pmo_nested',
                menu_label: 'Dashboard',
                route_path: '/platform/dashboard',
                children: [],
              },
            ],
          },
        ],
      },
      { menu_code: 'pmo-cat-project-delivery', menu_label: 'Portfolio & Delivery', children: [] },
    ]
    const { universalNodes: nested } = applyPmoSectionNesting(universalNodes, 'pmo')
    const exec = nested.find((n) => n.menu_code === 'pmo-cat-exec')
    const delivery = nested.find((n) => n.menu_code === 'pmo-cat-project-delivery')
    expect(exec.children.filter((c) => c.menu_label === 'Dashboard')).toHaveLength(1)
    const planning = delivery.children.find((c) => c.menu_label === 'Planning Intelligence')
    expect(planning.children.map((c) => c.menu_label)).toEqual([
      'Planning Hub',
      'Intelligence Rules',
      'Governance Rules Configuration',
    ])
  })

  it('nestProjectDeliverySections nests Projects and Project Oversight; moves forms to workflows', () => {
    const universalNodes = [
      {
        menu_code: 'pmo-cat-project-delivery',
        menu_label: 'Project Delivery',
        children: [
          { menu_code: 'my', menu_label: 'My Projects', route_path: '/platform/projects', children: [] },
          { menu_code: 'map', menu_label: 'Story Map', route_path: '/platform/projects/x/scrum/story-map', children: [] },
          { menu_code: 'risk', menu_label: 'Risk Register', route_path: '/pmo/oversight/risk-register', children: [] },
          { menu_code: 'risk2', menu_label: 'Risk Register', route_path: '/pmo/oversight/risk-register', children: [] },
          { menu_code: 'ov1', menu_label: 'Project Oversight', children: [{ menu_code: 'issue', menu_label: 'Issue Register', route_path: '/pmo/oversight/issue-register', children: [] }] },
          { menu_code: 'forms', menu_label: 'Forms & Documents', route_path: '/pmo/forms', children: [] },
        ],
      },
      { menu_code: 'pmo-cat-workflows-approvals', menu_label: 'Workflows', children: [] },
    ]
    const { universalNodes: nested } = nestProjectDeliverySections(universalNodes, 'pmo')
    const delivery = nested.find((n) => n.menu_code === 'pmo-cat-project-delivery')
    const deliveryLabels = delivery.children.map((c) => c.menu_label)
    expect(deliveryLabels).toEqual(expect.arrayContaining(['Project Execution']))
    const execution = delivery.children.find((c) => c.menu_label === 'Project Execution')
    const projects = execution.children.find((c) => c.menu_label === 'Projects')
    expect(projects.children.map((c) => c.menu_label)).toEqual(
      expect.arrayContaining(['My Projects', 'Story Map'])
    )
    const oversight = execution.children.find((c) => c.menu_label === 'Project Oversight')
    expect(oversight.children.map((c) => c.menu_label)).toEqual(
      expect.arrayContaining(['Risk Register', 'Issue Register'])
    )
    expect(oversight.children.filter((c) => c.menu_label === 'Risk Register')).toHaveLength(1)
    const workflows = nested.find((n) => n.menu_code === 'pmo-cat-workflows-approvals')
    expect(workflows.children.some((c) => c.menu_code === 'forms')).toBe(true)
  })

  it('routes Portfolio Overview into Portfolio subsection and dedupes dependencies', () => {
    const universalNodes = [
      {
        menu_code: 'pmo-cat-project-delivery',
        menu_label: 'Portfolio & Delivery',
        children: [
          {
            menu_code: 'plat_portfolio_overview',
            menu_label: 'Portfolio Overview',
            route_path: '/platform/portfolio',
            children: [],
          },
          {
            menu_code: 'pmo-pp-dependencies',
            menu_label: 'Portfolio Dependencies',
            route_path: '/platform/dependencies',
            children: [],
          },
          {
            menu_code: 'plat_portfolio_dependencies',
            menu_label: 'Portfolio Dependencies',
            route_path: '/platform/portfolio/dependencies',
            children: [],
          },
        ],
      },
    ]
    const { universalNodes: nested } = nestProjectDeliverySections(universalNodes, 'pmo')
    const portfolio = nested[0].children.find((c) => c.menu_label === 'Portfolio')
    expect(portfolio?.children?.map((c) => c.menu_label)).toEqual(
      expect.arrayContaining(['Portfolio Overview', 'Portfolio Dependencies'])
    )
    expect(portfolio?.children?.filter((c) => c.menu_label === 'Portfolio Dependencies')).toHaveLength(1)
    expect(portfolio?.children?.find((c) => c.menu_label === 'Portfolio Dependencies')?.route_path).toBe(
      '/platform/portfolio/dependencies'
    )
  })

  it('nestProjectDeliverySections does not keep TM assigned work packages on delivery', () => {
    const universalNodes = [
      {
        menu_code: 'pmo-cat-project-delivery',
        menu_label: 'Project Delivery',
        children: [
          {
            menu_code: 'plat_tm_work_packages',
            menu_label: 'My Work Packages (assigned)',
            route_path: '/pm/delivery/work-packages',
            children: [],
          },
          {
            menu_code: 'plat_tl_work_packages',
            menu_label: 'Work Packages',
            route_path: '/pm/delivery/work-packages',
            children: [],
          },
          {
            menu_code: 'cal',
            menu_label: 'Calendar',
            route_path: '/platform/calendar',
            children: [],
          },
        ],
      },
    ]
    const { universalNodes: nested } = nestProjectDeliverySections(universalNodes, 'pmo')
    const delivery = nested.find((n) => n.menu_code === 'pmo-cat-project-delivery')
    const collectLabels = (nodes) =>
      (nodes || []).flatMap((c) => [c.menu_label, ...collectLabels(c.children)])
    const labels = collectLabels(delivery.children)
    expect(labels).not.toContain('My Work Packages (assigned)')
    expect(labels).not.toContain('Work Packages')
    expect(labels).toContain('Calendar')
  })

  it('nestProjectDeliverySections relocates Delay Templates to Knowledge Template Library, not oversight', () => {
    const universalNodes = [
      {
        menu_code: 'pmo-cat-project-delivery',
        menu_label: 'Project Delivery',
        children: [
          {
            menu_code: 'pmo_oversight_delay_templates',
            menu_label: 'Delay Templates',
            route_path: '/pmo/delays/templates',
            children: [],
          },
          {
            menu_code: 'pmo_oversight_delays',
            menu_label: 'Delay Register',
            route_path: '/pmo/oversight/delays',
            children: [],
          },
        ],
      },
      { menu_code: 'pmo-cat-knowledge-assets', menu_label: 'Knowledge & Operations', children: [] },
    ]
    const { universalNodes: nested } = nestProjectDeliverySections(universalNodes, 'pmo')
    const delivery = nested.find((n) => n.menu_code === 'pmo-cat-project-delivery')
    const execution = delivery.children.find((c) => c.menu_label === 'Project Execution')
    const oversight = execution?.children.find((c) => c.menu_label === 'Project Oversight')
    expect(oversight.children.map((c) => c.menu_label)).toEqual(
      expect.arrayContaining(['Delay Register'])
    )
    expect(oversight.children.some((c) => c.menu_label === 'Delay Templates')).toBe(false)
    const knowledge = nested.find((n) => n.menu_code === 'pmo-cat-knowledge-assets')
    expect(knowledge.children.some((c) => c.menu_label === 'Delay Templates')).toBe(true)
  })

  it('nestV671CategoryNode includes Delay Templates under Knowledge Template Library', () => {
    const node = {
      menu_code: 'pmo-cat-knowledge-assets',
      menu_label: 'Knowledge & Operations',
      children: [
        { menu_code: 'pmo_pt_hub', menu_label: 'Template Hub', route_path: '/pmo/process-templates', children: [] },
        {
          menu_code: 'pmo_oversight_delay_templates',
          menu_label: 'Delay Templates',
          route_path: '/pmo/delays/templates',
          children: [],
        },
      ],
    }
    const nested = nestV671CategoryNode(node, 'pmo')
    const templateLibrary = nested.children.find((c) => c.menu_label === 'Template Library')
    expect(templateLibrary).toBeTruthy()
    expect(templateLibrary.children.map((c) => c.menu_label)).toEqual(
      expect.arrayContaining(['Template Hub', 'Delay Templates'])
    )
  })

  it('applyPmoSectionNesting applies exec and delivery nesting together', () => {
    const roots = [
      { menu_code: 'dash', menu_label: 'Dashboard', route_path: '/platform/dashboard', children: [] },
      { menu_code: 'my', menu_label: 'My Projects', route_path: '/platform/projects', children: [] },
    ]
    const { universalNodes } = reorganizePmoMenuRoots(roots)
    const { universalNodes: nested } = applyPmoSectionNesting(universalNodes, 'pmo')
    const exec = nested.find((n) => n.menu_code === 'pmo-cat-exec')
    const delivery = nested.find((n) => n.menu_code === 'pmo-cat-project-delivery')
    expect(exec?.children?.some((c) => c.menu_label === 'Dashboard')).toBe(true)
    const execution = delivery?.children?.find((c) => c.menu_label === 'Project Execution')
    expect(execution?.children?.some((c) => c.menu_label === 'Projects')).toBe(true)
  })

  it('reorganizeMenuRoots works for sim_pmo layout', () => {
    const roots = [
      { menu_code: 'sim_pmo_dashboard', menu_label: 'Practice Dashboard', route_path: '/simulator/pmo/dashboard', children: [] },
      { menu_code: 'sim_pmo_cat_initiation', menu_label: 'Practice Pre-Project Docs', children: [] },
    ]
    const { universalNodes, trackCategoryNodes, orphanCount } = reorganizeMenuRoots(roots, 'sim_pmo')
    expect(orphanCount).toBe(1)
    expect(trackCategoryNodes.some((n) => n.menu_code === 'sim_pmo_cat_initiation')).toBe(true)
    expect(universalNodes.some((n) => n.menu_code === 'sim_pmo_cat_exec')).toBe(true)
  })

  it('reorganizeMenuRoots uses PM universal rows (not PMO Executive Overview) for pm layout', () => {
    const roots = [
      {
        menu_code: 'plat_sec_universal',
        menu_label: 'Universal',
        children: [
          { menu_code: 'plat_pm_dashboard', menu_label: 'Dashboard', route_path: '/pm/dashboard', children: [] },
          { menu_code: 'plat_grp_pm_projects', menu_label: 'Projects', children: [
            { menu_code: 'plat_pm_my_projects', menu_label: 'My Projects', route_path: '/pm/projects', children: [] },
          ] },
        ],
      },
      {
        menu_code: 'plat_sec_exec_overview',
        menu_label: 'Executive Overview',
        children: [
          { menu_code: 'plat_dashboard_pmo', menu_label: 'Dashboard', route_path: '/platform/dashboard', children: [] },
        ],
      },
    ]
    const { universalNodes } = reorganizeMenuRoots(roots, 'pm')
    const labels = universalNodes.map((n) => n.menu_label)
    expect(labels).toContain('Dashboard')
    expect(labels).toContain('Projects')
    expect(labels).not.toContain('Executive Overview')
    expect(labels).not.toContain('Portfolio & Delivery')
  })

  it('applyPmLayoutSanitization removes methodology items from Projects group', () => {
    const universalNodes = [
      {
        menu_code: 'plat_grp_pm_projects',
        menu_label: 'Projects',
        children: [
          { menu_code: 'plat_pm_my_projects', menu_label: 'My Projects', route_path: '/pm/projects', children: [] },
          { menu_code: 'plat_a_scrum_of_scrums', menu_label: 'Scrum of Scrums', route_path: '/platform/scrum-of-scrums', children: [] },
          { menu_code: 'plat_grp_pm_itto', menu_label: 'ITTO Framework', children: [
            { menu_code: 'plat_pm_p_itto_templates', menu_label: 'ITTO Templates', route_path: '/platform/itto/templates', children: [] },
          ] },
          { menu_code: 'plat_grp_pm_gov_standards', menu_label: 'Governance & Standards', children: [] },
        ],
      },
    ]
    const { universalNodes: cleaned, trackCategoryNodes } = applyPmLayoutSanitization(universalNodes, [])
    const projects = cleaned.find((n) => n.menu_code === 'plat_grp_pm_projects')
    expect(projects?.children?.map((c) => c.menu_label)).toEqual(['My Projects'])
    expect(trackCategoryNodes.some((n) => n.menu_code === 'pmo-cat-agile-lean')).toBe(true)
    expect(trackCategoryNodes.some((n) => n.menu_code === 'pmo-cat-standards-based')).toBe(true)
    expect(trackCategoryNodes.some((n) => n.menu_code === 'pmo-cat-governance-standards')).toBe(true)
  })

  it('nestV671CategoryNode groups Reporting & Intelligence per v671', () => {
    const node = {
      menu_code: 'pmo-cat-reporting-intelligence',
      menu_label: 'Reporting & Intelligence',
      children: [
        { menu_code: 'fin', menu_label: 'Financial Reports', route_path: '/platform/financial-reports', children: [] },
        { menu_code: 'pevm', menu_label: 'Programme EVM', route_path: '/platform/programme/evm', children: [] },
        { menu_code: 'jevm', menu_label: 'Project EVM', route_path: '/platform/projects/evm', children: [] },
        { menu_code: 'junk', menu_label: 'Random Report', route_path: '/other', children: [] },
      ],
    }
    const nested = nestV671CategoryNode(node, 'pmo')
    expect(nested.children.map((c) => c.menu_label)).toEqual([
      'Reporting & Assurance',
      'Financial Management',
    ])
    const financial = nested.children.find((c) => c.menu_label === 'Financial Management')
    expect(financial.children.some((c) => c.menu_label === 'Financial Reports')).toBe(true)
    expect(financial.children.some((c) => c.menu_label === 'Programme EVM')).toBe(true)
    expect(financial.children.some((c) => c.menu_label === 'Project EVM')).toBe(true)
  })

  it('nestV671TrackCategories nests agile-lean into three v671 subsections', () => {
    const tracks = [
      {
        menu_code: 'pmo-cat-agile-lean',
        menu_label: 'pmo-cat-agile-lean',
        children: [
          {
            menu_code: 'pmo-agile-scrum-of-scrums',
            menu_label: 'Scrum of Scrums',
            route_path: '/platform/projects/x/scrum/scrum-of-scrums',
            children: [],
          },
        ],
      },
    ]
    const nested = nestV671TrackCategories(tracks, 'pmo')
    expect(nested[0].children.map((c) => c.menu_label)).toEqual([
      'Agile & Lean Tools',
      'Agile Delivery',
      'Agile Metrics',
    ])
    const tools = nested[0].children.find((c) => c.menu_label === 'Agile & Lean Tools')
    expect(tools?.children?.some((c) => c.menu_label === 'Scrum of Scrums')).toBe(true)
  })

  it('applyCategoryPresentationLabels replaces raw pmo-cat-* menu_label', () => {
    const nodes = [
      { menu_code: 'pmo-cat-initiation', menu_label: 'pmo-cat-initiation', children: [] },
      { menu_code: 'pmo-cat-agile-lean', menu_label: 'pmo-cat-agile-lean', children: [] },
    ]
    const labeled = applyCategoryPresentationLabels(nodes)
    expect(labeled[0].menu_label).toBe('Initiation Hub')
    expect(labeled[1].menu_label).toBe('Agile & Lean Tools')
  })

  it('nestV671CategoryNode groups Administration into three subsections', () => {
    const node = {
      menu_code: 'pmo-cat-admin',
      menu_label: 'Administration',
      children: [
        { menu_code: 'x1', menu_label: 'Organisation Settings', route_path: '/platform/pmo-admin/settings', children: [] },
        { menu_code: 'x2', menu_label: 'Project Types', route_path: '/platform/pmo-admin/project-types', children: [] },
        { menu_code: 'x3', menu_label: 'Form Templates', route_path: '/platform/admin/form-templates', children: [] },
      ],
    }
    const nested = nestV671CategoryNode(node, 'pmo')
    expect(nested.children.map((c) => c.menu_label)).toEqual([
      'Organisation & Access',
      'Project Configuration',
      'Extensions & Integrations',
    ])
    const org = nested.children.find((c) => c.menu_label === 'Organisation & Access')
    expect(org?.children?.some((c) => c.menu_label === 'Organisation Settings')).toBe(true)
    const project = nested.children.find((c) => c.menu_label === 'Project Configuration')
    expect(project?.children?.some((c) => c.menu_label === 'Project Types')).toBe(true)
    const ext = nested.children.find((c) => c.menu_label === 'Extensions & Integrations')
    expect(ext?.children?.some((c) => c.menu_label === 'Form Templates')).toBe(true)
  })

  it('sanitizes portfolio items misplaced under Administration', () => {
    const universalNodes = [
      {
        menu_code: 'pmo-cat-admin',
        menu_label: 'Administration',
        children: [
          {
            menu_code: 'pmo-cat-portfolio',
            menu_label: 'Portfolio',
            children: [
              {
                menu_code: 'pmo-pp-dependencies',
                menu_label: 'Portfolio Dependencies',
                route_path: '/platform/dependencies',
                children: [],
              },
            ],
          },
          {
            menu_code: 'pmo-admin-org-settings',
            menu_label: 'Organisation Settings',
            route_path: '/platform/pmo-admin/settings',
            children: [],
          },
        ],
      },
      { menu_code: 'pmo-cat-exec', menu_label: 'Executive Overview', children: [] },
      { menu_code: 'pmo-cat-project-delivery', menu_label: 'Portfolio & Delivery', children: [] },
    ]
    const { universalNodes: nested } = applyPmoSectionNesting(universalNodes, 'pmo')
    const admin = nested.find((n) => n.menu_code === 'pmo-cat-admin')
    const adminLabels = (admin?.children || []).flatMap((subsection) =>
      (subsection.children || []).length
        ? (subsection.children || []).map((x) => x.menu_label)
        : [subsection.menu_label]
    )
    expect(adminLabels).not.toContain('Portfolio Dependencies')
    expect(adminLabels).toContain('Organisation Settings')
    const delivery = nested.find((n) => n.menu_code === 'pmo-cat-project-delivery')
    const deliveryPortfolio = delivery?.children?.find((c) => c.menu_label === 'Portfolio')
    expect(deliveryPortfolio?.children?.some((c) => c.menu_label === 'Portfolio Dependencies')).toBe(true)
  })

  it('v681 executive overview does not duplicate Dashboard under Planning Intelligence', () => {
    const roots = [
      {
        menu_code: 'pmo-cat-exec',
        menu_label: 'Executive Overview',
        sort_order: 1,
        children: [
          {
            menu_code: 'plat_sec_exec_overview',
            menu_label: 'Executive Overview',
            sort_order: 1,
            children: [
              { menu_code: 'plat_dashboard_pmo', menu_label: 'Dashboard', route_path: '/platform/dashboard', sort_order: 10, children: [] },
              {
                menu_code: 'plat_grp_portfolio',
                menu_label: 'Portfolio',
                route_path: null,
                sort_order: 20,
                children: [
                  { menu_code: 'plat_portfolio_dependencies', menu_label: 'Portfolio Dependencies', route_path: '/platform/portfolio/dependencies', children: [] },
                ],
              },
              {
                menu_code: 'plat_grp_programme',
                menu_label: 'Programme',
                route_path: null,
                sort_order: 30,
                children: [
                  { menu_code: 'plat_programme_management', menu_label: 'Programme Management', route_path: '/platform/programme', children: [] },
                ],
              },
              {
                menu_code: 'plat_grp_plan_intel',
                menu_label: 'Planning Intelligence',
                route_path: null,
                sort_order: 40,
                children: [
                  { menu_code: 'plat_plan_intel_hub', menu_label: 'Planning Hub', route_path: '/pmo/planning', children: [] },
                  { menu_code: 'plat_plan_intel_rules', menu_label: 'Intelligence Rules', route_path: '/pmo/planning/intelligence-rules', children: [] },
                  { menu_code: 'plat_plan_gov_rules', menu_label: 'Governance Rules Configuration', route_path: '/pmo/planning/governance-rules', children: [] },
                ],
              },
            ],
          },
          { menu_code: 'pmo_dashboard', menu_label: 'Dashboard', route_path: '/platform/dashboard', sort_order: 2, children: [] },
          {
            menu_code: 'pmo-cat-planning',
            menu_label: 'Planning Intelligence',
            route_path: null,
            children: [
              { menu_code: 'pmo-planning-hub', menu_label: 'Planning Hub', route_path: '/pmo/planning', children: [] },
              { menu_code: 'pmo-planning-intelligence', menu_label: 'Intelligence Rules', route_path: '/pmo/planning/intelligence', children: [] },
              { menu_code: 'pmo-planning-governance-config', menu_label: 'Governance Rules Config', route_path: '/pmo/planning/governance-config', children: [] },
            ],
          },
        ],
      },
      { menu_code: 'pmo-cat-project-delivery', menu_label: 'Portfolio & Delivery', children: [] },
    ]
    const { universalNodes } = reorganizePmoMenuRoots(roots)
    const { universalNodes: nested } = applyPmoSectionNesting(universalNodes, 'pmo')
    const exec = nested.find((n) => n.menu_code === 'pmo-cat-exec')
    const delivery = nested.find((n) => n.menu_code === 'pmo-cat-project-delivery')
    const planning = delivery?.children?.find((c) => c.menu_label === 'Planning Intelligence')
    const allDashboards = []
    const walk = (nodes) => {
      for (const n of nodes || []) {
        if (n.menu_label === 'Dashboard') allDashboards.push(n)
        walk(n.children)
      }
    }
    walk(exec?.children)
    expect(allDashboards).toHaveLength(1)
    expect(exec?.children?.filter((c) => c.menu_label === 'Dashboard')).toHaveLength(1)
    expect(planning?.children?.some((c) => c.menu_label === 'Dashboard')).toBe(false)
  })

  it('dedupes trailing-space Dashboard rows mis-bucketed into other', () => {
    const universalNodes = [
      {
        menu_code: 'pmo-cat-exec',
        menu_label: 'Executive Overview',
        children: [
          { menu_code: 'plat_dashboard_pmo', menu_label: 'Dashboard', route_path: '/platform/dashboard', children: [] },
          {
            menu_code: 'plat_grp_portfolio',
            menu_label: 'Portfolio',
            route_path: null,
            children: [
              { menu_code: 'plat_portfolio_dependencies', menu_label: 'Portfolio Dependencies', route_path: '/platform/portfolio/dependencies', children: [] },
            ],
          },
          {
            menu_code: 'plat_grp_programme',
            menu_label: 'Programme',
            route_path: null,
            children: [
              { menu_code: 'plat_programme_management', menu_label: 'Programme Management', route_path: '/platform/programme', children: [] },
            ],
          },
          {
            menu_code: 'plat_grp_plan_intel',
            menu_label: 'Planning Intelligence',
            route_path: null,
            children: [
              { menu_code: 'plat_plan_intel_hub', menu_label: 'Planning Hub', route_path: '/pmo/planning', children: [] },
            ],
          },
          { menu_code: 'pmo_dashboard_legacy', menu_label: 'Dashboard ', route_path: '/platform/dashboard', children: [] },
        ],
      },
      { menu_code: 'pmo-cat-project-delivery', menu_label: 'Portfolio & Delivery', children: [] },
    ]
    const { universalNodes: nested } = applyPmoSectionNesting(universalNodes, 'pmo')
    const exec = nested.find((n) => n.menu_code === 'pmo-cat-exec')
    const delivery = nested.find((n) => n.menu_code === 'pmo-cat-project-delivery')
    expect(exec.children.filter((c) => String(c.menu_label || '').trim().toLowerCase() === 'dashboard')).toHaveLength(1)
    expect(exec.children).toHaveLength(1)
    expect(delivery.children.map((c) => c.menu_label)).toEqual(
      expect.arrayContaining(['Portfolio', 'Programme', 'Planning Intelligence'])
    )
  })

  it('keeps Planning Intelligence container in planning bucket when route_path is mis-set to dashboard', () => {
    const universalNodes = [
      {
        menu_code: 'pmo-cat-exec',
        menu_label: 'Executive Overview',
        children: [
          { menu_code: 'plat_dashboard_pmo', menu_label: 'Dashboard', route_path: '/platform/dashboard', children: [] },
          {
            menu_code: 'plat_grp_plan_intel',
            menu_label: 'Planning Intelligence',
            route_path: '/platform/dashboard',
            children: [
              { menu_code: 'plat_plan_intel_hub', menu_label: 'Planning Hub', route_path: '/pmo/planning', children: [] },
            ],
          },
        ],
      },
      { menu_code: 'pmo-cat-project-delivery', menu_label: 'Portfolio & Delivery', children: [] },
    ]
    const { universalNodes: nested } = applyPmoSectionNesting(universalNodes, 'pmo')
    const exec = nested.find((n) => n.menu_code === 'pmo-cat-exec')
    const delivery = nested.find((n) => n.menu_code === 'pmo-cat-project-delivery')
    expect(exec.children.filter((c) => String(c.menu_label || '').trim().toLowerCase() === 'dashboard')).toHaveLength(1)
    expect(delivery.children.some((c) => c.menu_label === 'Planning Intelligence')).toBe(true)
  })

  it('keeps existing pmo-cat-* nodes without duplicating track categories', () => {
    const roots = [
      { menu_code: 'pmo-cat-exec', menu_label: 'Executive Overview', sort_order: 1, children: [{ menu_code: 'dash', menu_label: 'Dashboard' }] },
      { menu_code: 'pmo-cat-initiation', menu_label: 'Pre-Project Docs', sort_order: 2, children: [] },
    ]
    const { universalNodes, trackCategoryNodes, orphanCount } = reorganizePmoMenuRoots(roots)
    expect(orphanCount).toBe(0)
    expect(universalNodes.some((n) => n.menu_code === 'pmo-cat-exec')).toBe(true)
    expect(trackCategoryNodes.some((n) => n.menu_code === 'pmo-cat-initiation')).toBe(true)
  })

  it('splits v681 plat_sec_structured into Initiation Hub and Governance & Standards track categories', () => {
    const roots = [
      { menu_code: 'pmo-cat-initiation', menu_label: 'Initiation Hub', children: [] },
      { menu_code: 'pmo-cat-governance-standards', menu_label: 'Governance & Standards', children: [] },
      {
        menu_code: 'plat_sec_structured',
        menu_label: '[S] Predictive – Structured',
        children: [
          {
            menu_code: 'plat_grp_initiation',
            menu_label: 'Initiation Hub',
            children: [
              {
                menu_code: 'pmo-init-mandates-all',
                menu_label: 'All Mandates',
                route_path: '/platform/mandates/list',
                children: [],
              },
            ],
          },
          {
            menu_code: 'plat_grp_gov_standards',
            menu_label: 'Governance & Standards',
            children: [
              {
                menu_code: 'plat_s_cms',
                menu_label: 'Communication Management Strategy',
                route_path: '/pm/governance/communication-strategy',
                children: [],
              },
              {
                menu_code: 'plat_s_rms',
                menu_label: 'Risk Management Strategy',
                route_path: '/pm/governance/risk-strategy',
                children: [],
              },
            ],
          },
        ],
      },
    ]
    const { trackCategoryNodes } = reorganizeMenuRoots(roots, 'pmo')
    const nested = nestV671TrackCategories(trackCategoryNodes, 'pmo')
    const initiation = nested.find((n) => n.menu_code === 'pmo-cat-initiation')
    const governance = nested.find((n) => n.menu_code === 'pmo-cat-governance-standards')
    expect(initiation?.children?.some((c) => c.menu_label === 'Project Mandates')).toBe(true)
    expect(
      initiation?.children
        ?.find((c) => c.menu_label === 'Project Mandates')
        ?.children?.some((c) => c.menu_label === 'All Mandates')
    ).toBe(true)
    expect(governance?.children?.map((c) => c.menu_label)).toEqual(
      expect.arrayContaining([
        'Communication Strategy',
        'Risk Strategy',
        'Project Initiation Documents (PIDs)',
        'Enterprise Environmental Factors (EEF)',
        'Organisational Process Assets (OPA)',
      ])
    )
  })

  it('nestV671TrackCategories renders full Governance & Standards list with short strategy labels', () => {
    const tracks = [
      { menu_code: 'pmo-cat-governance-standards', menu_label: 'Governance & Standards', children: [] },
    ]
    const nested = nestV671TrackCategories(tracks, 'pmo')
    const governance = nested.find((n) => n.menu_code === 'pmo-cat-governance-standards')
    expect(governance?.children?.map((c) => c.menu_label)).toEqual([
      'Communication Strategy',
      'Configuration Strategy',
      'Quality Strategy',
      'Risk Strategy',
      'Project Initiation Documents (PIDs)',
      'ITTO Templates / Drafts',
      'Enterprise Environmental Factors (EEF)',
      'Organisational Process Assets (OPA)',
    ])
  })

  it('relocates governance leaves misbucketed under initiation before track nesting', () => {
    const tracks = [
      {
        menu_code: 'pmo-cat-initiation',
        menu_label: 'Initiation Hub',
        children: [
          {
            menu_code: 'plat_grp_gov_standards',
            menu_label: 'Governance & Standards',
            children: [
              {
                menu_code: 'plat_s_qms',
                menu_label: 'Quality Management Strategy',
                route_path: '/pm/governance/quality-strategy',
                children: [],
              },
            ],
          },
        ],
      },
      { menu_code: 'pmo-cat-governance-standards', menu_label: 'Governance & Standards', children: [] },
    ]
    const nested = nestV671TrackCategories(tracks, 'pmo')
    const initiation = nested.find((n) => n.menu_code === 'pmo-cat-initiation')
    const governance = nested.find((n) => n.menu_code === 'pmo-cat-governance-standards')
    expect(initiation?.children?.some((c) => /quality management strategy/i.test(c.menu_label))).toBe(false)
    expect(governance?.children?.some((c) => c.menu_label === 'Quality Strategy')).toBe(true)
  })
})

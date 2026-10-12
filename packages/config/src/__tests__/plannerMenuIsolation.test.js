// v1239 (D19): Project Planner (pln_) menu rows never reach a Platform or Simulator sidebar.
import { describe, it, expect } from 'vitest'
import { stripPlannerMenuNodes, reorganizeMenuRoots } from '../pmoMenuHierarchyUtils.js'

const tree = [
  { menu_code: 'pln_home', route_path: '/app', children: [] },
  {
    menu_code: 'plat_pm_planning', children: [
      { menu_code: 'plat_pm_planning_gantt', route_path: '/platform/projects/:id/schedule/gantt', children: [] },
      { menu_code: 'pln_schedule_gantt', route_path: '/app/schedule/gantt', children: [] },
    ],
  },
  { menu_code: 'sim_pm_planning_section', children: [{ menu_code: 'pln_workload', route_path: '/app/schedule/workload' }] },
]

const codes = (nodes) => nodes.flatMap((n) => [n.menu_code, ...codes(n.children || [])])

describe('planner menu isolation', () => {
  it('stripPlannerMenuNodes removes pln_ rows at any depth and keeps everything else', () => {
    const out = codes(stripPlannerMenuNodes(tree))
    expect(out.some((c) => c.startsWith('pln_'))).toBe(false)
    expect(out).toEqual(['plat_pm_planning', 'plat_pm_planning_gantt', 'sim_pm_planning_section'])
  })

  it.each(['pmo', 'pm', 'tm', 'sim_pmo'])('reorganizeMenuRoots(%s) never outputs a pln_ row', (layout) => {
    const result = reorganizeMenuRoots(tree, layout)
    const all = [...(result.universalNodes || []), ...(result.trackCategoryNodes || [])]
    expect(codes(all).some((c) => String(c).startsWith('pln_'))).toBe(false)
  })
})

import { describe, expect, it } from 'vitest'
import {
  filterExcludedPmoLayoutMenuItems,
  isExcludedPmoAssignedWorkPackageNode,
} from '../pmoLayoutMenuExclusions.js'

describe('pmoLayoutMenuExclusions', () => {
  it('flags TM/TL assigned work-package menu codes', () => {
    expect(isExcludedPmoAssignedWorkPackageNode({ menu_code: 'plat_tm_work_packages' })).toBe(true)
    expect(isExcludedPmoAssignedWorkPackageNode({ menu_code: 'plat_tm_s_work_packages_ro' })).toBe(true)
    expect(isExcludedPmoAssignedWorkPackageNode({ menu_code: 'plat_tl_work_packages' })).toBe(true)
    expect(isExcludedPmoAssignedWorkPackageNode({ menu_code: 'plat_pm_s_work_packages' })).toBe(false)
  })

  it('removes assigned work-package leaves from Project Delivery', () => {
    const tree = [
      {
        menu_code: 'pmo-cat-project-delivery',
        menu_label: 'Project Delivery',
        children: [
          { menu_code: 'cal', menu_label: 'Calendar', route_path: '/platform/calendar', children: [] },
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
        ],
      },
    ]

    const filtered = filterExcludedPmoLayoutMenuItems(tree)
    const delivery = filtered[0]
    expect(delivery.children.map((c) => c.menu_label)).toEqual(['Calendar'])
  })
})

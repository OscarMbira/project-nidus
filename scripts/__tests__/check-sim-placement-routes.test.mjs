import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mountedRoutePatterns, findUnmountedPlacements, simulatorRouteFiles } from '../check-sim-placement-routes.mjs'

test('flags placed Simulator items whose route is not mounted (v1341 R8)', () => {
  const patterns = mountedRoutePatterns([
    '<Route path="simulator/practice-projects/:projectId/assumptions" element={<X />} />',
    '<Route path="simulator/governance/decisions" element={<Y />} />',
    '<Route path="*" element={<NotFound />} />',
  ])
  const rows = [
    { placement_key: 'pm', menu_code: 'sim_pm_assumptions', route_path: '/simulator/practice-projects/abc/assumptions' },
    { placement_key: 'pm', menu_code: 'sim_pm_decision_log', route_path: '/simulator/governance/decisions?x=1' },
    { placement_key: 'pm', menu_code: 'sim_pm_dead', route_path: '/simulator/dead-page' },
  ]
  assert.deepEqual(findUnmountedPlacements(rows, patterns).map((r) => r.menu_code), ['sim_pm_dead'])
})

test('reads the Simulator route files', () => {
  const files = simulatorRouteFiles()
  assert.ok(files.some((f) => /simulatorRoutes\.jsx$/.test(f)))
})

test('a nested "/*" route also matches its base path', () => {
  const patterns = mountedRoutePatterns(['<Route path="simulator/pm/templates/project/*" element={<X />} />'])
  const rows = [
    { placement_key: 'pm', menu_code: 'a', route_path: '/simulator/pm/templates/project' },
    { placement_key: 'pm', menu_code: 'b', route_path: '/simulator/pm/templates/project/abc/forms' },
    { placement_key: 'pm', menu_code: 'c', route_path: '/simulator/pm/templates' },
  ]
  assert.deepEqual(findUnmountedPlacements(rows, patterns).map((r) => r.menu_code), ['c'])
})

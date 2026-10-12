// v1239 Slice 2.6 — screen contract: the shared planning screens take their data mode from the
// shell (PlanningProvider), never from the URL, and read the matching schema's service.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { render, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const { platformApi, simApi } = vi.hoisted(() => ({
  platformApi: {
    getLatestScore: vi.fn(async () => ({ overall_score: 70 })),
    getScoreHistory: vi.fn(async () => []),
    calculateScore: vi.fn(),
  },
  simApi: {
    getScoreHistory: vi.fn(async () => [{ overall_score: 55 }]),
    calculateScore: vi.fn(),
  },
}))
vi.mock('../../services/platform/planHealthScoreService', () => platformApi)
vi.mock('../../services/sim/simPlanHealthScoreService', () => simApi)
vi.mock('react-hot-toast', () => ({ default: { error: vi.fn(), success: vi.fn() } }))

import { PlanningProvider } from '../../context/PlanningContext.jsx'
import PlanHealthDashboard from '../hub/health/PlanHealthDashboard.jsx'

const here = path.dirname(fileURLToPath(import.meta.url))
const hubDir = path.resolve(here, '../hub')
const screens = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
  const p = path.join(dir, e.name)
  return e.isDirectory() ? screens(p) : p.endsWith('.jsx') ? [p] : []
})

describe('planning screen contract', () => {
  it('no hub screen decides its data mode from the URL', () => {
    const offenders = screens(hubDir).filter((f) => /pathname\.includes\('\/simulator\/'\)/.test(fs.readFileSync(f, 'utf8')))
    expect(offenders.map((f) => path.relative(hubDir, f))).toEqual([])
  })

  it('every screen that branches on isSim gets it from usePlanning()', () => {
    const offenders = screens(hubDir).filter((f) => {
      const src = fs.readFileSync(f, 'utf8')
      return /\bisSim\b/.test(src) && !/usePlanning\(\)/.test(src)
    })
    expect(offenders.map((f) => path.relative(hubDir, f))).toEqual([])
  })

  describe('same screen, both schemas (PlanHealthDashboard)', () => {
    beforeEach(() => vi.clearAllMocks())

    const renderIn = (mode) =>
      render(
        <MemoryRouter initialEntries={['/x?projectId=11111111-1111-1111-1111-111111111111']}>
          <PlanningProvider mode={mode} basePath="/x">
            <PlanHealthDashboard />
          </PlanningProvider>
        </MemoryRouter>
      )

    it('Simulator mode reads the sim service only', async () => {
      renderIn('simulator')
      await waitFor(() => expect(simApi.getScoreHistory).toHaveBeenCalled())
      expect(platformApi.getLatestScore).not.toHaveBeenCalled()
    })

    it('Platform and Planner modes read the public service only', async () => {
      for (const mode of ['platform', 'planner']) {
        vi.clearAllMocks()
        const { unmount } = renderIn(mode)
        await waitFor(() => expect(platformApi.getLatestScore).toHaveBeenCalled())
        expect(simApi.getScoreHistory).not.toHaveBeenCalled()
        unmount()
      }
    })
  })
})

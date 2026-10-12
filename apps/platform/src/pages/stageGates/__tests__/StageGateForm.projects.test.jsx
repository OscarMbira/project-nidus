import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import StageGateForm from '../StageGateForm'

const current = vi.hoisted(() => ({
  projects: [],
  currentProjectId: null,
  loading: false,
}))

vi.mock('../../../lib/CurrentProjectContext', () => ({
  useCurrentProject: () => current,
}))

function renderForm() {
  return render(
    <MemoryRouter>
      <StageGateForm />
    </MemoryRouter>
  )
}

describe('Stage gate project dropdown', () => {
  beforeEach(() => {
    current.projects = []
    current.currentProjectId = null
    current.loading = false
  })

  it('defaults to the only assigned project', () => {
    current.projects = [
      { projectId: 'p-freight', projectName: 'Velocity Freight', projectCode: 'SEED334-PRJ-08' },
    ]
    renderForm()
    const select = screen.getByLabelText('Project')
    expect(select).toHaveValue('p-freight')
    expect([...select.options].map((option) => option.textContent)).toEqual([
      '— Select project —',
      'SEED334-PRJ-08 — Velocity Freight',
    ])
  }, 15000)

  it('lists only assigned projects and starts on the current one', () => {
    current.projects = [
      { projectId: 'p-other', projectName: 'Crew Rostering', projectCode: 'SEED334-PRJ-02' },
      { projectId: 'p-freight', projectName: 'Velocity Freight', projectCode: 'SEED334-PRJ-08' },
    ]
    current.currentProjectId = 'p-freight'
    renderForm()
    const select = screen.getByLabelText('Project')
    expect(select).toHaveValue('p-freight')
    expect([...select.options].map((option) => option.textContent)).toEqual([
      '— Select project —',
      'SEED334-PRJ-02 — Crew Rostering',
      'SEED334-PRJ-08 — Velocity Freight',
    ])
  }, 15000)
})

import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import TestingPageShell from '../TestingPageShell'

vi.mock('../../../context/CurrentProjectContext', () => ({
  useCurrentProject: () => ({
    projects: [{ projectId: 'p1', projectName: 'Demo', projectCode: 'DEMO-01' }],
    currentProjectId: 'p1',
    setCurrentProject: vi.fn(),
    loading: false,
  }),
}))

describe('TestingPageShell width (fix: fills available space when the sidebar is collapsed)', () => {
  it('does not cap the header or body width with a max-w-* class', () => {
    const { container } = render(
      <MemoryRouter>
        <TestingPageShell title="Defects" subtitle="Issues from failed tests.">
          {() => <div>body</div>}
        </TestingPageShell>
      </MemoryRouter>,
    )

    const capped = container.querySelectorAll('[class*="max-w-"]')
    expect(capped.length).toBe(0)
  })
})

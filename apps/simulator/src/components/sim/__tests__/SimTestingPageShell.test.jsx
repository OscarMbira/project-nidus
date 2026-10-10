import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import SimTestingPageShell from '../SimTestingPageShell'

vi.mock('../../../services/supabase/supabaseClient', () => ({
  simDb: {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    from: vi.fn(() => ({
      select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null }) }) }),
    })),
  },
}))

vi.mock('../../../services/sim/practiceProjectService', () => ({
  getMyPracticeProjects: vi.fn().mockResolvedValue({ success: true, data: [] }),
}))

describe('SimTestingPageShell width (fix: fills available space when the sidebar is collapsed)', () => {
  it('does not cap the header or body width with a max-w-* class', () => {
    const { container } = render(
      <MemoryRouter>
        <SimTestingPageShell title="Defects" subtitle="Issues from failed tests.">
          {() => <div>body</div>}
        </SimTestingPageShell>
      </MemoryRouter>,
    )

    // Only the shell's own header-row and body wrappers matter here — the
    // project-select dropdown legitimately caps its own width and is not part
    // of this check.
    const headerRow = container.querySelector('.border-b > div')
    const body = container.querySelector(':scope > div > div:last-child')
    expect(headerRow.className).not.toMatch(/max-w-/)
    expect(body.className).not.toMatch(/max-w-/)
  })
})

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ProjectFormTabs from '../ProjectFormTabs'

describe('ProjectFormTabs (wizard steps)', () => {
  it('renders step navigation including Portfolio and Programme', () => {
    const setActive = vi.fn()
    render(
      <ProjectFormTabs
        activeTab="details"
        setActiveTab={setActive}
        formData={{ project_name: 'X', portfolio_id: null, programme_id: null }}
      />,
    )
    expect(screen.getByRole('button', { name: /Project Details/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Portfolio/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Programme/i })).toBeInTheDocument()
  })

  it('calls setActiveTab when a step is clicked', async () => {
    const user = userEvent.setup()
    const setActive = vi.fn()
    render(<ProjectFormTabs activeTab="details" setActiveTab={setActive} formData={{}} />)
    await user.click(screen.getByRole('button', { name: /Governance/i }))
    expect(setActive).toHaveBeenCalledWith('governance')
  })
})

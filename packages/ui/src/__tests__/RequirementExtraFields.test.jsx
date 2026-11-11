import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import RequirementExtraFields from '../RequirementExtraFields'

const areas = [{ value: 'volumes', label: 'Volumes' }, { value: 'performance', label: 'Performance' }]

describe('RequirementExtraFields (v1338)', () => {
  it('renders nothing until the columns exist', () => {
    const { container } = render(<RequirementExtraFields section="details" form={{}} onChange={() => {}} available={false} areas={areas} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('shows Owner and Rationale on Details, and Area only for non-functional requirements', () => {
    const onChange = vi.fn()
    const { rerender } = render(
      <RequirementExtraFields section="details" form={{ category: 'functional' }} onChange={onChange} available areas={areas} />
    )
    expect(screen.getByLabelText('Owner')).toBeInTheDocument()
    expect(screen.getByLabelText('Rationale')).toBeInTheDocument()
    expect(screen.queryByText('Non-functional area')).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Owner'), { target: { value: 'Amina Diallo' } })
    expect(onChange).toHaveBeenCalledWith({ owner_name: 'Amina Diallo' })

    rerender(<RequirementExtraFields section="details" form={{ category: 'non_functional' }} onChange={onChange} available areas={areas} />)
    expect(screen.getByText('Non-functional area')).toBeInTheDocument()
  })

  it('shows the verification method on Acceptance', () => {
    render(<RequirementExtraFields section="acceptance" form={{}} onChange={() => {}} available areas={areas} />)
    expect(screen.getByText('Verification method')).toBeInTheDocument()
    expect(screen.queryByLabelText('Owner')).not.toBeInTheDocument()
  })
})

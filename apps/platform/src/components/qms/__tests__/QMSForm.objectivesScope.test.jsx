import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import QMSForm from '../QMSForm'

vi.mock('../../../services/qualityManagementStrategyService', () => ({
  createQMS: vi.fn(),
  updateQMS: vi.fn(),
  createQMSForProject: vi.fn(),
}))

describe('QMSForm — Objectives and Scope as multi-value list fields', () => {
  it('renders Objectives and Scope as list inputs, and splits an existing multi-line value into rows', () => {
    render(
      <QMSForm
        qms={{
          id: 'qms-1',
          purpose: 'Why this strategy exists and what it aims to achieve, in enough detail.',
          objectives: 'First objective line.\nSecond objective line.',
          scope: 'First scope line.\nSecond scope line.',
          quality_control_approach: 'Control approach text here, long enough to pass.',
          quality_assurance_approach: 'Assurance approach text here, long enough to pass.',
        }}
        projectId="proj-1"
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    )

    expect(screen.getByText('First objective line.')).toBeInTheDocument()
    expect(screen.getByText('Second objective line.')).toBeInTheDocument()
    expect(screen.getByText('First scope line.')).toBeInTheDocument()
    expect(screen.getByText('Second scope line.')).toBeInTheDocument()
  })

  it('adding a new objective line keeps it alongside the existing ones', () => {
    render(
      <QMSForm
        qms={{ id: 'qms-1', purpose: '', objectives: 'Existing objective.', scope: '' }}
        projectId="proj-1"
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    )

    const input = screen.getByLabelText('New objective')
    fireEvent.change(input, { target: { value: 'A brand new objective' } })
    fireEvent.click(screen.getAllByRole('button', { name: 'Add' })[0])

    expect(screen.getByText('Existing objective.')).toBeInTheDocument()
    expect(screen.getByText('A brand new objective')).toBeInTheDocument()
  })
})

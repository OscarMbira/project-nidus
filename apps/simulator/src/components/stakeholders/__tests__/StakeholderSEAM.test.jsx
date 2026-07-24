import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import StakeholderSEAM from '../StakeholderSEAM'

describe('StakeholderSEAM', () => {
  it('renders C and D markers and gap row', () => {
    render(
      <StakeholderSEAM
        rows={[
          {
            id: '1',
            stakeholder_id: 's1',
            stakeholder_name: 'Amy Rivera',
            currentLevel: 'neutral',
            desiredLevel: 'leading',
            gap: 'Neutral → Leading',
            raw: {},
          },
        ]}
        loading={false}
      />
    )
    expect(screen.getByText('Amy Rivera')).toBeInTheDocument()
    expect(screen.getByText('C')).toBeInTheDocument()
    expect(screen.getByText('D')).toBeInTheDocument()
    expect(screen.getByText(/Neutral → Leading/)).toBeInTheDocument()
  })

  it('shows empty state when no rows', () => {
    render(<StakeholderSEAM rows={[]} loading={false} emptyMessage="No assessments yet." />)
    expect(screen.getByText('No assessments yet.')).toBeInTheDocument()
  })
})

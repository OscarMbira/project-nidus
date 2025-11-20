import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import RiskHeatMap from '../RiskHeatMap'

describe('RiskHeatMap', () => {
  const mockRisks = [
    {
      id: '1',
      risk_title: 'High Risk',
      risk_code: 'RISK-001',
      probability: 4,
      impact: 5,
      risk_score: 20,
    },
    {
      id: '2',
      risk_title: 'Medium Risk',
      risk_code: 'RISK-002',
      probability: 3,
      impact: 3,
      risk_score: 9,
    },
    {
      id: '3',
      risk_title: 'Low Risk',
      risk_code: 'RISK-003',
      probability: 2,
      impact: 2,
      risk_score: 4,
    },
  ]

  it('renders the heat map title', () => {
    render(<RiskHeatMap risks={mockRisks} />)
    expect(screen.getByText(/Risk Heat Map/i)).toBeInTheDocument()
  })

  it('displays probability and impact labels', () => {
    render(<RiskHeatMap risks={mockRisks} />)
    expect(screen.getByText(/Very Low \(1\)/i)).toBeInTheDocument()
    expect(screen.getByText(/Very High \(5\)/i)).toBeInTheDocument()
  })

  it('displays risk counts in correct cells', () => {
    render(<RiskHeatMap risks={mockRisks} />)
    // Should find at least one risk count
    expect(screen.getByText(/1 risk/i)).toBeInTheDocument()
  })

  it('displays legend with risk levels', () => {
    render(<RiskHeatMap risks={mockRisks} />)
    expect(screen.getByText(/Critical \(20-25\)/i)).toBeInTheDocument()
    expect(screen.getByText(/High \(12-19\)/i)).toBeInTheDocument()
    expect(screen.getByText(/Medium \(6-11\)/i)).toBeInTheDocument()
  })

  it('handles empty risks array', () => {
    render(<RiskHeatMap risks={[]} />)
    expect(screen.getByText(/Risk Heat Map/i)).toBeInTheDocument()
  })
})


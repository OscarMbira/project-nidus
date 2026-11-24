import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QraSummary } from '../QraSummary.jsx'

const summary = {
  confidence: 80,
  schedule: { chance: 0.72, p50: '2026-11-02', p80: '2026-11-16', p90: '2026-11-23', plannedFinish: '2026-10-30', histogram: [], sCurve: [], tornado: [] },
  cost: { chance: 0.6, p50: 140, p80: 180, p90: 210, tornado: [] },
  contingency: { recommendedCost: 80, recommendedScheduleDays: 12, held: 50, gap: 30, pFinish: '2026-11-16' },
  criticality: [{ taskId: 'a', label: 'Design', criticality: 0.4 }],
}

describe('QraSummary', () => {
  it('shows the chance and the confidence dates in theme-aware text', () => {
    const { container } = render(<QraSummary summary={summary} formatDate={(d) => d} formatMoney={(n) => `£${n}`} />)
    expect(screen.getByText('72%')).toBeInTheDocument()
    expect(screen.getByText('2026-11-16')).toBeInTheDocument()
    expect(screen.getByText('£180')).toBeInTheDocument()
    expect(container.querySelector('.dark\\:text-gray-100')).toBeTruthy()
  })

  it('asks to adopt the recommended contingency', () => {
    const onAdopt = vi.fn()
    render(<QraSummary summary={summary} onAdopt={onAdopt} />)
    fireEvent.click(screen.getByRole('button', { name: 'Adopt into the plan' }))
    expect(onAdopt).toHaveBeenCalled()
  })

  it('hides cost and adopt on a schedule-only run', () => {
    render(<QraSummary summary={summary} scheduleOnly />)
    expect(screen.queryByRole('button', { name: 'Adopt into the plan' })).toBeNull()
    expect(screen.queryByText('£180')).toBeNull()
  })
})

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import LessonsReportHeader from '../LessonsReportHeader'

describe('LessonsReportHeader', () => {
  it('opens the formatted view from the View button', () => {
    const onView = vi.fn()
    render(
      <LessonsReportHeader
        report={{ report_reference: 'PLR-26SHRJ26C', report_status: 'draft', report_date: '2026-10-08' }}
        onView={onView}
        onEdit={() => {}}
        onExport={() => {}}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'View' }))
    expect(onView).toHaveBeenCalledOnce()
  })
})

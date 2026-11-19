import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import TimesheetFlagDialog from '../TimesheetFlagDialog'
import TimesheetReminderDialog from '../TimesheetReminderDialog'

describe('TimesheetFlagDialog (v1343)', () => {
  const reasons = [{ id: 'r1', name: 'Hours unusually high' }, { id: 'r2', name: 'Task already closed' }]

  it('needs a reason before flagging, then sends reasons and trimmed note', () => {
    const onSubmit = vi.fn()
    render(<TimesheetFlagDialog open reasons={reasons} entryLabel="Mon 2 Nov · 14h" onSubmit={onSubmit} onClose={() => {}} />)
    const button = screen.getByRole('button', { name: /flag for approver/i })
    expect(button).toBeDisabled()
    fireEvent.click(screen.getByLabelText(/hours unusually high/i))
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '  14h on one task  ' } })
    fireEvent.click(button)
    expect(onSubmit).toHaveBeenCalledWith(['r1'], '14h on one task')
  })

  it('says how to set up reasons when there are none', () => {
    render(<TimesheetFlagDialog open reasons={[]} onSubmit={() => {}} onClose={() => {}} />)
    expect(screen.getByText(/no flag reasons are set up yet/i)).toBeInTheDocument()
  })
})

describe('TimesheetReminderDialog (v1343)', () => {
  const candidates = [
    { userId: 'u1', name: 'Amy', email: 'a@x', state: 'draft', draftCount: 2 },
    { userId: 'u2', name: 'Ben', email: null, state: 'missing', draftCount: 0 },
  ]
  const base = { open: true, periodStart: '2026-11-02', periodEnd: '2026-11-08', onPeriodChange: () => {}, onClose: () => {} }

  it('ticks everyone by default; unticking narrows who is sent to', () => {
    const onSend = vi.fn()
    render(<TimesheetReminderDialog {...base} candidates={candidates} onSend={onSend} />)
    expect(screen.getByText('2 draft entries')).toBeInTheDocument()
    expect(screen.getByText('No time logged')).toBeInTheDocument()
    expect(screen.getByText(/no email — in-app only/i)).toBeInTheDocument()
    fireEvent.click(screen.getByLabelText('Remind Ben'))
    fireEvent.click(screen.getByRole('button', { name: 'Send to 1' }))
    expect(onSend).toHaveBeenCalledWith([candidates[0]])
  })

  it('says when everyone has submitted', () => {
    render(<TimesheetReminderDialog {...base} candidates={[]} onSend={() => {}} />)
    expect(screen.getByText(/everyone on this project has submitted/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Send to 0' })).toBeDisabled()
  })
})

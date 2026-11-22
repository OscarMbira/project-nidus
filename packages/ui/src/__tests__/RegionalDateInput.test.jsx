/**
 * v1351 — RegionalDateInput: shows the organisation's format, reads typed dates, calendar picks, event-style onChange.
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import RegionalDateInput from '../RegionalDateInput'

const US = { date_format: 'MM/DD/YYYY', locale: 'en-US', time_format: '12h', first_day_of_week: 'sunday' }
const GB = { date_format: 'DD/MM/YYYY', locale: 'en-GB', time_format: '24h', first_day_of_week: 'monday' }

describe('RegionalDateInput', () => {
  it('shows the stored value in the organisation format', () => {
    render(<RegionalDateInput value="2026-09-08" onChange={() => {}} settings={US} aria-label="Due" />)
    expect(screen.getByLabelText('Due')).toHaveValue('09/08/2026')
  })

  it('reads a typed date in the format’s day / month order and stores ISO', () => {
    const onChange = vi.fn()
    render(<RegionalDateInput value="" onChange={onChange} settings={GB} aria-label="Due" />)
    const box = screen.getByLabelText('Due')
    fireEvent.change(box, { target: { value: '8/9/2026' } })
    expect(onChange).toHaveBeenLastCalledWith('2026-09-08')
  })

  it('passes an event to an event-style handler', () => {
    const onChange = vi.fn()
    render(<RegionalDateInput value="" onChange={onChange} eventStyle name="due_date" settings={GB} aria-label="Due" />)
    fireEvent.change(screen.getByLabelText('Due'), { target: { value: '2026-09-08' } })
    expect(onChange.mock.calls.at(-1)[0].target).toMatchObject({ value: '2026-09-08', name: 'due_date' })
  })

  it('flags text that is not a date on blur and keeps the stored value', () => {
    const onChange = vi.fn()
    render(<RegionalDateInput value="2026-09-08" onChange={onChange} settings={GB} aria-label="Due" />)
    const box = screen.getByLabelText('Due')
    fireEvent.change(box, { target: { value: '31/2/2026' } })
    fireEvent.blur(box)
    expect(box).toHaveAttribute('aria-invalid', 'true')
    expect(onChange).not.toHaveBeenCalled()
  })

  it('respects min and max', () => {
    const onChange = vi.fn()
    render(<RegionalDateInput value="" onChange={onChange} min="2026-09-10" settings={GB} aria-label="Due" />)
    const box = screen.getByLabelText('Due')
    fireEvent.change(box, { target: { value: '08/09/2026' } })
    fireEvent.blur(box)
    expect(onChange).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent('allowed range')
  })

  it('picks a day from the calendar, week starting on the organisation’s first day', () => {
    const onChange = vi.fn()
    render(<RegionalDateInput value="2026-09-08" onChange={onChange} settings={US} aria-label="Due" />)
    fireEvent.click(screen.getByRole('button', { name: 'Open calendar' }))
    const heads = screen.getAllByRole('columnheader')
    expect(heads[0]).toHaveTextContent(/^S/)
    fireEvent.click(screen.getByRole('button', { name: '09/15/2026' }))
    expect(onChange).toHaveBeenLastCalledWith('2026-09-15')
  })

  it('date and time: keeps the time when a day is picked and reads 12-hour times', () => {
    const onChange = vi.fn()
    render(<RegionalDateInput withTime value="2026-09-08T14:30" onChange={onChange} settings={US} aria-label="Start" />)
    expect(screen.getByLabelText('Start')).toHaveValue('09/08/2026 2:30 PM')
    fireEvent.click(screen.getByRole('button', { name: 'Open calendar' }))
    fireEvent.click(screen.getByRole('button', { name: '09/09/2026' }))
    expect(onChange).toHaveBeenLastCalledWith('2026-09-09T14:30')
  })

  it('has no calendar button when disabled', () => {
    render(<RegionalDateInput value="2026-09-08" onChange={() => {}} disabled settings={GB} aria-label="Due" />)
    expect(screen.queryByRole('button', { name: 'Open calendar' })).not.toBeInTheDocument()
    expect(screen.getByLabelText('Due')).toBeDisabled()
  })
})

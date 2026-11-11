/**
 * v1337 inputs: Date & Time (with Now), Record reference picker, calculated fields in the form.
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import DateTimeInput from '../DateTimeInput'
import RegisterFieldInput from '../RegisterFieldInput'
import RecordRefView from '../RecordRefView'

const NAIROBI = { time_zone: 'Africa/Nairobi' }

afterEach(() => vi.useRealTimers())

describe('DateTimeInput', () => {
  it('shows the stored moment in the organisation time zone and stores UTC', () => {
    const onChange = vi.fn()
    render(<DateTimeInput value="2027-04-10T15:05:00.000Z" onChange={onChange} settings={NAIROBI} ariaLabel="Start" />)
    expect(screen.getByLabelText('Start')).toHaveValue('2027-04-10T18:05')
    fireEvent.change(screen.getByLabelText('Start'), { target: { value: '2027-04-10T20:12' } })
    expect(onChange).toHaveBeenLastCalledWith('2027-04-10T17:12:00.000Z')
  })

  it('stamps now and clears', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2027-04-10T15:05:42Z'))
    const onChange = vi.fn()
    render(<DateTimeInput value="2027-04-10T15:00:00.000Z" onChange={onChange} settings={NAIROBI} ariaLabel="End" />)
    fireEvent.click(screen.getByRole('button', { name: 'End: now' }))
    expect(onChange).toHaveBeenLastCalledWith('2027-04-10T15:05:00.000Z')
    fireEvent.click(screen.getByRole('button', { name: 'Clear End' }))
    expect(onChange).toHaveBeenLastCalledWith('')
  })
})

describe('RegisterFieldInput — v1337 types', () => {
  it('shows a calculated field read-only', () => {
    render(<RegisterFieldInput field={{ field_key: 't', field_label: 'Time Taken', field_type: 'number', calculation: { op: 'minutes_between', start: 'a', end: 'b', display: 'duration' } }} value={127} onChange={() => {}} />)
    expect(screen.getByLabelText('Time Taken')).toHaveTextContent('2h 07m')
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument()
  })

  it('picks a record from the target register (single)', async () => {
    const onChange = vi.fn()
    const loadRecordOptions = vi.fn(async () => [{ id: 'r1', display_id: 'LREG-2026-401', title: 'Mock 2 – static data' }, { id: 'r2', display_id: 'LREG-2026-402', title: 'Mock 2 – financial data' }])
    const field = { field_key: 'mock_migration', field_label: 'Mock Migration', field_type: 'record_ref', dropdown_options: [{ value: 'fin_mock_migrations', label: 'Mock Migrations' }] }
    render(<RegisterFieldInput field={field} value={[]} onChange={onChange} loadRecordOptions={loadRecordOptions} />)
    await waitFor(() => expect(loadRecordOptions).toHaveBeenCalledWith('fin_mock_migrations'))
    const select = await screen.findByRole('combobox')
    await waitFor(() => expect(select.querySelectorAll('option').length).toBeGreaterThan(2))
    fireEvent.change(select, { target: { value: 'r2' } })
    expect(onChange).toHaveBeenLastCalledWith([{ id: 'r2', label: 'LREG-2026-402 – Mock 2 – financial data' }])
  })
})

describe('RecordRefView', () => {
  it('links each reference and shows the requested facts', async () => {
    const field = { field_type: 'record_ref', dropdown_options: [{ value: 'fin_data_mapping', label: 'Data Mapping', show_fields: ['expected_record_count'] }] }
    const loadFacts = vi.fn(async () => ({ m1: [{ label: 'Expected Record Count', value: '1,400,000' }] }))
    render(
      <MemoryRouter>
        <RecordRefView field={field} value={[{ id: 'm1', label: 'LREG-2026-301 – Customer mapping sheet' }]} hrefFor={(id) => `/platform/local-registers/fin_data_mapping/${id}`} loadFacts={loadFacts} />
      </MemoryRouter>
    )
    expect(screen.getByRole('link', { name: 'LREG-2026-301 – Customer mapping sheet' })).toHaveAttribute('href', '/platform/local-registers/fin_data_mapping/m1')
    expect(await screen.findByText('Expected Record Count: 1,400,000')).toBeInTheDocument()
  })
})

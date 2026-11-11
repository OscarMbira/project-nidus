/**
 * v1337 runbook UI: out-of-order warning, run summary and step list.
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import SequenceWarningDialog from '../SequenceWarningDialog'
import RunbookSummaryPanel from '../RunbookSummaryPanel'
import RunbookStepList from '../RunbookStepList'
import { summariseRunbook } from '@nidus/shared/utils/runbookSummary'
import { resolveListColumns } from '@nidus/shared/utils/registerListColumns'

const steps = [
  { id: 'a', title: 'Load customers', status: 'done', field_values: { sequence: 2, window: 'static', batch: 'static_data', step_type: 'load', records_received: 1000, records_loaded: 1000, time_taken_minutes: 75, budget_minutes: 60, budget_variance_minutes: 15 } },
  { id: 'b', title: 'Backup after static', status: 'not_started', field_values: { sequence: 3, window: 'static', batch: 'static_data', step_type: 'backup' } },
  { id: 'c', title: 'Load balances', status: 'in_progress', field_values: { sequence: 10, window: 'financial', batch: 'balance_sheet', step_type: 'load', can_run_in_parallel: true } },
]

describe('SequenceWarningDialog', () => {
  it('needs a reason before carrying on', () => {
    const onConfirm = vi.fn()
    render(<SequenceWarningDialog isOpen warnings={[{ kind: 'order', stepId: 'a', text: 'Step 2 – Load customers is not done yet' }, { kind: 'checkpoint', stepId: 'k', text: 'Checkpoint 5 – Static sign-off has not been passed' }]} onCancel={() => {}} onConfirm={onConfirm} />)
    expect(screen.getByText('Step 2 – Load customers is not done yet')).toBeInTheDocument()
    expect(screen.getByText('Checkpoint 5 – Static sign-off has not been passed')).toBeInTheDocument()
    const carryOn = screen.getByRole('button', { name: 'Carry on and save' })
    expect(carryOn).toBeDisabled()
    fireEvent.change(screen.getByLabelText('Reason'), { target: { value: ' Agreed with the cutover manager ' } })
    fireEvent.click(carryOn)
    expect(onConfirm).toHaveBeenCalledWith('Agreed with the cutover manager')
  })
})

describe('RunbookSummaryPanel', () => {
  it('shows progress, records and windows', () => {
    render(<RunbookSummaryPanel summary={summariseRunbook(steps, { windowLabels: { static: 'Static window', financial: 'Financial window' } })} />)
    expect(screen.getByText('1 / 3 steps done')).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: 'Steps done' })).toHaveAttribute('aria-valuenow', '33')
    expect(screen.getByText('100%')).toBeInTheDocument()
    expect(screen.getByText('Static window')).toBeInTheDocument()
    expect(screen.getByText('1h 15m')).toBeInTheDocument()
    expect(screen.queryByRole('columnheader', { name: 'Over / Under Budget' })).not.toBeInTheDocument()
  })

  it('adds the signed over / under column when the register gives its label', () => {
    render(<RunbookSummaryPanel summary={summariseRunbook(steps, { windowLabels: { static: 'Static window' } })} varianceLabel="Over / Under Budget" />)
    expect(screen.getByRole('columnheader', { name: 'Over / Under Budget' })).toBeInTheDocument()
    expect(screen.getByText('+15m')).toHaveClass('text-red-600')
  })
})

describe('RunbookStepList', () => {
  it('groups steps by window and batch, links each and searches', () => {
    render(
      <MemoryRouter>
        <RunbookStepList
          steps={steps}
          hrefFor={(id) => `/platform/local-registers/fin_runbook_steps/${id}`}
          statusLabels={{ done: 'Done', in_progress: 'In Progress', not_started: 'Not Started' }}
          windowLabels={{ static: 'Static window', financial: 'Financial window' }}
          batchLabels={{ static_data: 'Static data', balance_sheet: 'Balance sheet' }}
        />
      </MemoryRouter>,
    )
    const staticTab = screen.getByRole('tab', { name: /Static window · Static data/ })
    const financialTab = screen.getByRole('tab', { name: /Financial window · Balance sheet/ })
    expect(staticTab).toHaveAttribute('aria-selected', 'true')
    expect(staticTab).toHaveTextContent('2')
    expect(screen.getByRole('link', { name: 'Load customers' })).toHaveAttribute('href', '/platform/local-registers/fin_runbook_steps/a')
    // Other groups are on their own tab.
    expect(screen.queryByRole('link', { name: 'Load balances' })).not.toBeInTheDocument()
    fireEvent.click(financialTab)
    expect(screen.getByRole('link', { name: 'Load balances' })).toBeInTheDocument()
    expect(screen.getByText('parallel')).toBeInTheDocument()
    fireEvent.click(staticTab)
    fireEvent.change(screen.getByLabelText('Search steps'), { target: { value: 'backup' } })
    expect(screen.queryByRole('link', { name: 'Load customers' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Backup after static' })).toBeInTheDocument()
  })

  it('shows the columns and headings configured on the register (v1381)', () => {
    const columns = resolveListColumns({
      fields: [
        { field_key: 'step_type', field_label: 'Step Type', field_type: 'dropdown', dropdown_options: [{ value: 'load', label: 'Load' }] },
        { field_key: 'records_loaded', field_label: 'Records Loaded', field_type: 'number' },
        { field_key: 'time_taken_minutes', field_label: 'Time Taken', field_type: 'number', calculation: { display: 'duration' } },
        { field_key: 'budget_variance_minutes', field_label: 'Over / Under Budget', field_type: 'number', calculation: { display: 'duration' } },
      ],
      behaviour: { list_columns: [
        { field: 'title', label: 'Step' }, { field: 'step_type', label: 'Type' }, { field: 'records_loaded', label: 'Loaded' },
        { field: 'time_taken_minutes', warn_when: { field: 'budget_variance_minutes', gt: 0 } },
        { field: 'budget_variance_minutes', label: 'Over / Under', signed: true },
      ] },
    })
    render(
      <MemoryRouter>
        <RunbookStepList steps={steps.slice(0, 1)} hrefFor={(id) => `/x/${id}`} columns={columns} />
      </MemoryRouter>,
    )
    expect(screen.getAllByRole('columnheader').map((h) => h.textContent)).toEqual(['Step', 'Type', 'Loaded', 'Time Taken', 'Over / Under'])
    expect(screen.getByText('Load')).toBeInTheDocument()
    expect(screen.getByText('1,000')).toBeInTheDocument()
    expect(screen.getByText('1h 15m')).toHaveClass('text-red-600')
    expect(screen.getByText('+15m')).toBeInTheDocument()
  })
})

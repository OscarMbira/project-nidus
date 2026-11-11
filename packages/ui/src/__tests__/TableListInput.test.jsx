import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import TableListInput from '../TableListInput'

const COLUMNS = [{ key: 'term', label: 'Term' }, { key: 'definition', label: 'Definition' }]

describe('TableListInput', () => {
  it('adds a row from the column inputs', () => {
    const onChange = vi.fn()
    render(<TableListInput viewModeId="t-add" columns={COLUMNS} value="" onChange={onChange} ariaLabelPrefix="Glossary" />)
    fireEvent.change(screen.getByLabelText('New Glossary — Term'), { target: { value: 'GL' } })
    fireEvent.change(screen.getByLabelText('New Glossary — Definition'), { target: { value: 'General ledger' } })
    fireEvent.click(screen.getByRole('button', { name: /Add/ }))
    expect(onChange).toHaveBeenCalledWith('GL\tGeneral ledger')
  })

  it('shows rows under column headers with row numbers, and edits inline', () => {
    const onChange = vi.fn()
    render(<TableListInput viewModeId="t-edit" columns={COLUMNS} value={'GL\tGeneral ledger'} onChange={onChange} ariaLabelPrefix="Glossary" />)
    expect(screen.getByRole('columnheader', { name: 'Term' })).toBeInTheDocument()
    expect(screen.getByText('General ledger')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Edit Glossary 1' }))
    fireEvent.change(screen.getByLabelText('Edit Definition 1'), { target: { value: 'Ledger' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save Glossary 1' }))
    expect(onChange).toHaveBeenCalledWith('GL\tLedger')
  })

  it('filters rows from the search box and sorts a column', () => {
    render(<TableListInput viewModeId="t-find" columns={COLUMNS} value={'Zed\tLast\nAlpha\tFirst'} onChange={() => {}} ariaLabelPrefix="Glossary" />)
    fireEvent.change(screen.getByLabelText('Search Glossary'), { target: { value: 'alpha' } })
    expect(screen.queryByText('Last')).not.toBeInTheDocument()
    expect(screen.getByText('First')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Search Glossary'), { target: { value: '' } })
    fireEvent.click(screen.getByRole('columnheader', { name: 'Term' }))
    const terms = screen.getAllByText(/^(Alpha|Zed)$/)
    expect(terms.map((el) => el.textContent)).toEqual(['Alpha', 'Zed'])
  })

  it('asks before removing a row', () => {
    const onChange = vi.fn()
    render(<TableListInput viewModeId="t-del" columns={COLUMNS} value={'A\tB\nC\tD'} onChange={onChange} ariaLabelPrefix="Glossary" />)
    fireEvent.click(screen.getByRole('button', { name: 'Remove Glossary 1' }))
    expect(onChange).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }))
    expect(onChange).toHaveBeenCalledWith('C\tD')
  })

  it('is read-only when disabled', () => {
    render(<TableListInput viewModeId="t-ro" columns={COLUMNS} value={'A\tB'} onChange={() => {}} disabled />)
    expect(screen.queryByRole('button', { name: /Add/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('columnheader', { name: 'Actions' })).not.toBeInTheDocument()
  })

  it('offers a fixed list in a dropdown column and keeps an older value selectable (v1351)', () => {
    const onChange = vi.fn()
    const columns = [
      { key: 'file', label: 'Extract File' },
      { key: 'step', label: 'Load Step', type: 'select', options: ['Create / takeover', 'Capture balances'] },
    ]
    render(<TableListInput viewModeId="t-select" columns={columns} value={'old.txt	Legacy step'} onChange={onChange} ariaLabelPrefix="Load Steps" />)
    const step = screen.getByLabelText('New Load Steps — Load Step')
    expect([...step.querySelectorAll('option')].map((o) => o.textContent)).toEqual(expect.arrayContaining(['Create / takeover', 'Capture balances']))
    fireEvent.change(screen.getByLabelText('New Load Steps — Extract File'), { target: { value: 'NB_LOAN.txt' } })
    fireEvent.change(step, { target: { value: 'Capture balances' } })
    fireEvent.click(screen.getByRole('button', { name: /Add/ }))
    expect(onChange).toHaveBeenCalledWith('old.txt\tLegacy step\nNB_LOAN.txt\tCapture balances')

    fireEvent.click(screen.getByRole('button', { name: 'Edit Load Steps 1' }))
    const edit = screen.getByLabelText('Edit Load Step 1')
    expect([...edit.querySelectorAll('option')].map((o) => o.textContent)).toContain('Legacy step')
  })
})


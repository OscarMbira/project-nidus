import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import SimpleRecordList from '../SimpleRecordList'

const rows = [
  { id: '1', name: 'bravo', status: 'open', created_at: '2026-01-02' },
  { id: '2', name: 'Alpha', status: 'closed', created_at: '2026-01-03' },
  { id: '3', name: 'alpha', status: 'open', created_at: '2026-01-01' },
]
const columns = [{ key: 'name', label: 'Name', primary: true }, { key: 'status', label: 'Status' }]
const bodyNames = () => within(screen.getAllByRole('rowgroup')[1]).getAllByRole('row').map((r) => r.cells[1].textContent)

beforeEach(() => localStorage.clear())

describe('SimpleRecordList (v1343)', () => {
  it('Table-List by default, A→Z then oldest first, with row numbers', () => {
    render(<SimpleRecordList pageId="t1" columns={columns} rows={rows} />)
    expect(bodyNames()).toEqual(['alpha', 'Alpha', 'bravo'])
    expect(screen.getByText('#')).toBeInTheDocument()
  })

  it('search narrows the rows; empty and no-match texts', () => {
    const { unmount } = render(<SimpleRecordList pageId="t2" columns={columns} rows={rows} emptyText="Nothing here" />)
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'closed' } })
    expect(bodyNames()).toEqual(['Alpha'])
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'zzz' } })
    expect(screen.getByText('No matches.')).toBeInTheDocument()
    unmount()
    render(<SimpleRecordList pageId="t3" columns={columns} rows={[]} emptyText="Nothing here" />)
    expect(screen.getByText('Nothing here')).toBeInTheDocument()
  })

  it('clicking a heading sorts descending after ascending; rows can be opened', () => {
    const onRowClick = vi.fn()
    render(<SimpleRecordList pageId="t4" columns={columns} rows={rows} onRowClick={onRowClick} />)
    const header = screen.getByText('Name')
    fireEvent.click(header) // asc
    fireEvent.click(header) // desc
    expect(bodyNames()[0]).toBe('bravo')
    fireEvent.click(screen.getByText('bravo'))
    expect(onRowClick).toHaveBeenCalledWith(rows[0])
  })
})

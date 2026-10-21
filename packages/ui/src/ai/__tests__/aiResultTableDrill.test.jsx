// v1295 — clicking a grouped Ask Nidus row lists its records and links to the register.
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import AppConfigContext from '@nidus/shared/context/AppConfigContext'
import AiResultTable from '../AiResultTable.jsx'

const grouped = {
  entity: 'risks', entity_label: 'Risks', mode: 'grouped', explanation: 'Risks grouped by project', total_count: 1, row_count: 1,
  spec: { entity: 'risks', group_by: ['project_name', 'level'], aggregates: [{ fn: 'count', alias: 'n' }], project_ids: ['p1'] },
  columns: [{ key: 'project_name', label: 'Project', type: 'text' }, { key: 'level', label: 'Risk level', type: 'text' }, { key: 'n', label: 'Count', type: 'number', aggregate: true }],
  rows: [{ project_name: 'Velocity Freight', level: 'high', n: 2 }],
}
const records = {
  entity: 'risks', entity_label: 'Risks', mode: 'rows', explanation: 'Risks where project is Velocity Freight; risk level is high',
  total_count: 2, row_count: 2, route_template: '/platform/risks/{id}', list_route: '/platform/risks',
  columns: [{ key: 'display_id', label: 'Risk ID', type: 'text' }, { key: 'title', label: 'Title', type: 'text' }],
  rows: [
    { __id: 'r1', __project_id: 'p1', display_id: 'RSK-0042', title: 'Steel delivery late' },
    { __id: 'r2', __project_id: 'p1', display_id: 'RSK-0047', title: 'Permit delay' },
  ],
}

function renderTable(db) {
  return render(
    <MemoryRouter>
      <AppConfigContext.Provider value={{ app: 'platform', basePath: '', db }}>
        <AiResultTable result={grouped} />
      </AppConfigContext.Provider>
    </MemoryRouter>,
  )
}

describe('AiResultTable drill-down (v1295)', () => {
  it('lists the records behind a grouped row and links to the register and each record', async () => {
    const db = { rpc: vi.fn().mockResolvedValue({ data: records, error: null }) }
    renderTable(db)
    fireEvent.click(screen.getByRole('button', { name: /Velocity Freight/ }))
    expect(await screen.findByText('Steel delivery late')).toBeInTheDocument()
    expect(db.rpc).toHaveBeenCalledWith('ai_run_query', { p_spec: expect.objectContaining({ drill: { project_name: 'Velocity Freight', level: 'high' }, project_ids: ['p1'] }) })
    expect(screen.getByRole('link', { name: /Open Risks/ })).toHaveAttribute('href', '/platform/risks?projectId=p1')
    expect(screen.getByRole('link', { name: 'RSK-0042' })).toHaveAttribute('href', '/platform/risks/r1')
    fireEvent.click(screen.getByRole('button', { name: 'Close records' }))
    expect(screen.queryByText('Steel delivery late')).not.toBeInTheDocument()
  })

  it('shows the error when the records cannot be loaded', async () => {
    const db = { rpc: vi.fn().mockResolvedValue({ data: null, error: { message: 'AIQ: something went wrong' } }) }
    renderTable(db)
    fireEvent.click(screen.getByRole('button', { name: /Velocity Freight/ }))
    expect(await screen.findByText('something went wrong')).toBeInTheDocument()
  })

  it('without an app config the rows are not clickable', () => {
    render(<MemoryRouter><AiResultTable result={grouped} /></MemoryRouter>)
    expect(screen.queryByRole('button', { name: /Velocity Freight/ })).not.toBeInTheDocument()
  })
})

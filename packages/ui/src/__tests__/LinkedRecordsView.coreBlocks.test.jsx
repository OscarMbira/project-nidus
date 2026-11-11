import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import LinkedRecordsView from '../LinkedRecordsView'

const table = (rows) => ({ label: 'Requirements', kind: 'table', headers: ['Code', 'Requirement'], rows })

describe('LinkedRecordsView — core source blocks (v1338)', () => {
  it('shows each block as a table with an Open link to the register', () => {
    render(
      <MemoryRouter>
        <LinkedRecordsView
          linked={{
            register: { label: 'Requirements register' },
            records: [{}, {}],
            blocks: [
              { id: 'a', title: 'Volumes', groups: [table([['NFR-1', '4.8 million customers']])] },
              { id: 'b', title: 'Performance', groups: [table([['NFR-2', '600 searches a minute']])] },
            ],
          }}
          sourceHref="/platform/scope/requirements?category=non_functional"
        />
      </MemoryRouter>
    )
    expect(screen.getByText('2 items from Requirements register. Edit them there.')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Volumes' })).toBeInTheDocument()
    expect(screen.getByText('600 searches a minute')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Open Requirements register' })).toHaveAttribute('href', '/platform/scope/requirements?category=non_functional')
  })

  it('says when there is nothing yet', () => {
    render(
      <MemoryRouter>
        <LinkedRecordsView linked={{ register: { label: 'Requirements register' }, records: [], blocks: [] }} />
      </MemoryRouter>
    )
    expect(screen.getByText('Nothing in Requirements register for this project yet.')).toBeInTheDocument()
  })
})

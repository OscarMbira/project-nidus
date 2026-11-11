import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import LinkedRecordsView from '../LinkedRecordsView'

const linked = {
  register: {
    label: 'Data Scope',
    register_key: 'fin_data_scope',
    status_workflow: [{ key: 'in_scope', label: 'In Scope' }],
    fields: [{ field_key: 'inclusion_rules', field_label: 'Inclusion Rules (what will be migrated)', field_type: 'multi_line' }],
  },
  records: [{ id: 'r1', display_id: 'LREG-1', title: 'Loans and past dues', description: 'Loans not matured on the migration date.', status: 'in_scope',
    field_values: { inclusion_rules: 'Unpaid past dues' } }],
}

describe('LinkedRecordsView (v1332)', () => {
  it('shows each source record as a numbered sub-section with its introduction, rules and an Open link', () => {
    render(<MemoryRouter><LinkedRecordsView linked={linked} recordHref={(r) => `/platform/local-registers/fin_data_scope/${r.id}`} /></MemoryRouter>)
    expect(screen.getByRole('heading', { name: '1. Loans and past dues' })).toBeInTheDocument()
    expect(screen.getByText('Loans not matured on the migration date.')).toBeInTheDocument()
    expect(screen.getByText('Status: In Scope')).toBeInTheDocument()
    expect(screen.getByText('Inclusion Rules: Unpaid past dues')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Open' })).toHaveAttribute('href', '/platform/local-registers/fin_data_scope/r1')
  })

  it('says when the source register has no records for the project', () => {
    render(<MemoryRouter><LinkedRecordsView linked={{ ...linked, records: [] }} /></MemoryRouter>)
    expect(screen.getByText('No records in Data Scope for this project yet.')).toBeInTheDocument()
  })
})

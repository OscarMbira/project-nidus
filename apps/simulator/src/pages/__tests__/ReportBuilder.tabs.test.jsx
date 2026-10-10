import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ReportBuilder from '../ReportBuilder'

vi.mock('../../services/supabaseClient', () => ({
  supabase: {
    auth: { getUser: vi.fn(async () => ({ data: { user: null } })) },
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            order: () => Promise.resolve({ data: [{ table_name: 'risks', table_description: 'Risks' }], error: null }),
          }),
        }),
      }),
    }),
  },
}))

function renderPage() {
  return render(
    <MemoryRouter>
      <ReportBuilder />
    </MemoryRouter>,
  )
}

describe('ReportBuilder — Data Source / Fields / Filters / Sorting as tabs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('defaults to the Data Source tab and hides Filters/Sorting content', async () => {
    renderPage()

    expect(await screen.findByRole('tab', { name: 'Data Source' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText('Data Source Type')).toBeInTheDocument()
    expect(screen.queryByText('No filters added. Click "Add Filter" to add one.')).toBeNull()
    expect(screen.queryByText('No sorting added. Click "Add Sort" to add one.')).toBeNull()
  })

  it('switches to the Filters tab and shows filter content only', async () => {
    renderPage()
    fireEvent.click(await screen.findByRole('tab', { name: 'Filters' }))

    expect(screen.getByText('No filters added. Click "Add Filter" to add one.')).toBeInTheDocument()
    expect(screen.queryByText('Data Source Type')).toBeNull()
  })

  it('switches to the Sorting tab and shows sort content only', async () => {
    renderPage()
    fireEvent.click(await screen.findByRole('tab', { name: 'Sorting' }))

    expect(screen.getByText('No sorting added. Click "Add Sort" to add one.')).toBeInTheDocument()
    expect(screen.queryByText('Data Source Type')).toBeNull()
  })

  it('switches to the Fields tab, prompting for a data source first when none is selected', async () => {
    renderPage()
    fireEvent.click(await screen.findByRole('tab', { name: 'Fields' }))

    expect(screen.getByText(/select a data source first/i)).toBeInTheDocument()
  })

  it('shows available fields on the Fields tab once a table is selected', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByRole('option', { name: 'risks' })).toBeInTheDocument())
    fireEvent.change(screen.getByLabelText('Select Table *'), { target: { value: 'risks' } })

    fireEvent.click(await screen.findByRole('tab', { name: 'Fields' }))
    expect(await screen.findByText('Created At')).toBeInTheDocument()
  })
})

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ConfigurationItemForm from '../ConfigurationItemForm'

vi.mock('../../../services/cfgItemTypesService', () => ({
  getItemTypes: vi.fn(async () => [
    { id: 'type-1', item_type_name: 'Major', item_type_code: 'MAJOR' },
  ]),
}))

vi.mock('../../../services/supabaseClient', () => {
  const chain = (rows, single) => {
    const builder = {
      select: () => builder,
      eq: () => builder,
      order: () => Promise.resolve({ data: rows }),
      maybeSingle: () => Promise.resolve({ data: single || null }),
    }
    return builder
  }
  return {
    platformDb: {
      from: (table) => {
        if (table === 'product_deliverables') return chain([{ id: 'prod-1', product_name: 'Route optimiser' }])
        if (table === 'project_product_descriptions') return chain([], { id: 'ppd-1' })
        return chain([])
      },
    },
  }
})

vi.mock('../../ui/HoldButton', () => ({
  HoldButton: () => null,
}))

describe('Configuration item form tabs', () => {
  it('loads item types and keeps the circled fields on their own tabs', async () => {
    render(
      <ConfigurationItemForm
        cfgMsId="cms-1"
        projectId="proj-1"
        itemData={{ item_name: 'Build artefact' }}
        onChange={() => {}}
      />,
    )

    expect(await screen.findByText('Select item type...')).toBeInTheDocument()
    expect(screen.queryByText('No item types yet. Add them from Configuration Item Types in the sidebar.')).not.toBeInTheDocument()
    fireEvent.click(screen.getByText('Select item type...'))
    expect(await screen.findByText('Major (MAJOR)')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('tab', { name: 'Storage locations' }))
    expect(screen.getByRole('heading', { name: 'Storage locations' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('tab', { name: 'Repository URLs' }))
    expect(screen.getByRole('heading', { name: 'Repository URLs' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('tab', { name: 'Linked products' }))
    expect(screen.getByRole('heading', { name: 'Linked products' })).toBeInTheDocument()
    fireEvent.click(screen.getByText('Select a product...'))
    expect(await screen.findByText('Route optimiser')).toBeInTheDocument()
    expect(screen.queryByText(/Velocity Freight/)).not.toBeInTheDocument()
  }, 20000)
})

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

vi.mock('@nidus/shared/hooks/useViewMode', () => ({ useViewMode: () => ['list', () => {}] }))

import PmoConfigurationHome from '../PmoConfigurationHome'

describe('PMO Configuration — Industries & Capabilities area', () => {
  it('lists the area and opens the organisation industries page', () => {
    render(
      <MemoryRouter initialEntries={['/platform/pmo-admin/configuration']}>
        <Routes>
          <Route path="/platform/pmo-admin/configuration" element={<PmoConfigurationHome />} />
          <Route path="/platform/admin/organisation-industries" element={<h1>Industries page</h1>} />
        </Routes>
      </MemoryRouter>
    )
    expect(screen.getByText('Industries & Capabilities')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Open Industries & Capabilities' }))
    expect(screen.getByRole('heading', { name: 'Industries page' })).toBeInTheDocument()
  })
})

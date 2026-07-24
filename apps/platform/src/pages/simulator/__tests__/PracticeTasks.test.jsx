/**
 * Practice Tasks Page Component Test
 * Basic render test for PracticeTasks.jsx
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import PracticeTasks from '../PracticeTasks'

// Mock the service
vi.mock('../../../services/sim/practiceTaskService', () => ({
  getPracticeTasks: vi.fn().mockResolvedValue({
    success: true,
    data: []
  })
}))

describe('PracticeTasks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render the page title', () => {
    render(
      <BrowserRouter>
        <PracticeTasks />
      </BrowserRouter>
    )

    expect(screen.getByText(/Practice Tasks/i)).toBeInTheDocument()
  })
})

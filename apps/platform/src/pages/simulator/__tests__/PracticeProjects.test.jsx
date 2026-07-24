/**
 * Practice Projects Page Component Test
 * Basic render test for PracticeProjects.jsx
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import PracticeProjects from '../PracticeProjects'

vi.mock('../../../services/supabase/supabaseClient', () => ({
  simDb: {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'auth-1' } }
      })
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: { id: 'user-internal-1' }, error: null })
        }))
      }))
    }))
  }
}))

// Mock the service
vi.mock('../../../services/sim/practiceProjectService', () => ({
  getMyPracticeProjects: vi.fn().mockResolvedValue({
    success: true,
    data: [
      { id: '1', project_name: 'Test Project 1' },
      { id: '2', project_name: 'Test Project 2' }
    ]
  })
}))

describe('PracticeProjects', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render the page title', async () => {
    render(
      <BrowserRouter>
        <PracticeProjects />
      </BrowserRouter>
    )

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /^Practice Projects$/i })).toBeInTheDocument()
    })
  })

  it('should render create project button', async () => {
    render(
      <BrowserRouter>
        <PracticeProjects />
      </BrowserRouter>
    )

    await waitFor(() => {
      expect(screen.getByText(/Create Practice Project/i)).toBeInTheDocument()
    })
  })
})

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import QualityReviews from '../QualityReviews'
import { getQualityReviews } from '../../services/qualityManagementService'

vi.mock('../../services/qualityManagementService', () => ({
  getQualityReviews: vi.fn().mockResolvedValue([]),
  deleteQualityReview: vi.fn(),
}))

vi.mock('../../services/supabaseClient', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({ order: () => Promise.resolve({ data: [], error: null }) }),
      }),
    }),
  },
}))

vi.mock('../../components/quality/QualityReviewForm', () => ({
  default: () => <div role="dialog" />,
}))

const { useSidebarCollapsedMock } = vi.hoisted(() => ({ useSidebarCollapsedMock: vi.fn() }))

vi.mock('@nidus/shared/hooks/useSidebarCollapsed', () => ({
  useSidebarCollapsed: useSidebarCollapsedMock,
  pageContainerMaxWidthClass: (collapsed) => (collapsed ? 'max-w-full' : 'max-w-7xl'),
}))

function renderPage() {
  return render(
    <MemoryRouter>
      <QualityReviews />
    </MemoryRouter>,
  )
}

describe('QualityReviews — page container widens when the sidebar is hidden', () => {
  it('stays at max-w-7xl when the sidebar is visible', async () => {
    useSidebarCollapsedMock.mockReturnValue({ collapsed: false })
    renderPage()
    await screen.findByRole('heading', { name: 'Quality Reviews' })

    expect(document.querySelector('.max-w-7xl')).not.toBeNull()
    expect(document.querySelector('.max-w-full')).toBeNull()
  })

  it('widens to max-w-full once the sidebar is hidden', async () => {
    useSidebarCollapsedMock.mockReturnValue({ collapsed: true })
    renderPage()
    await screen.findByRole('heading', { name: 'Quality Reviews' })

    expect(document.querySelector('.max-w-full')).not.toBeNull()
    expect(document.querySelector('.max-w-7xl')).toBeNull()
  })
})

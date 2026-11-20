import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

const getPublishedHelpArticle = vi.fn()
vi.mock('@nidus/shared/services/helpArticleReaderService', () => ({
  getPublishedHelpArticle: (...a) => getPublishedHelpArticle(...a),
}))

const { default: HelpArticlePage } = await import('../HelpArticlePage')

function renderAt(slug) {
  return render(
    <MemoryRouter initialEntries={[`/platform/help/articles/${slug}`]}>
      <Routes><Route path="/platform/help/articles/:slug" element={<HelpArticlePage />} /></Routes>
    </MemoryRouter>,
  )
}

describe('HelpArticlePage (v1345 PD4)', () => {
  it('shows a published article as plain text with bullets', async () => {
    getPublishedHelpArticle.mockResolvedValue({
      success: true,
      data: { title: 'Identifying stakeholders', excerpt: 'Where stakeholders come from.', content: 'Sources:\n- Workshop\n- Referral\n<script>x</script>' },
    })
    renderAt('identifying-stakeholders')
    expect(await screen.findByRole('heading', { name: 'Identifying stakeholders' })).toBeInTheDocument()
    expect(screen.getByText('Workshop').tagName).toBe('LI')
    expect(screen.getByText('<script>x</script>')).toBeInTheDocument()
    expect(getPublishedHelpArticle).toHaveBeenCalledWith('identifying-stakeholders')
    expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument()
  })

  it('shows a not-found state for an unknown slug', async () => {
    getPublishedHelpArticle.mockResolvedValue({ success: false, error: 'Article not found' })
    renderAt('missing')
    expect(await screen.findByText('Article not found')).toBeInTheDocument()
  })
})

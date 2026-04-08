/**
 * Unit tests for AISuggestedQuestions (Phase 5.3 — 7 pages, plan wording)
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import AISuggestedQuestions from '../AISuggestedQuestions'

function renderWithRouter(path = '/platform/dashboard') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AISuggestedQuestions onSelect={vi.fn()} />
    </MemoryRouter>
  )
}

describe('AISuggestedQuestions', () => {
  it('renders suggested questions for dashboard', () => {
    renderWithRouter('/platform/dashboard')
    expect(screen.getByText(/Suggested questions/i)).toBeInTheDocument()
    expect(screen.getByText('What needs my attention today?')).toBeInTheDocument()
    expect(screen.getByText('Summarise my portfolio health')).toBeInTheDocument()
  })

  it('renders plan wording for risks page', () => {
    renderWithRouter('/platform/risks')
    expect(screen.getByText('Show me all high-severity open risks')).toBeInTheDocument()
    expect(screen.getByText('Which risks have no mitigation plan?')).toBeInTheDocument()
  })

  it('calls onSelect when a question is clicked', () => {
    const onSelect = vi.fn()
    render(
      <MemoryRouter initialEntries={['/platform/dashboard']}>
        <AISuggestedQuestions onSelect={onSelect} />
      </MemoryRouter>
    )
    fireEvent.click(screen.getByText('What needs my attention today?'))
    expect(onSelect).toHaveBeenCalledWith('What needs my attention today?')
  })

  it('shows mandate plan wording for mandates page', () => {
    renderWithRouter('/platform/mandates')
    expect(screen.getByText(/Summarise this project's mandate/)).toBeInTheDocument()
    expect(screen.getByText('Which mandates are pending approval?')).toBeInTheDocument()
  })

  it('shows stakeholders plan wording', () => {
    renderWithRouter('/platform/stakeholders')
    expect(screen.getByText('Who has low engagement?')).toBeInTheDocument()
    expect(screen.getByText('Who are my high-influence stakeholders?')).toBeInTheDocument()
  })
})

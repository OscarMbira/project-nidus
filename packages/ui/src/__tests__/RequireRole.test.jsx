/**
 * Unit tests for RequireRole — the fine-grained, exact-role-name gate used by pages narrower
 * than a whole layout scope (e.g. Form Template Builder: pmo_admin-suite only).
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import RequireRole from '../RequireRole'

let mockSession
vi.mock('@nidus/supabase', () => ({
  platformDb: {
    auth: {
      getSession: () => Promise.resolve({ data: { session: mockSession } }),
    },
  },
}))

let mockAllowed
vi.mock('@nidus/shared/utils/menuLayoutUtils', () => ({
  userHasAnyRole: () => Promise.resolve(mockAllowed),
}))

describe('RequireRole', () => {
  it('renders nothing (not the fallback, not the children) while resolving', () => {
    mockSession = null
    render(
      <RequireRole roles={['pmo_admin']} fallback={<div data-testid="fallback">Denied</div>}>
        <div data-testid="content">Gated content</div>
      </RequireRole>,
    )
    expect(screen.queryByTestId('content')).not.toBeInTheDocument()
    expect(screen.queryByTestId('fallback')).not.toBeInTheDocument()
  })

  it('renders the fallback, not the children, when there is no session', async () => {
    mockSession = null
    render(
      <RequireRole roles={['pmo_admin']} fallback={<div data-testid="fallback">Denied</div>}>
        <div data-testid="content">Gated content</div>
      </RequireRole>,
    )
    await waitFor(() => expect(screen.getByTestId('fallback')).toBeInTheDocument())
    expect(screen.queryByTestId('content')).not.toBeInTheDocument()
  })

  it('renders the children when the user holds one of the required roles', async () => {
    mockSession = { user: { id: 'u-1' } }
    mockAllowed = true
    render(
      <RequireRole roles={['pmo_admin']} fallback={<div data-testid="fallback">Denied</div>}>
        <div data-testid="content">Gated content</div>
      </RequireRole>,
    )
    await waitFor(() => expect(screen.getByTestId('content')).toBeInTheDocument())
    expect(screen.queryByTestId('fallback')).not.toBeInTheDocument()
  })

  it('renders the fallback when the user does not hold any required role', async () => {
    mockSession = { user: { id: 'u-2' } }
    mockAllowed = false
    render(
      <RequireRole roles={['pmo_admin']} fallback={<div data-testid="fallback">Denied</div>}>
        <div data-testid="content">Gated content</div>
      </RequireRole>,
    )
    await waitFor(() => expect(screen.getByTestId('fallback')).toBeInTheDocument())
    expect(screen.queryByTestId('content')).not.toBeInTheDocument()
  })
})

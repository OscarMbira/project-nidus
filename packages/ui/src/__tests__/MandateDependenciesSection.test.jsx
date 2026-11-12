import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import MandateDependenciesSection from '../MandateDependenciesSection.jsx'

function makeService(rows = []) {
  return {
    list: vi.fn().mockResolvedValue(rows),
    add: vi.fn(async (_mandateId, row) => ({ id: 'new-1', created_at: '2026-11-12T10:00:00Z', ...row })),
    update: vi.fn(async (id, row) => ({ id, ...row })),
    remove: vi.fn().mockResolvedValue(true),
  }
}

const ROW = {
  id: 'd1',
  dependency_description: 'Network upgrade by the infrastructure programme',
  dependency_type: 'external',
  dependency_status: 'analysed',
  impact_during_project: true,
  impact_after_implementation: true,
  created_at: '2026-11-01T08:00:00Z',
}

describe('MandateDependenciesSection (v1447)', () => {
  beforeEach(() => {
    try { localStorage.clear() } catch { /* storage unavailable */ }
    vi.restoreAllMocks()
  })

  it('lists the dependencies with both impact flags, read-only without actions', async () => {
    const service = makeService([ROW])
    render(<MandateDependenciesSection mandateId="m1" readOnly viewModeId="test-deps" service={service} />)
    await waitFor(() => expect(screen.getByText(ROW.dependency_description)).toBeInTheDocument())
    expect(service.list).toHaveBeenCalledWith('m1')
    expect(screen.getByText('External')).toBeInTheDocument()
    expect(screen.getAllByText('Yes')).toHaveLength(2)
    expect(screen.queryByRole('button', { name: /add dependency/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /delete dependency/i })).toBeNull()
  })

  it('adds a dependency with the impact flags the user chose', async () => {
    const service = makeService([])
    const onRowsChange = vi.fn()
    render(<MandateDependenciesSection mandateId="m1" viewModeId="test-deps" service={service} onRowsChange={onRowsChange} />)
    await waitFor(() => expect(screen.getByText('No dependencies recorded.')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: /add dependency/i }))
    fireEvent.change(screen.getByLabelText(/^Dependency/), { target: { value: 'Vendor API release' } })
    fireEvent.click(screen.getByLabelText('Continues after implementation'))
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))

    await waitFor(() => expect(service.add).toHaveBeenCalled())
    expect(service.add).toHaveBeenCalledWith('m1', expect.objectContaining({
      dependency_description: 'Vendor API release',
      impact_during_project: true,
      impact_after_implementation: true,
    }))
    await waitFor(() => expect(onRowsChange).toHaveBeenLastCalledWith([expect.objectContaining({ id: 'new-1' })]))
  })

  it('does not save a dependency without a description', async () => {
    const service = makeService([])
    render(<MandateDependenciesSection mandateId="m1" viewModeId="test-deps" service={service} />)
    await waitFor(() => expect(service.list).toHaveBeenCalled())
    fireEvent.click(screen.getByRole('button', { name: /add dependency/i }))
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Describe the dependency before saving.')
    expect(service.add).not.toHaveBeenCalled()
  })

  it('deletes only after confirmation', async () => {
    const service = makeService([ROW])
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true)
    render(<MandateDependenciesSection mandateId="m1" viewModeId="test-deps" service={service} />)
    await waitFor(() => expect(screen.getByText(ROW.dependency_description)).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: /delete dependency/i }))
    expect(service.remove).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: /delete dependency/i }))
    await waitFor(() => expect(service.remove).toHaveBeenCalledWith('d1'))
    expect(confirm).toHaveBeenCalledTimes(2)
  })
})

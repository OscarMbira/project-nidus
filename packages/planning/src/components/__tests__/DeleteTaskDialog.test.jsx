// v1265 — deleting a summary task warns and needs an extra tick.
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import DeleteTaskDialog from '../DeleteTaskDialog.jsx'

describe('DeleteTaskDialog', () => {
  it('a plain task can be deleted straight away', () => {
    const onConfirm = vi.fn()
    render(<DeleteTaskDialog task={{ id: 'a', task_name: 'Dev' }} onCancel={vi.fn()} onConfirm={onConfirm} />)
    fireEvent.click(screen.getByRole('button', { name: 'Delete task' }))
    expect(onConfirm).toHaveBeenCalled()
  })

  it('a summary task lists its sub-tasks and needs the extra tick', () => {
    const onConfirm = vi.fn()
    const kids = Array.from({ length: 7 }, (_, i) => ({ id: `k${i}`, task_name: `Sub ${i}` }))
    render(<DeleteTaskDialog task={{ id: 's', task_code: 'TSK-1', task_name: 'Envs' }} descendants={kids} onCancel={vi.fn()} onConfirm={onConfirm} />)
    expect(screen.getByText(/This is a summary task/)).toBeInTheDocument()
    expect(screen.getByText('…and 2 more')).toBeInTheDocument()
    const button = screen.getByRole('button', { name: 'Delete 8 tasks' })
    expect(button).toBeDisabled()
    fireEvent.click(screen.getByLabelText(/Yes, delete the task and its 7 sub-tasks/))
    fireEvent.click(button)
    expect(onConfirm).toHaveBeenCalled()
  })
})

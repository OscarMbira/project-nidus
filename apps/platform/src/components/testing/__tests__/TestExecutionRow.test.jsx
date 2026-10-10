import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import TestExecutionRow from '../TestExecutionRow'

const execution = {
  id: 'exec-1',
  status: 'pending',
  notes: '',
  test_cases: { test_case_ref: 'TC-001', title: 'Login works' },
}

describe('TestExecutionRow evidence (PRD v1204, Slice 1)', () => {
  it('blocks marking Passed with no evidence when evidence is required', () => {
    const onUpdate = vi.fn()
    render(<TestExecutionRow execution={execution} onUpdate={onUpdate} evidence={[]} requirement="required" />)

    fireEvent.click(screen.getByRole('button', { name: 'passed' }))

    expect(onUpdate).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent('Attach evidence before marking this test as passed.')
  })

  it('allows marking Passed with no evidence when evidence is optional', () => {
    const onUpdate = vi.fn().mockResolvedValue(undefined)
    render(<TestExecutionRow execution={execution} onUpdate={onUpdate} evidence={[]} requirement="optional" />)

    fireEvent.click(screen.getByRole('button', { name: 'passed' }))

    expect(onUpdate).toHaveBeenCalledWith('exec-1', expect.objectContaining({ status: 'passed' }))
  })

  it('allows marking Passed once a required result has a file', () => {
    const onUpdate = vi.fn().mockResolvedValue(undefined)
    const evidence = [{ id: 'ev-1', file_name: 'proof.png' }]
    render(<TestExecutionRow execution={execution} onUpdate={onUpdate} evidence={evidence} requirement="required" />)

    fireEvent.click(screen.getByRole('button', { name: 'passed' }))

    expect(onUpdate).toHaveBeenCalledWith('exec-1', expect.objectContaining({ status: 'passed' }))
  })

  it('passes each chosen file to onAttach with the execution', async () => {
    const onAttach = vi.fn().mockResolvedValue(undefined)
    const { container } = render(
      <TestExecutionRow execution={execution} onUpdate={vi.fn()} evidence={[]} onAttach={onAttach} />,
    )
    const input = container.querySelector('input[type="file"]')
    const a = new File(['a'], 'a.png', { type: 'image/png' })
    const b = new File(['b'], 'b.pdf', { type: 'application/pdf' })

    fireEvent.change(input, { target: { files: [a, b] } })

    await waitFor(() => expect(onAttach).toHaveBeenCalledTimes(2))
    expect(onAttach).toHaveBeenNthCalledWith(1, execution, a)
    expect(onAttach).toHaveBeenNthCalledWith(2, execution, b)
  })

  it('attaches an image pasted (Ctrl+V) onto the evidence area', async () => {
    const onAttach = vi.fn().mockResolvedValue(undefined)
    const { getByTestId } = render(
      <TestExecutionRow execution={execution} onUpdate={vi.fn()} evidence={[]} onAttach={onAttach} />,
    )
    const file = new File(['abc'], 'image.png', { type: 'image/png' })
    const clipboardData = {
      items: [{ kind: 'file', type: 'image/png', getAsFile: () => file }],
    }

    fireEvent.paste(getByTestId('evidence-dropzone'), { clipboardData })

    await waitFor(() => expect(onAttach).toHaveBeenCalledTimes(1))
    expect(onAttach).toHaveBeenCalledWith(execution, expect.any(File))
  })

  it('attaches a file dropped onto the evidence area', async () => {
    const onAttach = vi.fn().mockResolvedValue(undefined)
    const { getByTestId } = render(
      <TestExecutionRow execution={execution} onUpdate={vi.fn()} evidence={[]} onAttach={onAttach} />,
    )
    const file = new File(['abc'], 'log.txt', { type: 'text/plain' })

    fireEvent.drop(getByTestId('evidence-dropzone'), { dataTransfer: { files: [file] } })

    await waitFor(() => expect(onAttach).toHaveBeenCalledWith(execution, file))
  })

  it('shows the remove action only for files the viewer may remove', () => {
    const evidence = [
      { id: 'ev-1', file_name: 'mine.png', uploaded_by: 'u1' },
      { id: 'ev-2', file_name: 'theirs.png', uploaded_by: 'u2' },
    ]
    render(
      <TestExecutionRow
        execution={execution}
        onUpdate={vi.fn()}
        evidence={evidence}
        canRemoveEvidence={(ev) => ev.uploaded_by === 'u1'}
        onRemoveEvidence={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: 'Remove mine.png' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Remove theirs.png' })).toBeNull()
  })
})

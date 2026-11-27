/** v1359 — useConfirmDialog resolves true on confirm, false on cancel. */
import { describe, expect, it } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { useConfirmDialog } from '../ConfirmDialog.jsx'

function Harness({ onResult }) {
  const { confirm, dialog } = useConfirmDialog()
  return (
    <>
      <button type="button" onClick={async () => onResult(await confirm({ title: 'Revoke this key?', message: 'Integrations using it stop working.', confirmLabel: 'Revoke', danger: true }))}>Ask</button>
      {dialog}
    </>
  )
}

describe('useConfirmDialog', () => {
  it('shows the question and resolves true when confirmed', async () => {
    const results = []
    render(<Harness onResult={(v) => results.push(v)} />)
    fireEvent.click(screen.getByText('Ask'))
    expect(await screen.findByText('Revoke this key?')).toBeTruthy()
    expect(screen.getByText('Integrations using it stop working.')).toBeTruthy()
    await act(async () => { fireEvent.click(screen.getByText('Revoke')) })
    expect(results).toEqual([true])
    expect(screen.queryByText('Revoke this key?')).toBeNull()
  })

  it('resolves false when cancelled', async () => {
    const results = []
    render(<Harness onResult={(v) => results.push(v)} />)
    fireEvent.click(screen.getByText('Ask'))
    await screen.findByText('Revoke this key?')
    await act(async () => { fireEvent.click(screen.getByText('Cancel')) })
    expect(results).toEqual([false])
  })
})

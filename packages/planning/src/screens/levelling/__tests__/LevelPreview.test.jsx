import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { LevelPreview } from '../LevelPreview.jsx'

const moves = [
  { taskId: 'a', taskName: 'Design', oldStart: '2026-01-05', newStart: '2026-01-06', delayDays: 1, reason: 'Hours' },
]

describe('LevelPreview', () => {
  it('unticks a move and applies only what remains selected', () => {
    const onApply = vi.fn()
    const accepted = new Set(['a'])
    const onToggle = vi.fn()
    render(
      <LevelPreview
        mode="within_float" onMode={() => {}} moves={moves} accepted={accepted} onToggle={onToggle}
        finishBefore="2026-01-09" finishAfter="2026-01-09" finishDelayDays={0}
        overloadedBefore={1} overloadedAfter={0} onApply={onApply} onUndo={() => {}} canUndo={false} busy={false}
      />
    )
    fireEvent.click(screen.getByRole('checkbox', { name: 'Apply move for Design' }))
    expect(onToggle).toHaveBeenCalledWith('a')
    fireEvent.click(screen.getByRole('button', { name: 'Apply selected moves' }))
    expect(onApply).toHaveBeenCalled()
  })

  it('disables undo until a run has been applied', () => {
    render(
      <LevelPreview
        mode="beyond_float" onMode={() => {}} moves={[]} accepted={new Set()} onToggle={() => {}}
        finishBefore="" finishAfter="" finishDelayDays={0} overloadedBefore={0} overloadedAfter={0}
        onApply={() => {}} onUndo={() => {}} canUndo={false} busy={false}
      />
    )
    expect(screen.getByRole('button', { name: 'Undo last run' })).toBeDisabled()
  })
})

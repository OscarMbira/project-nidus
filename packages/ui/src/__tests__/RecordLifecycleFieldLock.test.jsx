import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import {
  RecordLifecycleFieldLock,
  isRecordLifecycleLocked,
} from '../RecordLifecycleFieldLock.jsx'

describe('RecordLifecycleFieldLock', () => {
  it('detects unauthorised lock state', () => {
    expect(isRecordLifecycleLocked('unauthorised')).toBe(true)
    expect(isRecordLifecycleLocked('live')).toBe(false)
  })

  it('renders banner and disables fieldset when unauthorised', () => {
    render(
      <RecordLifecycleFieldLock recordStatus="unauthorised">
        <input aria-label="Plan name" />
      </RecordLifecycleFieldLock>,
    )

    expect(screen.getByText(/locked for editing/i)).toBeInTheDocument()
    expect(screen.getByLabelText('Plan name')).toBeDisabled()
  })

  it('leaves fields enabled when live', () => {
    render(
      <RecordLifecycleFieldLock recordStatus="live">
        <input aria-label="Plan name" />
      </RecordLifecycleFieldLock>,
    )

    expect(screen.queryByText(/locked for editing/i)).not.toBeInTheDocument()
    expect(screen.getByLabelText('Plan name')).not.toBeDisabled()
  })
})

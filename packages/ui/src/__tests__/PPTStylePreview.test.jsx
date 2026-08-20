import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import PPTStylePreview from '../PPTStylePreview.jsx'

const sections = [
  { title: 'Overview', fields: [{ key: 'name', label: 'Name' }] },
  { title: 'Details', fields: [{ key: 'tags', label: 'Tags' }] },
]
const record = { name: 'Test Record', tags: ['Alpha', 'Beta'] }

describe('PPTStylePreview (v853)', () => {
  it('starts on the title slide showing the record title and slide count', () => {
    render(<PPTStylePreview sections={sections} record={record} baseFilename="Test_Record" />)
    // record.name wins over baseFilename in the title-resolution order
    expect(screen.getByText('Test Record')).toBeInTheDocument()
    expect(screen.getByText('1 / 3')).toBeInTheDocument()
  })

  it('navigates to a section slide via next and renders its numbered heading and field', () => {
    render(<PPTStylePreview sections={sections} record={record} baseFilename="Test_Record" />)
    fireEvent.click(screen.getByLabelText('Next slide'))
    expect(screen.getByText('1. Overview')).toBeInTheDocument()
    expect(screen.getByText('1.1 Name:')).toBeInTheDocument()
    expect(screen.getByText('2 / 3')).toBeInTheDocument()
  })

  it('renders a multi-value field as separate bullet items on its slide', () => {
    render(<PPTStylePreview sections={sections} record={record} baseFilename="Test_Record" />)
    fireEvent.click(screen.getByLabelText('Slide 3'))
    expect(screen.getByText('2. Details')).toBeInTheDocument()
    expect(screen.getByText('Alpha')).toBeInTheDocument()
    expect(screen.getByText('Beta')).toBeInTheDocument()
  })

  it('disables prev on the first slide and next on the last slide', () => {
    render(<PPTStylePreview sections={sections} record={record} baseFilename="Test_Record" />)
    expect(screen.getByLabelText('Previous slide')).toBeDisabled()
    fireEvent.click(screen.getByLabelText('Slide 3'))
    expect(screen.getByLabelText('Next slide')).toBeDisabled()
  })
})

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import WordStylePreview from '../WordStylePreview.jsx'

const sections = [
  { title: 'Overview', fields: [{ key: 'name', label: 'Name' }, { key: 'tags', label: 'Tags' }] },
]
const record = { name: 'Test Record', tags: ['Alpha', 'Beta'] }

describe('WordStylePreview (v853)', () => {
  it('renders numbered section heading and field labels', () => {
    render(<WordStylePreview sections={sections} record={record} baseFilename="Weekly_Status_Form" />)
    expect(screen.getByText('1. Overview')).toBeInTheDocument()
    expect(screen.getByText('1.1 Name')).toBeInTheDocument()
    expect(screen.getByText('1.2 Tags')).toBeInTheDocument()
  })

  it('renders a scalar value as a paragraph', () => {
    render(<WordStylePreview sections={sections} record={record} baseFilename="Weekly_Status_Form" />)
    expect(screen.getByText('Test Record')).toBeInTheDocument()
  })

  it('renders a multi-value field as separate bullet list items', () => {
    render(<WordStylePreview sections={sections} record={record} baseFilename="Weekly_Status_Form" />)
    expect(screen.getByText('Alpha')).toBeInTheDocument()
    expect(screen.getByText('Beta')).toBeInTheDocument()
  })

  it('falls back to the blank placeholder for empty fields', () => {
    render(
      <WordStylePreview
        sections={[{ title: 'Overview', fields: [{ key: 'missing', label: 'Missing' }] }]}
        record={{}}
        baseFilename="Weekly_Status_Form"
      />,
    )
    expect(screen.getByText('—')).toBeInTheDocument()
  })
})

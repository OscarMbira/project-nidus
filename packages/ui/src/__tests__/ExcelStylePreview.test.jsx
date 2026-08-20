import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import ExcelStylePreview from '../ExcelStylePreview.jsx'

const sections = [
  { title: 'Overview', fields: [{ key: 'name', label: 'Name' }, { key: 'tags', label: 'Tags' }] },
]
const record = { name: 'Test Record', tags: ['Alpha', 'Beta'] }

describe('ExcelStylePreview (v853)', () => {
  it('renders numbered field labels as column headers', () => {
    render(<ExcelStylePreview sections={sections} record={record} />)
    expect(screen.getByRole('columnheader', { name: '1.1 Name' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: '1.2 Tags' })).toBeInTheDocument()
  })

  it('renders a single data row with the record values', () => {
    render(<ExcelStylePreview sections={sections} record={record} />)
    expect(screen.getByText('Test Record')).toBeInTheDocument()
  })

  it('renders multi-value fields one item per line within the cell (Alt+Enter convention)', () => {
    render(<ExcelStylePreview sections={sections} record={record} />)
    expect(screen.getByText(/Alpha/)).toBeInTheDocument()
    expect(screen.getByText(/Beta/)).toBeInTheDocument()
    // Rendered as two separate line divs, not one comma-joined string
    expect(screen.queryByText('Alpha, Beta')).not.toBeInTheDocument()
  })
})

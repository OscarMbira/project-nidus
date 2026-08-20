import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ExportRecordMenu from '../ExportRecordMenu.jsx'

vi.mock('@nidus/shared/utils/exportUtils', () => ({
  exportRecordToExcel: vi.fn(),
  exportRecordToWord: vi.fn().mockResolvedValue(undefined),
  exportRecordToPPT: vi.fn(),
  exportRecordToCSV: vi.fn(),
  exportRecordToXML: vi.fn(),
  exportRecordToJSON: vi.fn(),
  exportRecordToPrint: vi.fn(),
  exportRecordToPDF: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../RecordPreviewModal', () => ({
  default: ({ isOpen }) => (isOpen ? <div data-testid="preview-modal" /> : null),
}))

const sections = [{ title: 'Overview', fields: [{ key: 'name', label: 'Name' }] }]
const record = { name: 'Test Record' }

describe('ExportRecordMenu — View button (v853)', () => {
  it('is disabled when there is no record', () => {
    render(<ExportRecordMenu sections={sections} record={null} baseFilename="Test_Record" />)
    expect(screen.getByRole('button', { name: /View/i })).toBeDisabled()
  })

  it('is disabled when sections are empty', () => {
    render(<ExportRecordMenu sections={[]} record={record} baseFilename="Test_Record" />)
    expect(screen.getByRole('button', { name: /View/i })).toBeDisabled()
  })

  it('opens RecordPreviewModal when clicked with sections and a record present', () => {
    render(<ExportRecordMenu sections={sections} record={record} baseFilename="Test_Record" />)
    expect(screen.queryByTestId('preview-modal')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /View/i }))
    expect(screen.getByTestId('preview-modal')).toBeInTheDocument()
  })
})

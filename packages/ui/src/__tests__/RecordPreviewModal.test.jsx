import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import RecordPreviewModal from '../RecordPreviewModal.jsx'

vi.mock('../Modal', () => ({
  default: ({ children, title, footer, isOpen }) =>
    isOpen ? (
      <div data-testid="modal">
        <h2>{title}</h2>
        {children}
        <div data-testid="modal-footer">{footer}</div>
      </div>
    ) : null,
}))

vi.mock('../WordStylePreview', () => ({ default: () => <div data-testid="word-preview" /> }))
vi.mock('../PPTStylePreview', () => ({ default: () => <div data-testid="ppt-preview" /> }))
vi.mock('../ExcelStylePreview', () => ({ default: () => <div data-testid="excel-preview" /> }))

const exportRecordToPDF = vi.fn().mockResolvedValue(undefined)
const exportRecordToWord = vi.fn().mockResolvedValue(undefined)
const exportRecordToPPT = vi.fn()
const exportRecordToExcel = vi.fn()
const generateRecordPdfBlob = vi.fn().mockResolvedValue(new Blob(['x']))

vi.mock('@nidus/shared/utils/exportUtils', () => ({
  exportRecordToPDF: (...args) => exportRecordToPDF(...args),
  exportRecordToWord: (...args) => exportRecordToWord(...args),
  exportRecordToPPT: (...args) => exportRecordToPPT(...args),
  exportRecordToExcel: (...args) => exportRecordToExcel(...args),
  generateRecordPdfBlob: (...args) => generateRecordPdfBlob(...args),
}))

const sections = [{ title: 'Overview', fields: [{ key: 'name', label: 'Name' }] }]
const record = { name: 'Test Record' }

beforeEach(() => {
  vi.clearAllMocks()
  global.URL.createObjectURL = vi.fn(() => 'blob:fake-url')
  global.URL.revokeObjectURL = vi.fn()
})

describe('RecordPreviewModal (v853)', () => {
  it('defaults to the PDF tab and renders the generated PDF in an iframe once ready', async () => {
    render(
      <RecordPreviewModal isOpen onClose={() => {}} sections={sections} record={record} baseFilename="Test_Record" />,
    )
    await waitFor(() => expect(generateRecordPdfBlob).toHaveBeenCalledWith(sections, record, 'Test_Record', undefined, '—', {}))
    await waitFor(() => expect(screen.getByTitle('PDF Preview')).toBeInTheDocument())
  })

  it('switches to the Word tab and renders WordStylePreview', () => {
    render(
      <RecordPreviewModal isOpen onClose={() => {}} sections={sections} record={record} baseFilename="Test_Record" />,
    )
    fireEvent.click(screen.getByRole('tab', { name: 'Word' }))
    expect(screen.getByTestId('word-preview')).toBeInTheDocument()
  })

  it('switches to the PowerPoint tab and renders PPTStylePreview', () => {
    render(
      <RecordPreviewModal isOpen onClose={() => {}} sections={sections} record={record} baseFilename="Test_Record" />,
    )
    fireEvent.click(screen.getByRole('tab', { name: 'PowerPoint' }))
    expect(screen.getByTestId('ppt-preview')).toBeInTheDocument()
  })

  it('switches to the Excel tab and renders ExcelStylePreview', () => {
    render(
      <RecordPreviewModal isOpen onClose={() => {}} sections={sections} record={record} baseFilename="Test_Record" />,
    )
    fireEvent.click(screen.getByRole('tab', { name: 'Excel' }))
    expect(screen.getByTestId('excel-preview')).toBeInTheDocument()
  })

  it('"Export this format" calls the export function matching the active tab', () => {
    render(
      <RecordPreviewModal isOpen onClose={() => {}} sections={sections} record={record} baseFilename="Test_Record" />,
    )
    fireEvent.click(screen.getByRole('tab', { name: 'Excel' }))
    fireEvent.click(screen.getByRole('button', { name: 'Export as Excel' }))
    expect(exportRecordToExcel).toHaveBeenCalledWith(sections, record, 'Test_Record', undefined)
  })

  it('Cancel closes the preview (returns to the page underneath)', () => {
    const onClose = vi.fn()
    render(
      <RecordPreviewModal isOpen onClose={onClose} sections={sections} record={record} baseFilename="Test_Record" />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('renders nothing when closed', () => {
    render(
      <RecordPreviewModal isOpen={false} onClose={() => {}} sections={sections} record={record} baseFilename="Test_Record" />,
    )
    expect(screen.queryByTestId('modal')).not.toBeInTheDocument()
  })
})

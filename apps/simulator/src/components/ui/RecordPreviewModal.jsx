/**
 * RecordPreviewModal — "View" a record as PDF / Word / PPT / Excel in-app, without exporting
 * (v853). PDF tab shows the real generated PDF (jsPDF, already a dependency) in an iframe.
 * Word/PPT/Excel tabs render a styled-HTML look-alike using the same sections/record data
 * the real export functions consume (WordStylePreview/PPTStylePreview/ExcelStylePreview) —
 * no new rendering dependencies. Each tab has an "Export this format" button that calls the
 * same exportRecordTo* function the Export dropdown already uses.
 */

import { useEffect, useState } from 'react'
import { FileDown, FileText, Presentation, Table2 } from 'lucide-react'
import {
  exportRecordToPDF,
  exportRecordToWord,
  exportRecordToPPT,
  exportRecordToExcel,
  generateRecordPdfBlob,
} from '@nidus/shared/utils/exportUtils'
import Modal from './Modal'
import WordStylePreview from './WordStylePreview'
import PPTStylePreview from './PPTStylePreview'
import ExcelStylePreview from './ExcelStylePreview'

const TABS = [
  { id: 'pdf', label: 'PDF', icon: FileDown, iconColor: 'text-red-600' },
  { id: 'word', label: 'Word', icon: FileText, iconColor: 'text-blue-600' },
  { id: 'ppt', label: 'PowerPoint', icon: Presentation, iconColor: 'text-amber-600' },
  { id: 'excel', label: 'Excel', icon: Table2, iconColor: 'text-green-600' },
]

/** Chrome/Edge PDF viewer: fit page width so the preview is readable (not a postage stamp). */
function pdfPreviewSrc(blobUrl) {
  if (!blobUrl) return ''
  return `${blobUrl}#view=FitH&toolbar=1&navpanes=0`
}

export default function RecordPreviewModal({
  isOpen,
  onClose,
  sections = [],
  record,
  baseFilename = 'Record',
  branding,
  attachmentAssets = {},
}) {
  const [activeTab, setActiveTab] = useState('pdf')
  const [pdfUrl, setPdfUrl] = useState(null)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    setActiveTab('pdf')
  }, [isOpen])

  useEffect(() => {
    if (!isOpen || activeTab !== 'pdf' || !record) return
    let cancelled = false
    setPdfLoading(true)
    generateRecordPdfBlob(sections, record, baseFilename, branding, '—', attachmentAssets)
      .then((blob) => {
        if (cancelled) return
        setPdfUrl(URL.createObjectURL(blob))
      })
      .finally(() => {
        if (!cancelled) setPdfLoading(false)
      })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, activeTab, sections, record, baseFilename, attachmentAssets])

  useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl)
    }
  }, [pdfUrl])

  useEffect(() => {
    if (!isOpen) {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl)
      setPdfUrl(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  if (!isOpen) return null

  const handleExport = async () => {
    if (!record) return
    setExporting(true)
    try {
      if (activeTab === 'pdf') await exportRecordToPDF(sections, record, baseFilename, branding, '—', attachmentAssets)
      else if (activeTab === 'word') await exportRecordToWord(sections, record, baseFilename, branding, '—', attachmentAssets)
      else if (activeTab === 'ppt') await exportRecordToPPT(sections, record, baseFilename, branding, '—', attachmentAssets)
      else if (activeTab === 'excel') exportRecordToExcel(sections, record, baseFilename, branding)
    } finally {
      setExporting(false)
    }
  }

  const activeTabDef = TABS.find((t) => t.id === activeTab)

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Preview: ${baseFilename.replace(/_/g, ' ')}`}
      size="full"
      className="!max-w-[93.6rem] w-full h-[92vh] max-h-[92vh] flex flex-col overflow-hidden"
      contentClassName="!p-0 !max-h-none flex-1 min-h-0 overflow-hidden flex flex-col"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting || !record}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {exporting ? 'Exporting...' : `Export as ${activeTabDef?.label}`}
          </button>
        </>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex shrink-0 flex-wrap items-end justify-between gap-2 border-b border-gray-200 px-4 pt-2 dark:border-gray-700 sm:px-6">
          <div className="flex gap-1" role="tablist" aria-label="Preview format">
            {TABS.map(({ id, label, icon: Icon, iconColor }) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={activeTab === id}
                onClick={() => setActiveTab(id)}
                className={`inline-flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium border-b-2 -mb-px ${
                  activeTab === id
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                <Icon className={`w-4 h-4 ${iconColor}`} />
                {label}
              </button>
            ))}
          </div>
          <p className="pb-2 text-xs text-gray-500 dark:text-gray-400">
            Preview only — nothing downloads until you export.
          </p>
        </div>

        <div
          className={`min-h-0 flex-1 ${
            activeTab === 'pdf'
              ? 'bg-gray-200 dark:bg-gray-950'
              : 'overflow-auto bg-gray-100 p-4 dark:bg-gray-950 sm:p-6'
          }`}
        >
          {activeTab === 'pdf' && (
            pdfLoading || !pdfUrl ? (
              <div className="flex h-full min-h-[50vh] items-center justify-center text-sm text-gray-600 dark:text-gray-300">
                Generating PDF preview…
              </div>
            ) : (
              <iframe
                src={pdfPreviewSrc(pdfUrl)}
                title="PDF Preview"
                className="block h-full min-h-[50vh] w-full border-0 bg-white"
              />
            )
          )}
          {activeTab === 'word' && (
            <WordStylePreview sections={sections} record={record} baseFilename={baseFilename} branding={branding} attachmentAssets={attachmentAssets} />
          )}
          {activeTab === 'ppt' && (
            <PPTStylePreview sections={sections} record={record} baseFilename={baseFilename} branding={branding} attachmentAssets={attachmentAssets} />
          )}
          {activeTab === 'excel' && (
            <ExcelStylePreview sections={sections} record={record} branding={branding} />
          )}
        </div>
      </div>
    </Modal>
  )
}

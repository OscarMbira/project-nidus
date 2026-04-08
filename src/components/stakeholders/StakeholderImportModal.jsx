/**
 * StakeholderImportModal – Bulk import stakeholders from CSV.
 * Renders above the register list; use projectId to assign imported rows to the selected project.
 */

import { useState, useRef } from 'react'
import { X, Upload, Download, FileSpreadsheet } from 'lucide-react'
import { saveStakeholder } from '../../services/stakeholderService'

const TEMPLATE_HEADERS = 'stakeholder_name,stakeholder_title,stakeholder_organization,stakeholder_department,email,phone,mobile,stakeholder_type,project_role,stakeholder_status'

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim())
  if (lines.length === 0) return { headers: [], rows: [] }
  const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''))
  const rows = lines.slice(1).map((line) => {
    const values = line.split(',').map((v) => v.trim().replace(/^"|"$/g, ''))
    const obj = {}
    headers.forEach((h, i) => { obj[h] = values[i] ?? '' })
    return obj
  })
  return { headers, rows }
}

export default function StakeholderImportModal({ projectId, onClose, onImportComplete }) {
  const [file, setFile] = useState(null)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const fileInputRef = useRef(null)

  const handleDownloadTemplate = () => {
    const csv = TEMPLATE_HEADERS + '\n' + 'Example Name,Director,Acme Ltd,IT,user@example.com,+1234567890,+0987654321,internal,Sponsor,active'
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'stakeholder_import_template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleFileSelect = (e) => {
    const f = e.target.files?.[0]
    setFile(f || null)
    setError(null)
    setResult(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleImport = async () => {
    if (!file) {
      setError('Select a file to import.')
      return
    }
    setImporting(true)
    setError(null)
    setResult(null)
    try {
      const text = await file.text()
      const { rows } = parseCSV(text)
      if (rows.length === 0) {
        setError('No data rows in file.')
        setImporting(false)
        return
      }
      const created = []
      const failed = []
      for (const row of rows) {
        const name = (row.stakeholder_name || row.name || '').trim()
        if (!name) continue
        try {
          const data = {
            project_id: projectId || null,
            stakeholder_name: name,
            stakeholder_title: (row.stakeholder_title || row.title || '').trim() || null,
            stakeholder_organization: (row.stakeholder_organization || row.organization || '').trim() || null,
            stakeholder_department: (row.stakeholder_department || row.department || '').trim() || null,
            email: (row.email || '').trim() || null,
            phone: (row.phone || '').trim() || null,
            mobile: (row.mobile || '').trim() || null,
            stakeholder_type: (row.stakeholder_type || row.type || 'internal').trim() || 'internal',
            project_role: (row.project_role || row.role || '').trim() || null,
            stakeholder_status: (row.stakeholder_status || row.status || 'active').trim() || 'active',
          }
          const saved = await saveStakeholder(data, null)
          created.push(saved)
        } catch (err) {
          failed.push({ row: name, error: err.message })
        }
      }
      setResult({ created: created.length, failed: failed.length, failedDetails: failed })
      if (created.length > 0) onImportComplete?.()
    } catch (err) {
      setError(err.message || 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Import Stakeholders
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-4 space-y-4">
          {!projectId && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              No project selected — imported stakeholders will be unassigned; you can assign them later.
            </p>
          )}
          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            <Download className="h-4 w-4" />
            Download CSV template
          </button>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Upload file</label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="w-full text-sm text-gray-600 dark:text-gray-400 file:mr-2 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-gray-100 dark:file:bg-gray-700 file:text-gray-700 dark:file:text-gray-300"
            />
            {file && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{file.name}</p>}
          </div>
          {error && (
            <div className="p-3 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 text-sm">
              {error}
            </div>
          )}
          {result && (
            <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 text-sm">
              Imported {result.created} stakeholder(s).
              {result.failed > 0 && ` ${result.failed} failed.`}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={!file || !projectId || importing}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium"
          >
            <Upload className="h-4 w-4" />
            {importing ? 'Importing...' : 'Import'}
          </button>
        </div>
      </div>
    </div>
  )
}

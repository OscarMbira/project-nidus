/**
 * StakeholderImportModal – Bulk import stakeholders from CSV.
 * Renders above the register list; use projectId to assign imported rows to the selected project.
 * v1272 Phase 2: when the file's columns don't match the template, the Import Mapper step
 * (ColumnMappingStep) matches them first; the CSV template now carries a data dictionary (rule 71).
 */

import { useState, useRef } from 'react'
import { X, Upload, Download, FileSpreadsheet } from 'lucide-react'
import ColumnMappingStep from '@nidus/ui/ai/ColumnMappingStep.jsx'
import { dictionaryFromColumns, needsMapping, parseCsvText } from '@nidus/shared/utils/importMapping'
import { saveStakeholder } from '../../services/stakeholderService'

/** Template columns and data dictionary (rule 71). */
export const STAKEHOLDER_IMPORT_COLUMNS = [
  { key: 'stakeholder_name', required: true, type: 'Text', max: '200', description: 'Full name of the person or group. Required.', aliases: ['name', 'full_name', 'stakeholder'] },
  { key: 'stakeholder_title', required: false, type: 'Text', max: '200', description: 'Job title.', aliases: ['title', 'job_title', 'position'] },
  { key: 'stakeholder_organization', required: false, type: 'Text', max: '200', description: 'Company or organisation.', aliases: ['organization', 'organisation', 'company'] },
  { key: 'stakeholder_department', required: false, type: 'Text', max: '200', description: 'Department or team.', aliases: ['department', 'team'] },
  { key: 'email', required: false, type: 'Text', max: '254', description: 'Email address.', aliases: ['email_address', 'e-mail'] },
  { key: 'phone', required: false, type: 'Text', max: '50', description: 'Office phone.', aliases: ['telephone', 'tel'] },
  { key: 'mobile', required: false, type: 'Text', max: '50', description: 'Mobile phone.', aliases: ['cell', 'mobile_phone'] },
  { key: 'stakeholder_type', required: false, type: 'Text', max: '50', description: 'For example internal or external. Defaults to internal.', aliases: ['type'] },
  { key: 'project_role', required: false, type: 'Text', max: '200', description: 'Role on the project, e.g. Sponsor.', aliases: ['role'] },
  { key: 'stakeholder_status', required: false, type: 'Text', max: '50', description: 'Defaults to active.', aliases: ['status'] },
]
const DICTIONARY = dictionaryFromColumns(STAKEHOLDER_IMPORT_COLUMNS)

function templateCsv() {
  const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const legend = [
    '# DATA DICTIONARY — lines starting with # are ignored on import',
    '# field,required,data_type,max_length,allowed_values,format_notes,aliases',
    ...STAKEHOLDER_IMPORT_COLUMNS.map((c) => `# ${[c.key, c.required ? 'Yes' : 'No', c.type, c.max, 'Any text', c.description, c.aliases.join(' / ')].map(csvCell).join(',')}`),
  ]
  return [...legend, STAKEHOLDER_IMPORT_COLUMNS.map((c) => c.key).join(','),
    'Example Name,Director,Acme Ltd,IT,user@example.com,+1234567890,+0987654321,internal,Sponsor,active'].join('\n')
}

export default function StakeholderImportModal({ projectId, onClose, onImportComplete }) {
  const [file, setFile] = useState(null)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [mappingInput, setMappingInput] = useState(null) // { headers, rows } while matching columns
  const fileInputRef = useRef(null)

  const handleDownloadTemplate = () => {
    const blob = new Blob([templateCsv()], { type: 'text/csv;charset=utf-8;' })
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
    setMappingInput(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const importRows = async (rows) => {
    setImporting(true)
    setError(null)
    try {
      const created = []
      const failed = []
      for (const row of rows) {
        const name = String(row.stakeholder_name || row.name || '').trim()
        if (!name) continue
        const val = (...keys) => keys.map((k) => String(row[k] ?? '').trim()).find(Boolean) || ''
        try {
          const data = {
            project_id: projectId || null,
            stakeholder_name: name,
            stakeholder_title: val('stakeholder_title', 'title') || null,
            stakeholder_organization: val('stakeholder_organization', 'organization') || null,
            stakeholder_department: val('stakeholder_department', 'department') || null,
            email: val('email') || null,
            phone: val('phone') || null,
            mobile: val('mobile') || null,
            stakeholder_type: val('stakeholder_type', 'type') || 'internal',
            project_role: val('project_role', 'role') || null,
            stakeholder_status: val('stakeholder_status', 'status') || 'active',
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

  const handleImport = async () => {
    if (!file) {
      setError('Select a file to import.')
      return
    }
    setError(null)
    setResult(null)
    try {
      const { headers, rows } = parseCsvText(await file.text())
      if (rows.length === 0) {
        setError('No data rows in file.')
        return
      }
      if (needsMapping(headers, DICTIONARY)) {
        setMappingInput({ headers, rows })
        return
      }
      await importRows(rows)
    } catch (err) {
      setError(err.message || 'Import failed')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full border border-gray-200 dark:border-gray-700 max-h-[90vh] overflow-y-auto ${mappingInput ? 'max-w-4xl' : 'max-w-md'}`}>
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
        {mappingInput ? (
          <div className="p-4">
            <ColumnMappingStep
              target="stakeholders"
              templateLabel="Stakeholders"
              columns={STAKEHOLDER_IMPORT_COLUMNS}
              headers={mappingInput.headers}
              rows={mappingInput.rows}
              onCancel={() => setMappingInput(null)}
              onConfirm={({ rows }) => { setMappingInput(null); importRows(rows) }}
            />
          </div>
        ) : (
          <>
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
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Columns from another tool? You can match them to the template after choosing Import.</p>
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
          </>
        )}
      </div>
    </div>
  )
}

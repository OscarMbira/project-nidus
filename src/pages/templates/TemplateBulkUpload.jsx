import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { bulkImportTemplatesFromRows } from '../../services/templateLibraryService'
import { getCurrentUserAccountId } from '../../utils/accountResolution'

const BASE = '/platform/templates'

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim())
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map((h) => h.trim())
  return lines.slice(1).map((line) => {
    const cells = line.split(',').map((c) => c.trim())
    const row = {}
    headers.forEach((h, i) => {
      row[h] = cells[i] ?? ''
    })
    return row
  })
}

export default function TemplateBulkUpload() {
  const [accountId, setAccountId] = useState(null)
  const [text, setText] = useState('title,template_type_code,category_code,description,status\n')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)
  const [err, setErr] = useState(null)

  useEffect(() => {
    getCurrentUserAccountId().then(setAccountId)
  }, [])

  const run = async () => {
    if (!accountId) {
      setErr('No organisation')
      return
    }
    setBusy(true)
    setErr(null)
    setResult(null)
    const rows = parseCsv(text)
    const { imported, errors } = await bulkImportTemplatesFromRows(accountId, rows)
    setBusy(false)
    setResult({ imported, errors })
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Link to={BASE} className="inline-flex items-center gap-2 text-gray-600 mb-6">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Bulk upload templates</h1>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        CSV columns: title, template_type_code, category_code (optional), description, status (draft|published).
      </p>
      <a
        href={`data:text/csv;charset=utf-8,${encodeURIComponent('title,template_type_code,category_code,description,status\nSample,risk_register,control,,draft\n')}`}
        download="template_library_import_template.csv"
        className="text-violet-600 dark:text-violet-400 text-sm underline mb-4 inline-block"
      >
        Download sample CSV
      </a>
      {err && <p className="text-red-600 mb-4">{err}</p>}
      {result && (
        <div className="mb-4 rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 p-4">
          <p className="text-green-800 dark:text-green-200">Imported: {result.imported}</p>
          {result.errors?.length > 0 && (
            <ul className="text-sm text-amber-800 dark:text-amber-200 mt-2 list-disc pl-5">
              {result.errors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          )}
        </div>
      )}
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={14}
        className="w-full font-mono text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-900 text-gray-100 px-3 py-2"
      />
      <button
        type="button"
        disabled={busy}
        onClick={run}
        className="mt-4 px-4 py-2 rounded-lg bg-violet-600 text-white disabled:opacity-50"
      >
        {busy ? 'Importing…' : 'Import'}
      </button>
    </div>
  )
}

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Upload } from 'lucide-react'
import Papa from 'papaparse'
import { bulkImportOPAFromParsedRows } from '../../services/opaService'
import { getCurrentUserAccountId } from '../../utils/accountResolution'

export default function OPABulkUpload() {
  const [file, setFile] = useState(null)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)
  const [err, setErr] = useState(null)

  const run = async () => {
    setErr(null)
    setResult(null)
    const accountId = await getCurrentUserAccountId()
    if (!accountId) {
      setErr('No organisation context')
      return
    }
    if (!file) {
      setErr('Choose a CSV file')
      return
    }
    setBusy(true)
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (res) => {
        const rows = res.data || []
        const { imported, errors } = await bulkImportOPAFromParsedRows(accountId, rows)
        setBusy(false)
        setResult({ imported, errors })
      },
      error: (e) => {
        setBusy(false)
        setErr(e.message)
      },
    })
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Link to="/platform/opa" className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-6">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Bulk upload OPA (CSV)</h1>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
        Required column: <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">title</code>. Optional: opa_type, status, version, category_code, description, document_reference,
        effective_date, expiry_date, notes, tags (semicolon-separated), is_on_hold, on_hold_reason
      </p>
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 space-y-4">
        <input type="file" accept=".csv,text/csv" className="block w-full text-sm text-gray-700 dark:text-gray-300" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        {err && (
          <p className="text-red-600 dark:text-red-400" role="alert">
            {err}
          </p>
        )}
        <button type="button" disabled={busy} onClick={run} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-600 text-white disabled:opacity-50">
          <Upload className="h-4 w-4" /> {busy ? 'Importing…' : 'Import'}
        </button>
        {result && (
          <div className="text-sm text-gray-700 dark:text-gray-300 space-y-2">
            <p>
              Imported: <strong>{result.imported}</strong>
            </p>
            {result.errors?.length > 0 && (
              <ul className="list-disc pl-5 text-amber-700 dark:text-amber-300 max-h-40 overflow-y-auto">
                {result.errors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

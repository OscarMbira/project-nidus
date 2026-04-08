import { useState } from 'react'
import { Link } from 'react-router-dom'
import Papa from 'papaparse'
import { bulkImportEEFFromParsedRows } from '../../../services/sim/simEEFService'
import { getCurrentUserAccountId } from '../../../utils/accountResolution'

export default function SimEEFBulkUpload() {
  const [file, setFile] = useState(null)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)

  const run = async () => {
    const accountId = await getCurrentUserAccountId()
    if (!accountId || !file) return
    setBusy(true)
    Papa.parse(file, {
      header: true,
      complete: async (res) => {
        const { imported, errors } = await bulkImportEEFFromParsedRows(accountId, res.data || [])
        setBusy(false)
        setResult({ imported, errors })
      },
    })
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <Link to="/simulator/eef" className="text-gray-400 mb-4 inline-block">
        Back
      </Link>
      <h1 className="text-xl font-bold text-white mb-4">Bulk upload (CSV)</h1>
      <input type="file" accept=".csv" onChange={(e) => setFile(e.target.files?.[0] || null)} className="mb-4" />
      <button type="button" disabled={busy} onClick={run} className="px-4 py-2 bg-sky-600 text-white rounded-lg">
        Import
      </button>
      {result && (
        <p className="mt-4 text-gray-300">
          Imported {result.imported}. {result.errors?.length ? result.errors.join('; ') : ''}
        </p>
      )}
    </div>
  )
}

import { useState } from 'react'
import { Link } from 'react-router-dom'
import Papa from 'papaparse'
import { bulkImportOPAFromParsedRows } from '../../../services/sim/simOPAService'
import { getCurrentUserAccountId } from '../../../utils/accountResolution'

export default function SimOPABulkUpload() {
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
        const { imported, errors } = await bulkImportOPAFromParsedRows(accountId, res.data || [])
        setBusy(false)
        setResult({ imported, errors })
      },
    })
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <Link to="/simulator/opa" className="text-gray-400">
        Back
      </Link>
      <h1 className="text-xl font-bold text-white my-4">OPA bulk upload</h1>
      <input type="file" accept=".csv" onChange={(e) => setFile(e.target.files?.[0] || null)} />
      <button type="button" disabled={busy} onClick={run} className="ml-4 px-4 py-2 bg-sky-600 text-white rounded-lg">
        Import
      </button>
      {result && <p className="mt-4 text-gray-300">Imported {result.imported}</p>}
    </div>
  )
}

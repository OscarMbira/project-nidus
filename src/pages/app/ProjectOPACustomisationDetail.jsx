import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Archive, Pencil } from 'lucide-react'
import { useOPATailoringContext } from '../../hooks/useOPATailoringContext'
import { TableRowNumberHeader, TableRowNumberCell } from '../../components/ui/Table'
import { getDisplayRowNumber } from '../../utils/tableRowNumberUtils'

export default function ProjectOPACustomisationDetail() {
  const navigate = useNavigate()
  const { customisationId, base, sourceOpaPath, svc, normalizeFieldConfigs } = useOPATailoringContext()
  const [row, setRow] = useState(null)
  const [fieldConfigs, setFieldConfigs] = useState([])
  const [err, setErr] = useState(null)

  useEffect(() => {
    if (!customisationId) return
    ;(async () => {
      const { data, error } = await svc.getCustomisationById(customisationId)
      if (error) setErr(error.message)
      else setRow(data)
      const { data: fields } = await svc.getFieldConfigs(customisationId)
      setFieldConfigs(fields || [])
    })()
  }, [customisationId, svc])

  const normalized = useMemo(() => normalizeFieldConfigs(fieldConfigs), [fieldConfigs, normalizeFieldConfigs])

  async function handleArchive() {
    if (!window.confirm('Archive this template?')) return
    const { error } = await svc.archiveCustomisation(customisationId)
    if (error) setErr(error.message)
    else navigate(base)
  }

  if (err || !row) {
    return <div className="p-8 text-gray-600">{err || 'Loading…'}</div>
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link to={base} className="inline-flex items-center gap-2 text-gray-600 mb-6 text-sm">
        <ArrowLeft className="h-4 w-4" /> Back to library
      </Link>
      <div className="flex flex-wrap justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{row.custom_title}</h1>
          <p className="text-sm text-gray-500 mt-1">
            v{row.version || '1.0'} · {row.status}
            {row.is_on_hold ? ' · On hold' : ''}
            {row.project?.project_name ? ` · ${row.project.project_name}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => svc.exportCustomisationToExcel(row, normalized)}
            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm min-h-[44px]"
          >
            Export Excel
          </button>
          <button
            type="button"
            onClick={() => svc.exportCustomisationToPpt(row, normalized)}
            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm min-h-[44px]"
          >
            Export PPT
          </button>
          <button
            type="button"
            onClick={() => navigate(`${base}/${customisationId}/edit`)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-600 text-white min-h-[44px]"
          >
            <Pencil className="h-4 w-4" /> Edit
          </button>
          <button
            type="button"
            onClick={handleArchive}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-amber-300 text-amber-800 min-h-[44px]"
          >
            <Archive className="h-4 w-4" /> Archive
          </button>
        </div>
      </div>

      {row.custom_description && (
        <p className="text-gray-700 dark:text-gray-300 mb-6">{row.custom_description}</p>
      )}

      {row.notes && (
        <p className="text-sm text-gray-600 mb-6 whitespace-pre-wrap">
          <span className="font-medium">Notes:</span> {row.notes}
        </p>
      )}

      <div className="mb-8 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <h2 className="font-semibold mb-2">Source OPA</h2>
        <p className="text-sm">
          {row.source?.title || '—'}{' '}
          {row.source_opa_id && (
            <Link to={sourceOpaPath(row.source_opa_id)} className="text-sky-600 ml-2">
              View original
            </Link>
          )}
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
                <TableRowNumberHeader className="!normal-case" />
              <th className="px-3 py-2 text-left">Field</th>
              <th className="px-3 py-2">Visible</th>
              <th className="px-3 py-2">Required</th>
              <th className="px-3 py-2 text-left">Label</th>
            </tr>
          </thead>
          <tbody>
            {normalized.map((f, index) => (
              <tr key={f.field_key} className="border-t border-gray-200 dark:border-gray-700">
                    <TableRowNumberCell number={getDisplayRowNumber(index)} />
                <td className="px-3 py-2">{f.field_label}</td>
                <td className="px-3 py-2 text-center">{f.is_visible ? 'Yes' : 'No'}</td>
                <td className="px-3 py-2 text-center">{f.is_required ? 'Yes' : 'No'}</td>
                <td className="px-3 py-2">{f.custom_label || f.field_label}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

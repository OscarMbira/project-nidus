import { useEffect, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import TestingPageShell from '../../components/testing/TestingPageShell'
import DefectForm from '../../components/testing/DefectForm'
import DefectCommentSection from '../../components/testing/DefectCommentSection'
import DefectAttachmentUploader from '../../components/testing/DefectAttachmentUploader'
import DefectHistoryTimeline from '../../components/testing/DefectHistoryTimeline'
import DefectStatusBadge from '../../components/testing/DefectStatusBadge'
import DefectSeverityBadge from '../../components/testing/DefectSeverityBadge'
import ExportRecordButtons from '../../components/ui/ExportRecordButtons'
import {
  getDefectById,
  createDefect,
  updateDefect,
} from '../../services/defectService'
import {
  exportRecordToExcel,
  exportRecordToWord,
  exportRecordToPPT,
  exportRecordToCSV,
  exportRecordToXML,
  exportRecordToJSON,
  exportRecordToPrint,
} from '../../utils/exportUtils'
import { resolveInternalUserId } from '../../utils/resolveInternalUserId'

const DEFECT_EXPORT_SECTIONS = [
  {
    title: 'Defect',
    fields: [
      { key: 'defect_ref', label: 'Ref' },
      { key: 'title', label: 'Title' },
      { key: 'description', label: 'Description' },
      { key: 'severity', label: 'Severity' },
      { key: 'priority', label: 'Priority' },
      { key: 'status', label: 'Status' },
      { key: 'environment', label: 'Environment' },
      { key: 'steps_to_reproduce', label: 'Steps to reproduce' },
      { key: 'expected_behavior', label: 'Expected' },
      { key: 'actual_behavior', label: 'Actual' },
    ],
  },
]

export default function DefectDetail() {
  const { defectId } = useParams()
  const isNew = defectId === 'new'
  return (
    <TestingPageShell title={isNew ? 'New defect' : 'Defect detail'} subtitle="Track resolution, comments, and attachments.">
      {({ projectId }) => <Detail defectId={defectId} isNew={isNew} projectId={projectId} />}
    </TestingPageShell>
  )
}

function Detail({ defectId, isNew, projectId }) {
  const navigate = useNavigate()
  const [row, setRow] = useState(null)
  const [editing, setEditing] = useState(isNew)
  const [err, setErr] = useState(null)
  const [success, setSuccess] = useState(null)
  const [uid, setUid] = useState(null)

  useEffect(() => {
    resolveInternalUserId().then(setUid)
  }, [])

  useEffect(() => {
    setEditing(isNew)
  }, [isNew, defectId])

  useEffect(() => {
    if (isNew || !defectId) {
      setRow(null)
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const d = await getDefectById(defectId)
        if (!cancelled) setRow(d)
      } catch (e) {
        if (!cancelled) setErr(e?.message)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [defectId, isNew])

  if (!projectId) return <p className="text-gray-500 text-sm">Select a project.</p>
  if (err) return <p className="text-red-400">{err}</p>
  if (!isNew && !row) return <p className="text-gray-500">Loading…</p>

  const record = row || {}

  const onSave = async (payload) => {
    const internalId = uid || (await resolveInternalUserId())
    try {
      if (isNew) {
        const inserted = await createDefect({
          ...payload,
          project_id: projectId,
          reported_by: internalId || undefined,
          created_by: internalId || undefined,
        })
        setSuccess({ op: 'created', id: inserted.id, ref: inserted.defect_ref })
        navigate(`/platform/testing/defects/${inserted.id}`, { replace: true })
        return
      }
      const updated = await updateDefect(defectId, payload)
      setRow((r) => ({ ...r, ...updated }))
      setEditing(false)
      setSuccess({ op: 'updated', id: updated.id, ref: updated.defect_ref })
    } catch (e) {
      setErr(e?.message || 'Save failed')
    }
  }

  return (
    <div className="space-y-4">
      <Link to="/platform/testing/defects" className="text-sm text-emerald-400 hover:underline">
        ← All defects
      </Link>
      {success && (
        <div
          className="rounded-lg border border-emerald-700/60 bg-emerald-950/40 px-4 py-3 text-emerald-100 text-sm"
          role="status"
        >
          Successfully {success.op} defect <strong>{success.ref || success.id}</strong> (id: {success.id}).
        </div>
      )}
      {!isNew && row && (
        <div className="flex flex-wrap justify-between gap-2">
          <div>
            <p className="text-xs text-gray-500">{row.defect_ref}</p>
            <h2 className="text-xl font-bold text-white flex flex-wrap items-center gap-2">
              {row.title}
              <DefectStatusBadge status={row.status} />
              <DefectSeverityBadge severity={row.severity} />
            </h2>
          </div>
          <div className="flex gap-2">
            <ExportRecordButtons
              onExportExcel={() => exportRecordToExcel(DEFECT_EXPORT_SECTIONS, record, `defect_${row.defect_ref || row.id}`)}
              onExportWord={() => exportRecordToWord(DEFECT_EXPORT_SECTIONS, record, `defect_${row.defect_ref || row.id}`)}
              onExportPPT={() => exportRecordToPPT(DEFECT_EXPORT_SECTIONS, record, `defect_${row.defect_ref || row.id}`)}
              onExportCSV={() => exportRecordToCSV(DEFECT_EXPORT_SECTIONS, record, `defect_${row.defect_ref || row.id}`)}
              onExportXML={() => exportRecordToXML(DEFECT_EXPORT_SECTIONS, record, `defect_${row.defect_ref || row.id}`)}
              onExportJSON={() => exportRecordToJSON(DEFECT_EXPORT_SECTIONS, record, `defect_${row.defect_ref || row.id}`)}
              onExportPrint={() => exportRecordToPrint(DEFECT_EXPORT_SECTIONS, record)}
            />
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="px-3 py-1.5 rounded-lg bg-gray-800 border border-gray-600 text-sm text-white"
            >
              Edit
            </button>
          </div>
        </div>
      )}
      {(isNew || editing) && (
        <DefectForm defect={isNew ? null : row} projectId={projectId} onSubmit={onSave} disabled={false} />
      )}
      {!isNew && row && !editing && (
        <>
          <div className="rounded-xl border border-gray-800 p-4 space-y-2 text-sm text-gray-300 whitespace-pre-wrap">
            {row.description}
          </div>
          <DefectCommentSection defectId={row.id} currentUserId={uid} />
          <DefectAttachmentUploader projectId={row.project_id} defectId={row.id} uploadedByUserId={uid} />
          <DefectHistoryTimeline defectId={row.id} />
        </>
      )}
    </div>
  )
}

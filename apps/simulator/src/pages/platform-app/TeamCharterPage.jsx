import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield, FileEdit, ArrowLeft, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import ExportRecordMenu from '@nidus/ui/ExportRecordMenu'
import { parseMultiLineValue } from '@nidus/ui/MultiLineListInput'
import { getTeamCharter } from '../../services/teamCharterService'
import { usePlatformProjectId } from '@nidus/shared/hooks/usePlatformProjectId'

const EXPORT_SECTIONS = [
  {
    title: 'Identity',
    fields: [
      { key: 'title', label: 'Title' },
      { key: 'status', label: 'Status' },
      { key: 'project', label: 'Project' },
    ],
  },
  {
    title: 'Charter Content',
    fields: [
      { key: 'purpose', label: 'Purpose' },
      { key: 'objectives', label: 'Objectives' },
      { key: 'values', label: 'Team Values' },
      { key: 'ways_of_working', label: 'Ways of Working' },
      { key: 'norms', label: 'Team Norms' },
      { key: 'accountability', label: 'Accountability' },
      { key: 'communication_plan', label: 'Communication Plan' },
      { key: 'raci_notes', label: 'RACI Notes' },
    ],
  },
]

function Section({ title, content }) {
  if (!content) return null
  const lines = parseMultiLineValue(content)
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
      </div>
      <div className="px-5 py-4 text-sm text-gray-700 dark:text-gray-200 leading-relaxed">
        {lines.length > 1 ? (
          <ul className="list-disc pl-5 space-y-1">
            {lines.map((line, i) => (
              <li key={`${i}-${line.slice(0, 24)}`}>{line}</li>
            ))}
          </ul>
        ) : (
          <p className="whitespace-pre-wrap">{content}</p>
        )}
      </div>
    </div>
  )
}

export default function TeamCharterPage() {
  const {
    projectId,
    routeKey,
    loading: projectLoading,
  } = usePlatformProjectId()
  const navigate = useNavigate()
  const [charter, setCharter] = useState(null)
  const [loading, setLoading] = useState(true)

  const editPath = routeKey
    ? `/platform/team-charter/edit?projectId=${encodeURIComponent(routeKey)}`
    : '/platform/team-charter/edit'

  const exportRecord = useMemo(() => {
    if (!charter) return null
    return {
      title: charter.title || '',
      status: charter.status || '',
      project: routeKey || projectId || '',
      purpose: charter.purpose || '',
      objectives: charter.objectives || '',
      values: charter.values || '',
      ways_of_working: charter.ways_of_working || '',
      norms: charter.norms || '',
      accountability: charter.accountability || '',
      communication_plan: charter.communication_plan || '',
      raci_notes: charter.raci_notes || '',
    }
  }, [charter, routeKey, projectId])

  useEffect(() => {
    if (projectLoading) return
    if (!projectId) {
      setCharter(null)
      setLoading(false)
      return
    }
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const data = await getTeamCharter(projectId)
        if (!cancelled) setCharter(data)
      } catch (e) {
        if (!cancelled) toast.error(e?.message || 'Failed to load team charter')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [projectId, projectLoading])

  if (projectLoading || loading) {
    return (
      <div className="w-full px-3 sm:px-4 lg:px-5 xl:px-6 py-6 flex justify-center min-h-[40vh] items-center">
        <div className="h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="w-full px-3 sm:px-4 lg:px-5 xl:px-6 py-6 text-gray-900 dark:text-gray-100">
      <div className="max-w-3xl mx-auto space-y-5">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 min-h-[40px]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-500" />
              Team Charter
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {exportRecord && (
              <ExportRecordMenu
                sections={EXPORT_SECTIONS}
                record={exportRecord}
                baseFilename={`TeamCharter_${routeKey || projectId || 'record'}`}
              />
            )}
            {projectId && (
              <button
                type="button"
                onClick={() => navigate(editPath)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 px-3 py-2 text-sm font-medium text-white min-h-[40px]"
              >
                <FileEdit className="h-4 w-4" />
                {charter ? 'Edit Charter' : 'Create Charter'}
              </button>
            )}
          </div>
        </div>

        {!projectId ? (
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-6 py-8 text-center">
            <p className="text-gray-600 dark:text-gray-300 text-sm">
              No project selected. Open Team Charter from a project context to view it.
            </p>
          </div>
        ) : !charter ? (
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-6 py-12 text-center">
            <AlertCircle className="h-10 w-10 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 dark:text-gray-300 text-sm">
              No team charter has been created yet.
            </p>
            <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">
              A Team Lead or Project Manager can create the charter.
            </p>
          </div>
        ) : (
          <>
            <div className="rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5">
              <p className="text-blue-100 text-xs font-medium uppercase tracking-wide mb-1">
                Team Charter
              </p>
              <h2 className="text-xl font-bold text-white">{charter.title}</h2>
              <span
                className={`mt-2 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${
                  charter.status === 'active'
                    ? 'bg-emerald-900/40 text-emerald-200 border-emerald-600'
                    : charter.status === 'draft'
                      ? 'bg-amber-900/40 text-amber-200 border-amber-600'
                      : 'bg-gray-700 text-gray-200 border-gray-500'
                }`}
              >
                {charter.status}
              </span>
            </div>

            <Section title="Purpose" content={charter.purpose} />
            <Section title="Objectives" content={charter.objectives} />
            <Section title="Team Values" content={charter.values} />
            <Section title="Ways of Working" content={charter.ways_of_working} />
            <Section title="Team Norms" content={charter.norms} />
            <Section title="Accountability" content={charter.accountability} />
            <Section title="Communication Plan" content={charter.communication_plan} />
            <Section title="RACI Notes" content={charter.raci_notes} />
          </>
        )}
      </div>
    </div>
  )
}

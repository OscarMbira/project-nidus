import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAppRoutePrefix } from '../../hooks/useAppRoutePrefix'
import { getCurrentUserAccountId } from '../../utils/accountResolution'
import { listAllPendingForAccount } from '../../services/communications/meetingExtractionService'
import { listPendingForCurrentUser } from '../../services/sim/communications/simMeetingExtractionService'
import { useIsSimulator } from './useIsSimulator'
import ExportListMenu from '../../components/ui/ExportListMenu'

const COLS = [
  { key: 'ai_extracted_title', label: 'Title' },
  { key: 'status', label: 'Status' },
  { key: 'project_id', label: 'Project' },
]

export default function PendingAIReview() {
  const basePath = `${useAppRoutePrefix()}/comms`
  const isSim = useIsSimulator()
  const [issues, setIssues] = useState([])
  const [risks, setRisks] = useState([])

  useEffect(() => {
    ;(async () => {
      if (isSim) {
        const { issues: i, risks: r } = await listPendingForCurrentUser()
        setIssues(i || [])
        setRisks(r || [])
        return
      }
      const aid = await getCurrentUserAccountId()
      if (!aid) return
      const { issues: i, risks: r } = await listAllPendingForAccount(aid)
      setIssues(i || [])
      setRisks(r || [])
    })()
  }, [isSim])

  const exportRows = [...issues.map((x) => ({ ...x, kind: 'issue' })), ...risks.map((x) => ({ ...x, kind: 'risk' }))]

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex flex-wrap justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Pending AI reviews</h1>
        <ExportListMenu columns={[...COLS, { key: 'kind', label: 'Kind' }]} data={exportRows} baseFilename="AI_Extractions" disabled={!exportRows.length} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <section>
          <h2 className="font-semibold text-gray-900 dark:text-white mb-2">Issues</h2>
          <ul className="space-y-2">
            {issues.map((i) => (
              <li key={i.id} className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 bg-white dark:bg-gray-900">
                <p className="font-medium text-gray-900 dark:text-white">{i.ai_extracted_title}</p>
                <Link to={`${basePath}/review/${i.meeting_id}`} className="text-sm text-cyan-600">
                  Review meeting
                </Link>
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h2 className="font-semibold text-gray-900 dark:text-white mb-2">Risks</h2>
          <ul className="space-y-2">
            {risks.map((r) => (
              <li key={r.id} className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 bg-white dark:bg-gray-900">
                <p className="font-medium text-gray-900 dark:text-white">{r.ai_extracted_title}</p>
                <Link to={`${basePath}/review/${r.meeting_id}`} className="text-sm text-cyan-600">
                  Review meeting
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}

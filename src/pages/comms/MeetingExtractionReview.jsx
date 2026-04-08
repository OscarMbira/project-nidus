import { useParams, Link } from 'react-router-dom'
import { useEffect, useState, useCallback } from 'react'
import { useAppRoutePrefix } from '../../hooks/useAppRoutePrefix'
import { platformDb, simDb } from '../../services/supabase/supabaseClient'
import { useIsSimulator } from './useIsSimulator'
import ExtractedItemCard from '../../components/comms/ExtractedItemCard'
import EnrichmentModal from '../../components/comms/EnrichmentModal'
import ExtractionApproveSuccessModal from '../../components/comms/ExtractionApproveSuccessModal'
import {
  updateExtractedIssue,
  updateExtractedRisk,
  approveAndCreateIssue,
  approveAndCreateRisk,
} from '../../services/communications/meetingExtractionService'
import {
  updateSimExtractedIssue,
  updateSimExtractedRisk,
  approveAndCreatePracticeIssue,
  approveAndCreatePracticeRisk,
} from '../../services/sim/communications/simMeetingExtractionService'
import toast from 'react-hot-toast'

function buildExtractionViewHref({ isSim, kind, recordId, practiceProjectId, routePrefix }) {
  if (!recordId) return null
  if (isSim) {
    const q = practiceProjectId ? `?projectId=${encodeURIComponent(practiceProjectId)}` : ''
    return kind === 'issue'
      ? `/simulator/practice-issue-register/${recordId}${q}`
      : `/simulator/practice-risk-register/${recordId}${q}`
  }
  return kind === 'issue' ? `${routePrefix}/issues/${recordId}` : `${routePrefix}/risks/${recordId}`
}

export default function MeetingExtractionReview() {
  const { meetingId } = useParams()
  const routePrefix = useAppRoutePrefix()
  const basePath = `${routePrefix}/comms`
  const isSim = useIsSimulator()
  const [issues, setIssues] = useState([])
  const [risks, setRisks] = useState([])
  const [modal, setModal] = useState(null)
  const [successInfo, setSuccessInfo] = useState(null)

  const client = isSim ? simDb : platformDb
  const issueTable = 'comm_meeting_extracted_issues'
  const riskTable = 'comm_meeting_extracted_risks'

  const loadData = useCallback(async () => {
    const { data: i } = await client.from(issueTable).select('*').eq('meeting_id', meetingId)
    const { data: r } = await client.from(riskTable).select('*').eq('meeting_id', meetingId)
    setIssues(i || [])
    setRisks(r || [])
  }, [meetingId, client])

  useEffect(() => {
    loadData()
  }, [loadData])

  const onApproveIssue = (row) => {
    setModal({ type: 'issue', row })
  }

  const onApproveRisk = (row) => {
    setModal({ type: 'risk', row })
  }

  const submitModal = async ({ ownerUserId, dueDate }) => {
    const row = modal?.row
    const kind = modal?.type
    try {
      let created
      if (kind === 'issue') {
        created = isSim
          ? await approveAndCreatePracticeIssue(row, { ownerUserId, dueDate })
          : await approveAndCreateIssue(row, { ownerUserId, dueDate })
      } else if (kind === 'risk') {
        created = isSim
          ? await approveAndCreatePracticeRisk(row, { ownerUserId, dueDate })
          : await approveAndCreateRisk(row, { ownerUserId, dueDate })
      }
      setModal(null)
      if (created && (kind === 'issue' || kind === 'risk')) {
        const recordId = created.id
        const recordTitle = kind === 'issue' ? created.issue_title : created.risk_title
        const viewHref = buildExtractionViewHref({
          isSim,
          kind,
          recordId,
          practiceProjectId: row?.practice_project_id,
          routePrefix,
        })
        setSuccessInfo({ kind, recordId, recordTitle, viewHref })
      }
      await loadData()
    } catch (e) {
      toast.error(e.message || String(e))
    }
  }

  const handleRejectIssue = async (row) => {
    try {
      if (isSim) {
        const { error } = await updateSimExtractedIssue(row.id, { status: 'rejected' })
        if (error) throw error
      } else {
        const { error } = await updateExtractedIssue(row.id, { status: 'rejected' })
        if (error) throw error
      }
      toast.success('Item rejected')
      await loadData()
    } catch (e) {
      toast.error(e.message || String(e))
    }
  }

  const handleEnrichIssue = async (row) => {
    try {
      if (isSim) {
        const { error } = await updateSimExtractedIssue(row.id, { status: 'enriched' })
        if (error) throw error
      } else {
        const { error } = await updateExtractedIssue(row.id, { status: 'enriched' })
        if (error) throw error
      }
      toast.success('Marked for enrichment')
      await loadData()
    } catch (e) {
      toast.error(e.message || String(e))
    }
  }

  const handleRejectRisk = async (row) => {
    try {
      if (isSim) {
        const { error } = await updateSimExtractedRisk(row.id, { status: 'rejected' })
        if (error) throw error
      } else {
        const { error } = await updateExtractedRisk(row.id, { status: 'rejected' })
        if (error) throw error
      }
      toast.success('Item rejected')
      await loadData()
    } catch (e) {
      toast.error(e.message || String(e))
    }
  }

  const handleEnrichRisk = async (row) => {
    try {
      if (isSim) {
        const { error } = await updateSimExtractedRisk(row.id, { status: 'enriched' })
        if (error) throw error
      } else {
        const { error } = await updateExtractedRisk(row.id, { status: 'enriched' })
        if (error) throw error
      }
      toast.success('Marked for enrichment')
      await loadData()
    } catch (e) {
      toast.error(e.message || String(e))
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <Link to={`${basePath}/pending-review`} className="text-sm text-cyan-600">
        ← Pending reviews
      </Link>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Meeting extraction</h1>
      <div className="space-y-4">
        {issues.map((row) => (
          <ExtractedItemCard
            key={row.id}
            type="issue"
            title={row.ai_extracted_title}
            description={row.ai_extracted_desc}
            quote={row.source_quote}
            onApprove={() => onApproveIssue(row)}
            onReject={() => handleRejectIssue(row)}
            onEnrich={() => handleEnrichIssue(row)}
          />
        ))}
        {risks.map((row) => (
          <ExtractedItemCard
            key={row.id}
            type="risk"
            title={row.ai_extracted_title}
            description={row.ai_extracted_desc}
            quote={row.source_quote}
            onApprove={() => onApproveRisk(row)}
            onReject={() => handleRejectRisk(row)}
            onEnrich={() => handleEnrichRisk(row)}
          />
        ))}
      </div>
      <EnrichmentModal open={!!modal} onClose={() => setModal(null)} onSubmit={submitModal} title="Approve & create" />
      <ExtractionApproveSuccessModal
        open={!!successInfo}
        onClose={() => setSuccessInfo(null)}
        kind={successInfo?.kind}
        recordId={successInfo?.recordId}
        recordTitle={successInfo?.recordTitle}
        viewHref={successInfo?.viewHref}
      />
    </div>
  )
}

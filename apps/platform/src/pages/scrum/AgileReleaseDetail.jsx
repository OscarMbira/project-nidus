import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { usePlatformProjectId } from '@nidus/shared/hooks/usePlatformProjectId.js'
import { resolveEntityId } from '@nidus/shared/utils/entityRouteParam'
import { isLikelyDatabaseUuid } from '@nidus/shared/utils/isUuid'
import { platformProjectPath } from '@nidus/shared/utils/projectRouteParam'
import { getRelease, listReleaseStories, linkStoryToRelease } from '../../services/agileReleaseService'
import { supabase } from '../../services/supabaseClient'
import DetailAuditTabList from '@nidus/ui/DetailAuditTabList'
import AuditDetailsPanel from '@nidus/ui/AuditDetailsPanel'
import AuditCard from '@nidus/ui/AuditCard'
import AuditField from '@nidus/ui/AuditField'
import AuditTimestampPair from '@nidus/ui/AuditTimestampPair'
import { humanizeAuditToken } from '@nidus/shared/utils/auditDisplayUtils'

import { getDisplayRowNumber } from '@nidus/shared/utils/tableRowNumberUtils'
export default function AgileReleaseDetail() {
  const { releaseId } = useParams()
  const { projectId, routeKey, loading: pidLoading, error: pidErr } = usePlatformProjectId()
  const navigate = useNavigate()
  const [rel, setRel] = useState(null)
  const [stories, setStories] = useState([])
  const [backlog, setBacklog] = useState([])
  const [pick, setPick] = useState('')
  const [activeTab, setActiveTab] = useState('details')
  const [resolvedReleaseId, setResolvedReleaseId] = useState(null)

  useEffect(() => {
    if (!releaseId || !projectId) return
    let cancelled = false
    ;(async () => {
      try {
        const resolvedId = isLikelyDatabaseUuid(releaseId)
          ? releaseId
          : await resolveEntityId('agileRelease', releaseId, projectId)
        if (!resolvedId || cancelled) return
        setResolvedReleaseId(resolvedId)
        const r = await getRelease(resolvedId)
        if (!cancelled) setRel(r)
        const rs = await listReleaseStories(resolvedId)
        if (!cancelled) setStories(rs)
        if (!cancelled && r?.release_reference && r.release_reference !== releaseId) {
          navigate(platformProjectPath(routeKey, 'scrum', 'releases', r.release_reference), { replace: true })
        }
      } catch (e) {
        toast.error(e?.message || 'Failed')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [releaseId, projectId])

  useEffect(() => {
    if (!projectId) return
    let cancelled = false
    ;(async () => {
      const { data, error } = await supabase
        .from('user_stories')
        .select('id, story_title, story_points, status')
        .eq('project_id', projectId)
        .eq('is_deleted', false)
      if (error || cancelled) return
      setBacklog(data || [])
    })()
    return () => {
      cancelled = true
    }
  }, [projectId])

  const link = async () => {
    if (!pick) return
    try {
      const id = resolvedReleaseId || releaseId
      await linkStoryToRelease(id, pick)
      toast.success('Story linked to release')
      const rs = await listReleaseStories(id)
      setStories(rs)
    } catch (e) {
      toast.error(e?.message || 'Failed')
    }
  }

  const totalPts = stories.reduce((s, x) => s + (Number(x.user_stories?.story_points) || 0), 0)
  const donePts = stories
    .filter((x) => x.user_stories?.status === 'done')
    .reduce((s, x) => s + (Number(x.user_stories?.story_points) || 0), 0)

  if (pidLoading) {
    return <div className="min-h-screen bg-gray-950 text-gray-300 flex items-center justify-center">Loading…</div>
  }
  if (pidErr === 'not_found' || !projectId) {
    return <div className="min-h-screen bg-gray-950 p-6 text-gray-300">Project not found.</div>
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-4 md:p-8">
      <button type="button" onClick={() => navigate(-1)} className="text-sm text-blue-400 mb-4">
        ← Back
      </button>
      <h1 className="text-2xl font-bold text-white mb-2">{rel?.release_name || 'Release'}</h1>
      <p className="text-gray-400 text-sm mb-4">{rel?.release_goal}</p>

      <div className="mb-4">
        <DetailAuditTabList activeTab={activeTab} onChange={setActiveTab} />
      </div>

      {activeTab === 'audit' ? (
        <div className="max-w-lg">
          {!rel ? (
            <p className="text-sm text-gray-400">Audit details appear after this release is saved.</p>
          ) : (
            <AuditDetailsPanel description="How this release is classified, and when it was created.">
              <AuditCard title="Identity" description="How this release is labelled and tracked.">
                <AuditField label="Name" value={rel.release_name} />
                <AuditField label="Status" value={humanizeAuditToken(rel.status)} />
              </AuditCard>
              <AuditCard title="Classification" description="How this release is scoped.">
                <AuditField label="Goal" value={rel.release_goal} />
              </AuditCard>
              <AuditCard title="Record history" description="When this release was created and last changed.">
                <AuditTimestampPair dateLabel="Created at" value={rel.created_at} />
                <AuditTimestampPair dateLabel="Last updated" value={rel.updated_at} />
              </AuditCard>
            </AuditDetailsPanel>
          )}
        </div>
      ) : (
      <>
      <div className="grid grid-cols-2 gap-4 mb-6 max-w-lg">
        <div className="rounded border border-gray-800 bg-gray-900 p-3">
          <div className="text-xs text-gray-500">Points done / total</div>
          <div className="text-xl font-semibold">
            {donePts} / {totalPts}
          </div>
        </div>
        <div className="rounded border border-gray-800 bg-gray-900 p-3">
          <div className="text-xs text-gray-500">Stories</div>
          <div className="text-xl font-semibold">{stories.length}</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <select value={pick} onChange={(e) => setPick(e.target.value)} className="rounded border border-gray-700 bg-gray-900 px-2 py-1 text-sm">
          <option value="">Link story from backlog…</option>
          {backlog.map((b, index) => (
            <option key={b.id} value={b.id}>
              {b.story_title} ({b.story_points ?? 0} pts)
            </option>
          ))}
        </select>
        <button type="button" onClick={link} className="px-3 py-1 rounded bg-blue-600 text-sm">
          Link
        </button>
      </div>

      <ul className="space-y-2">
        {stories.map((x) => (
          <li key={x.id} className="rounded border border-gray-800 p-3 text-sm">
            {x.user_stories?.story_title || x.user_story_id}
          </li>
        ))}
      </ul>
      </>
      )}
    </div>
  )
}

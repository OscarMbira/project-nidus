/**
 * Practice Brief Edit Page
 */

import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { getPracticeBriefById, updatePracticeBrief } from '../../services/sim/practiceBriefService'
import { simDb } from '@nidus/supabase'
import DetailAuditTabList from '@nidus/ui/DetailAuditTabList'
import AuditDetailsPanel from '@nidus/ui/AuditDetailsPanel'
import AuditCard from '@nidus/ui/AuditCard'
import AuditField from '@nidus/ui/AuditField'
import AuditTimestampPair from '@nidus/ui/AuditTimestampPair'
import { resolveAuditUserLabels } from '@nidus/shared/utils/auditDisplayUtils'

export default function PracticeBriefEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const projectId = searchParams.get('projectId')
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    brief_title: '',
    brief_description: '',
    project_definition: '',
    project_scope: ''
  })
  const [record, setRecord] = useState(null)
  const [formTab, setFormTab] = useState('details')
  const [auditUserLabels, setAuditUserLabels] = useState({})

  useEffect(() => {
    if (id) loadBrief()
  }, [id])

  useEffect(() => {
    if (formTab !== 'audit' || !record) return
    (async () => {
      const labels = await resolveAuditUserLabels(simDb, [record.created_by, record.updated_by])
      setAuditUserLabels(labels || {})
    })()
  }, [formTab, record])

  const loadBrief = async () => {
    try {
      setLoading(true)
      const result = await getPracticeBriefById(id)
      if (result.success) { setFormData(result.data); setRecord(result.data) }
    } catch (error) {
      console.error('Error loading brief:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      setLoading(true)
      const result = await updatePracticeBrief(id, formData)
      if (result.success) {
        navigate(`/simulator/practice-briefs/${id}?projectId=${projectId}`)
      } else {
        alert('Error: ' + result.error)
      }
    } catch (error) {
      console.error('Error updating brief:', error)
      alert('Error: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button onClick={() => navigate(`/simulator/practice-briefs/${id}?projectId=${projectId}`)} className="mb-4 inline-flex items-center text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="h-4 w-4 mr-2" /> Back
      </button>
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Edit Practice Brief</h1>
      <DetailAuditTabList activeTab={formTab} onChange={setFormTab} />
      {formTab === 'audit' ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          {!record ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">Audit details appear after this brief is saved.</p>
          ) : (
            <AuditDetailsPanel description="Who created or changed this Project Brief.">
              <AuditCard title="Identity" description="How this brief is labelled.">
                <AuditField label="Title" value={record.brief_title} />
              </AuditCard>
              <AuditCard title="Classification" description="Approval status.">
                <AuditField label="Approved" value={record.is_approved ? 'Yes' : 'No'} />
              </AuditCard>
              <AuditCard title="Record history" description="When this brief was created and last changed.">
                <AuditField label="Created by" value={record.created_by ? auditUserLabels[record.created_by] || null : null} />
                <AuditTimestampPair dateLabel="Created at" value={record.created_at} />
                <AuditField label="Updated by" value={record.updated_by ? auditUserLabels[record.updated_by] || null : null} />
                <AuditTimestampPair dateLabel="Last updated" value={record.updated_at} />
              </AuditCard>
            </AuditDetailsPanel>
          )}
        </div>
      ) : (
      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">Brief Title *</label>
          <input type="text" required value={formData.brief_title} onChange={(e) => setFormData({ ...formData, brief_title: e.target.value })} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Description</label>
          <textarea value={formData.brief_description} onChange={(e) => setFormData({ ...formData, brief_description: e.target.value })} rows={4} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700" />
        </div>
        <div className="flex justify-end gap-4">
          <button type="button" onClick={() => navigate(`/simulator/practice-briefs/${id}?projectId=${projectId}`)} className="px-4 py-2 border rounded-lg">Cancel</button>
          <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50">{loading ? 'Saving...' : 'Save'}</button>
        </div>
      </form>
      )}
    </div>
  )
}

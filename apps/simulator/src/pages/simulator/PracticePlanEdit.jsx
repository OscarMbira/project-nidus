/**
 * Practice Plan Edit Page
 */

import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { getPracticePlan, updatePracticePlan } from '../../services/sim/practicePlanService'
import { simDb } from '@nidus/supabase'
import DetailAuditTabList from '@nidus/ui/DetailAuditTabList'
import AuditDetailsPanel from '@nidus/ui/AuditDetailsPanel'
import AuditCard from '@nidus/ui/AuditCard'
import AuditField from '@nidus/ui/AuditField'
import AuditTimestampPair from '@nidus/ui/AuditTimestampPair'
import { humanizeAuditToken, resolveAuditUserLabels } from '@nidus/shared/utils/auditDisplayUtils'

export default function PracticePlanEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const projectId = searchParams.get('projectId')
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    plan_title: '',
    plan_purpose: '',
    plan_scope: ''
  })
  const [record, setRecord] = useState(null)
  const [formTab, setFormTab] = useState('details')
  const [auditUserLabels, setAuditUserLabels] = useState({})

  useEffect(() => {
    if (id) loadPlan()
  }, [id])

  useEffect(() => {
    if (formTab !== 'audit' || !record) return
    (async () => {
      const labels = await resolveAuditUserLabels(simDb, [record.created_by, record.updated_by])
      setAuditUserLabels(labels || {})
    })()
  }, [formTab, record])

  const loadPlan = async () => {
    try {
      setLoading(true)
      const result = await getPracticePlan(projectId)
      if (result.success && result.data) { setFormData(result.data); setRecord(result.data) }
    } catch (error) {
      console.error('Error loading plan:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      setLoading(true)
      const result = await updatePracticePlan(id, formData)
      if (result.success) {
        navigate(`/simulator/practice-plans/${id}?projectId=${projectId}`)
      } else {
        alert('Error: ' + result.error)
      }
    } catch (error) {
      console.error('Error updating plan:', error)
      alert('Error: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button onClick={() => navigate(`/simulator/practice-plans/${id}?projectId=${projectId}`)} className="mb-4 inline-flex items-center text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="h-4 w-4 mr-2" /> Back
      </button>
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Edit Practice Plan</h1>
      <DetailAuditTabList activeTab={formTab} onChange={setFormTab} />
      {formTab === 'audit' ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          {!record ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">Audit details appear after this plan is saved.</p>
          ) : (
            <AuditDetailsPanel description="Who created or changed this Project Plan.">
              <AuditCard title="Identity" description="How this plan is labelled.">
                <AuditField label="Title" value={record.plan_title} />
                <AuditField label="Reference" value={record.plan_reference} />
              </AuditCard>
              <AuditCard title="Classification" description="Where this plan sits.">
                <AuditField label="Status" value={humanizeAuditToken(record.status)} />
                <AuditField label="Baseline" value={record.is_baseline ? 'Yes' : 'No'} />
              </AuditCard>
              <AuditCard title="Record history" description="When this plan was created and last changed.">
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
          <label className="block text-sm font-medium mb-2">Plan Title *</label>
          <input type="text" required value={formData.plan_title} onChange={(e) => setFormData({ ...formData, plan_title: e.target.value })} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Plan Purpose *</label>
          <textarea required value={formData.plan_purpose} onChange={(e) => setFormData({ ...formData, plan_purpose: e.target.value })} rows={4} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700" />
        </div>
        <div className="flex justify-end gap-4">
          <button type="button" onClick={() => navigate(`/simulator/practice-plans/${id}?projectId=${projectId}`)} className="px-4 py-2 border rounded-lg">Cancel</button>
          <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50">{loading ? 'Saving...' : 'Save'}</button>
        </div>
      </form>
      )}
    </div>
  )
}

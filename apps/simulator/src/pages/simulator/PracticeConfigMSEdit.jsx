/**
 * Practice Config MS Edit Page
 */

import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { getPracticeConfigMS, updatePracticeConfigMS } from '../../services/sim/practiceConfigMSService'
import { simDb } from '@nidus/supabase'
import DetailAuditTabList from '@nidus/ui/DetailAuditTabList'
import AuditDetailsPanel from '@nidus/ui/AuditDetailsPanel'
import AuditCard from '@nidus/ui/AuditCard'
import AuditField from '@nidus/ui/AuditField'
import AuditTimestampPair from '@nidus/ui/AuditTimestampPair'
import { humanizeAuditToken, resolveAuditUserLabels } from '@nidus/shared/utils/auditDisplayUtils'

export default function PracticeConfigMSEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const projectId = searchParams.get('projectId')
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    purpose: '',
    objectives: '',
    scope: ''
  })
  const [record, setRecord] = useState(null)
  const [formTab, setFormTab] = useState('details')
  const [auditUserLabels, setAuditUserLabels] = useState({})

  useEffect(() => {
    if (id) loadConfigMS()
  }, [id])

  useEffect(() => {
    if (formTab !== 'audit' || !record) return
    (async () => {
      const labels = await resolveAuditUserLabels(simDb, [record.created_by])
      setAuditUserLabels(labels || {})
    })()
  }, [formTab, record])

  const loadConfigMS = async () => {
    try {
      setLoading(true)
      const result = await getPracticeConfigMS(projectId)
      if (result.success && result.data) { setFormData(result.data); setRecord(result.data) }
    } catch (error) {
      console.error('Error loading Config MS:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      setLoading(true)
      const result = await updatePracticeConfigMS(id, formData)
      if (result.success) {
        navigate(`/simulator/practice-config-ms/${id}?projectId=${projectId}`)
      } else {
        alert('Error: ' + result.error)
      }
    } catch (error) {
      console.error('Error updating Config MS:', error)
      alert('Error: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button onClick={() => navigate(`/simulator/practice-config-ms/${id}?projectId=${projectId}`)} className="mb-4 inline-flex items-center text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="h-4 w-4 mr-2" /> Back
      </button>
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Edit Practice Config MS</h1>
      <DetailAuditTabList activeTab={formTab} onChange={setFormTab} />
      {formTab === 'audit' ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          {!record ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">Audit details appear after this strategy is saved.</p>
          ) : (
            <AuditDetailsPanel description="Who created or changed this Configuration Management Strategy.">
              <AuditCard title="Identity" description="How this strategy is labelled.">
                <AuditField label="Reference" value={record.cfgms_reference} />
              </AuditCard>
              <AuditCard title="Classification" description="Where this strategy sits.">
                <AuditField label="Status" value={humanizeAuditToken(record.status)} />
                <AuditField label="Version" value={record.version_number} />
              </AuditCard>
              <AuditCard title="Record history" description="When this strategy was created and last changed.">
                <AuditField label="Created by" value={record.created_by ? auditUserLabels[record.created_by] || null : null} />
                <AuditTimestampPair dateLabel="Created at" value={record.created_at} />
                <AuditTimestampPair dateLabel="Last updated" value={record.updated_at} />
              </AuditCard>
            </AuditDetailsPanel>
          )}
        </div>
      ) : (
      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">Purpose</label>
          <textarea value={formData.purpose} onChange={(e) => setFormData({ ...formData, purpose: e.target.value })} rows={4} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700" />
        </div>
        <div className="flex justify-end gap-4">
          <button type="button" onClick={() => navigate(`/simulator/practice-config-ms/${id}?projectId=${projectId}`)} className="px-4 py-2 border rounded-lg">Cancel</button>
          <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50">{loading ? 'Saving...' : 'Save'}</button>
        </div>
      </form>
      )}
    </div>
  )
}

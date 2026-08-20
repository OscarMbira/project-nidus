/**
 * Practice Work Package Edit Page
 */

import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { simDb } from '@nidus/supabase'
import { getCurrentUserAccountId } from '@nidus/shared/utils/accountResolution'
import { getPracticeWorkPackageById, updatePracticeWorkPackage } from '../../services/sim/practiceWorkPackageService'
import TierFieldCustomisationPanel from '@nidus/ui/TierFieldCustomisationPanel.jsx'
import InheritedWorkPackageFields, {
  WORK_PACKAGE_CATEGORY,
} from '../../features/local-data-extensions/components/InheritedWorkPackageFields'
import DetailAuditTabList from '@nidus/ui/DetailAuditTabList'
import AuditDetailsPanel from '@nidus/ui/AuditDetailsPanel'
import AuditCard from '@nidus/ui/AuditCard'
import AuditField from '@nidus/ui/AuditField'
import AuditTimestampPair from '@nidus/ui/AuditTimestampPair'
import { humanizeAuditToken, resolveAuditUserLabels } from '@nidus/shared/utils/auditDisplayUtils'

export default function PracticeWorkPackageEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const projectId = searchParams.get('projectId')
  const [accountId, setAccountId] = useState(null)
  const [projectName, setProjectName] = useState(null)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    work_package_name: '',
    work_package_description: '',
    objectives: '',
    quality_criteria: '',
    acceptance_criteria: ''
  })
  const [record, setRecord] = useState(null)
  const [formTab, setFormTab] = useState('details')
  const [auditUserLabels, setAuditUserLabels] = useState({})

  useEffect(() => {
    if (id) loadWorkPackage()
  }, [id])

  useEffect(() => {
    if (formTab !== 'audit' || !record) return
    (async () => {
      const labels = await resolveAuditUserLabels(simDb, [record.created_by, record.updated_by])
      setAuditUserLabels(labels || {})
    })()
  }, [formTab, record])

  useEffect(() => {
    if (!projectId) {
      setAccountId(null)
      setProjectName(null)
      return
    }
    let cancelled = false
    getCurrentUserAccountId().then((aid) => {
      if (!cancelled) setAccountId(aid)
    })
    simDb
      .from('practice_projects')
      .select('project_name')
      .eq('id', projectId)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setProjectName(data?.project_name || null)
      })
    return () => { cancelled = true }
  }, [projectId])

  const loadWorkPackage = async () => {
    try {
      setLoading(true)
      const result = await getPracticeWorkPackageById(id)
      if (result.success) { setFormData(result.data); setRecord(result.data) }
    } catch (error) {
      console.error('Error loading work package:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      setLoading(true)
      const result = await updatePracticeWorkPackage(id, formData)
      if (result.success) {
        navigate(`/simulator/practice-work-packages/${id}?projectId=${projectId}`)
      } else {
        alert('Error: ' + result.error)
      }
    } catch (error) {
      console.error('Error updating work package:', error)
      alert('Error: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button onClick={() => navigate(`/simulator/practice-work-packages/${id}?projectId=${projectId}`)} className="mb-4 inline-flex items-center text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="h-4 w-4 mr-2" /> Back
      </button>
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Edit Practice Work Package</h1>
      <DetailAuditTabList activeTab={formTab} onChange={setFormTab} />
      {formTab === 'audit' ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          {!record ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">Audit details appear after this work package is saved.</p>
          ) : (
            <AuditDetailsPanel description="Who created or changed this work package.">
              <AuditCard title="Identity" description="How this work package is labelled.">
                <AuditField label="Name" value={record.work_package_name} />
                <AuditField label="Code" value={record.work_package_code} />
              </AuditCard>
              <AuditCard title="Classification" description="Where this work package sits.">
                <AuditField label="Status" value={humanizeAuditToken(record.status)} />
              </AuditCard>
              <AuditCard title="Record history" description="When this work package was created and last changed.">
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
          <label className="block text-sm font-medium mb-2">Work Package Name *</label>
          <input type="text" required value={formData.work_package_name} onChange={(e) => setFormData({ ...formData, work_package_name: e.target.value })} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</label>
          <textarea value={formData.work_package_description || ''} onChange={(e) => setFormData({ ...formData, work_package_description: e.target.value })} rows={4} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
        </div>
        {id && accountId && projectId && (
          <InheritedWorkPackageFields
            db={simDb}
            accountId={accountId}
            projectId={projectId}
            practiceProjectId={projectId}
            workPackageId={id}
            mode="edit"
          />
        )}
        {accountId && projectId && (
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Work package field templates
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Inherit fields from PMO / portfolio / programme defaults for this practice project.
            </p>
            <TierFieldCustomisationPanel
              db={simDb}
              accountId={accountId}
              tier="project"
              entityType="project"
              entityId={projectId}
              entityName={projectName || 'Project'}
              category={WORK_PACKAGE_CATEGORY}
            />
          </div>
        )}
        <div className="flex justify-end gap-4">
          <button type="button" onClick={() => navigate(`/simulator/practice-work-packages/${id}?projectId=${projectId}`)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300">Cancel</button>
          <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50">{loading ? 'Saving...' : 'Save'}</button>
        </div>
      </form>
      )}
    </div>
  )
}

/**
 * Project Plan View Component
 * Read-only view with tabs for all sections
 */

import { useState, useEffect } from 'react'
import { FileText, Target, Calendar, DollarSign, Users, Shield, Award, History, CheckCircle, Download } from 'lucide-react'
import { RowActionButton } from '@nidus/ui'
import DetailAuditTabList from '@nidus/ui/DetailAuditTabList'
import AuditDetailsPanel from '@nidus/ui/AuditDetailsPanel'
import AuditCard from '@nidus/ui/AuditCard'
import AuditField from '@nidus/ui/AuditField'
import AuditTimestampPair from '@nidus/ui/AuditTimestampPair'
import { humanizeAuditToken, resolveAuditUserLabels } from '@nidus/shared/utils/auditDisplayUtils'
import { platformDb } from '../../services/supabase/supabaseClient'
import { useThemeContext } from '@nidus/shared/context/ThemeContext'
import { getProjectPlanById, getRevisionHistory } from '../../services/projectPlanService'
import { getMilestones } from '../../services/planMilestoneService'
import { getResources } from '../../services/planResourceService'
import ProjectPlanOverviewSection from './ProjectPlanOverviewSection'
import ProjectPlanApproachSection from './ProjectPlanApproachSection'
import ProjectPlanScheduleSection from './ProjectPlanScheduleSection'
import ProjectPlanBudgetSection from './ProjectPlanBudgetSection'
import ProjectPlanResourceSection from './ProjectPlanResourceSection'
import ProjectPlanRiskSection from './ProjectPlanRiskSection'
import ProjectPlanQualitySection from './ProjectPlanQualitySection'
import PlanApprovalSection from './PlanApprovalSection'
import PlanRevisionHistorySection from './PlanRevisionHistorySection'
import ExportRecordButtons from '../ui/ExportRecordButtons'
import { exportRecordToExcel, exportRecordToWord, exportRecordToPPT, exportRecordToCSV, exportRecordToXML, exportRecordToJSON, exportRecordToPrint } from '@nidus/shared/utils/exportUtils'

const PROJECT_PLAN_SECTIONS = [
  { title: 'Plan', fields: [
    { key: 'plan_reference', label: 'Reference' },
    { key: 'plan_title', label: 'Title' },
    { key: 'status', label: 'Status' },
    { key: 'version_number', label: 'Version' }
  ]}
]

const TABS = [
  { id: 'overview', label: 'Overview', icon: FileText },
  { id: 'approach', label: 'Approach', icon: Target },
  { id: 'schedule', label: 'Schedule', icon: Calendar },
  { id: 'budget', label: 'Budget', icon: DollarSign },
  { id: 'resources', label: 'Resources', icon: Users },
  { id: 'risks', label: 'Risks & Quality', icon: Shield },
  { id: 'approvals', label: 'Approvals', icon: CheckCircle },
  { id: 'history', label: 'History', icon: History },
]

const VIEW_TABS = [...TABS.map((t) => ({ value: t.id, label: t.label })), { value: 'audit', label: 'Audit details' }]

export default function ProjectPlanView({ planId, onEdit, onExport }) {
  const { theme } = useThemeContext()
  const [activeTab, setActiveTab] = useState('overview')
  const [plan, setPlan] = useState(null)
  const [milestones, setMilestones] = useState([])
  const [resources, setResources] = useState([])
  const [revisionHistory, setRevisionHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [auditUserLabels, setAuditUserLabels] = useState({})

  useEffect(() => {
    if (planId) {
      loadPlan()
    }
  }, [planId])

  useEffect(() => {
    if (activeTab !== 'audit' || !plan) return
    let cancelled = false
    ;(async () => {
      const labels = await resolveAuditUserLabels(platformDb, [plan.created_by, plan.updated_by])
      if (!cancelled) setAuditUserLabels(labels || {})
    })()
    return () => { cancelled = true }
  }, [activeTab, plan])

  const loadPlan = async () => {
    try {
      setLoading(true)
      const result = await getProjectPlanById(planId)
      if (result.success) {
        setPlan(result.data)
        
        const milestonesResult = await getMilestones(planId, 'project_plan')
        if (milestonesResult.success) {
          setMilestones(milestonesResult.data || [])
        }
        
        const resourcesResult = await getResources(planId, 'project_plan')
        if (resourcesResult.success) {
          setResources(resourcesResult.data || [])
        }
        
        const historyResult = await getRevisionHistory(planId)
        if (historyResult.success) {
          setRevisionHistory(historyResult.data || [])
        }
      }
    } catch (error) {
      console.error('Error loading plan:', error)
      alert('Error loading plan: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading plan...</p>
        </div>
      </div>
    )
  }

  if (!plan) {
    return (
      <div className="text-center p-8">
        <p className="text-gray-600 dark:text-gray-400">Plan not found</p>
      </div>
    )
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <ProjectPlanOverviewSection formData={plan} onChange={() => {}} errors={{}} mode="view" projectId={plan.project_id} />
      case 'approach':
        return <ProjectPlanApproachSection formData={plan} onChange={() => {}} errors={{}} mode="view" />
      case 'schedule':
        return <ProjectPlanScheduleSection formData={plan} onChange={() => {}} errors={{}} milestones={milestones} setMilestones={() => {}} planId={planId} mode="view" />
      case 'budget':
        return <ProjectPlanBudgetSection formData={plan} onChange={() => {}} errors={{}} mode="view" />
      case 'resources':
        return <ProjectPlanResourceSection formData={plan} onChange={() => {}} resources={resources} setResources={() => {}} planId={planId} mode="view" />
      case 'risks':
        return (
          <>
            <ProjectPlanRiskSection formData={plan} onChange={() => {}} mode="view" projectId={plan.project_id} />
            <div className="mt-6">
              <ProjectPlanQualitySection formData={plan} onChange={() => {}} mode="view" projectId={plan.project_id} />
            </div>
          </>
        )
      case 'approvals':
        return <PlanApprovalSection planId={planId} planType="project_plan" />
      case 'history':
        return <PlanRevisionHistorySection revisionHistory={revisionHistory} />
      case 'audit':
        return (
          <AuditDetailsPanel description="Who created or changed this project plan, and how it is classified.">
            <AuditCard title="Identity" description="How this plan is labelled and tracked.">
              <AuditField label="Reference" value={plan.plan_reference} />
              <AuditField label="Title" value={plan.plan_title} />
              <AuditField label="Status" value={humanizeAuditToken(plan.status)} />
            </AuditCard>
            <AuditCard title="Classification" description="Where this plan sits.">
              <AuditField label="Project" value={plan.project?.project_name} />
              <AuditField label="Author" value={plan.author?.full_name || plan.author?.email} />
              <AuditField label="Owner" value={plan.owner?.full_name || plan.owner?.email} />
            </AuditCard>
            <AuditCard title="Record history" description="When this plan was created and last changed.">
              <AuditField label="Created by" value={plan.created_by ? auditUserLabels[plan.created_by] || null : null} />
              <AuditTimestampPair dateLabel="Created at" value={plan.created_at} />
              <AuditField label="Updated by" value={plan.updated_by ? auditUserLabels[plan.updated_by] || null : null} />
              <AuditTimestampPair dateLabel="Last updated" value={plan.updated_at} />
            </AuditCard>
          </AuditDetailsPanel>
        )
      default:
        return null
    }
  }

  return (
    <div className={`${theme === 'dark' ? 'dark' : ''} bg-white dark:bg-gray-900 min-h-screen`}>
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {plan.plan_title || 'Project Plan'}
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {plan.plan_reference} • Version {plan.version_number} • {plan.status}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <ExportRecordButtons
              onExportPPT={() => exportRecordToPPT(PROJECT_PLAN_SECTIONS, plan, `ProjectPlan_${plan.plan_reference || plan.id}`)}
              onExportWord={() => exportRecordToWord(PROJECT_PLAN_SECTIONS, plan, `ProjectPlan_${plan.plan_reference || plan.id}`)}
              onExportExcel={() => exportRecordToExcel(PROJECT_PLAN_SECTIONS, plan, `ProjectPlan_${plan.plan_reference || plan.id}`)}
              onExportCSV={() => exportRecordToCSV(PROJECT_PLAN_SECTIONS, plan, `ProjectPlan_${plan.plan_reference || plan.id}`)}
              onExportXML={() => exportRecordToXML(PROJECT_PLAN_SECTIONS, plan, `ProjectPlan_${plan.plan_reference || plan.id}`)}
              onExportJSON={() => exportRecordToJSON(PROJECT_PLAN_SECTIONS, plan, `ProjectPlan_${plan.plan_reference || plan.id}`)}
              onExportPrint={() => exportRecordToPrint(PROJECT_PLAN_SECTIONS, plan, `ProjectPlan_${plan.plan_reference || plan.id}`)}
            />
            {onExport && (
              <button
                onClick={() => onExport(plan)}
                className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </button>
            )}
            {onEdit && plan.status !== 'baseline' && (
              <RowActionButton variant="edit" label="Edit plan" onClick={() => onEdit(plan)} />
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <DetailAuditTabList tabs={VIEW_TABS} activeTab={activeTab} onChange={setActiveTab} />
        </div>

        {/* Content */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          {renderTabContent()}
        </div>
      </div>
    </div>
  )
}

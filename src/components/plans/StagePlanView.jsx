/**
 * Stage Plan View Component
 * Read-only view with tabs for all sections
 */

import { useState, useEffect } from 'react'
import { FileText, Calendar, DollarSign, Users, Package, Shield, History, CheckCircle, Edit, Download } from 'lucide-react'
import { useThemeContext } from '../../context/ThemeContext'
import { getStagePlanById, getRevisionHistory } from '../../services/stagePlanService'
import { getMilestones } from '../../services/planMilestoneService'
import { getResources } from '../../services/planResourceService'
import { getProducts } from '../../services/stagePlanProductService'
import StagePlanOverviewSection from './StagePlanOverviewSection'
import StagePlanScheduleSection from './StagePlanScheduleSection'
import StagePlanBudgetSection from './StagePlanBudgetSection'
import StagePlanResourceSection from './StagePlanResourceSection'
import StagePlanProductsSection from './StagePlanProductsSection'
import StagePlanRiskSection from './StagePlanRiskSection'
import PlanApprovalSection from './PlanApprovalSection'
import PlanRevisionHistorySection from './PlanRevisionHistorySection'
import PlanVarianceAnalysis from './PlanVarianceAnalysis'
import ExportRecordButtons from '../ui/ExportRecordButtons'
import { exportRecordToExcel, exportRecordToWord, exportRecordToPPT, exportRecordToCSV, exportRecordToXML, exportRecordToJSON, exportRecordToPrint } from '../../utils/exportUtils'

const STAGE_PLAN_SECTIONS = [
  { title: 'Plan', fields: [
    { key: 'plan_reference', label: 'Reference' },
    { key: 'plan_title', label: 'Title' },
    { key: 'status', label: 'Status' },
    { key: 'version_number', label: 'Version' }
  ]}
]

const TABS = [
  { id: 'overview', label: 'Overview', icon: FileText },
  { id: 'schedule', label: 'Schedule', icon: Calendar },
  { id: 'budget', label: 'Budget', icon: DollarSign },
  { id: 'resources', label: 'Resources', icon: Users },
  { id: 'products', label: 'Products', icon: Package },
  { id: 'risks', label: 'Risks & Quality', icon: Shield },
  { id: 'variance', label: 'Variance', icon: CheckCircle },
  { id: 'approvals', label: 'Approvals', icon: CheckCircle },
  { id: 'history', label: 'History', icon: History },
]

export default function StagePlanView({ planId, onEdit, onExport }) {
  const { theme } = useThemeContext()
  const [activeTab, setActiveTab] = useState('overview')
  const [plan, setPlan] = useState(null)
  const [milestones, setMilestones] = useState([])
  const [resources, setResources] = useState([])
  const [products, setProducts] = useState([])
  const [revisionHistory, setRevisionHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (planId) {
      loadPlan()
    }
  }, [planId])

  const loadPlan = async () => {
    try {
      setLoading(true)
      const result = await getStagePlanById(planId)
      if (result.success) {
        setPlan(result.data)
        
        const milestonesResult = await getMilestones(planId, 'stage_plan')
        if (milestonesResult.success) {
          setMilestones(milestonesResult.data || [])
        }
        
        const resourcesResult = await getResources(planId, 'stage_plan')
        if (resourcesResult.success) {
          setResources(resourcesResult.data || [])
        }
        
        const productsResult = await getProducts(planId)
        if (productsResult.success) {
          setProducts(productsResult.data || [])
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
        return <StagePlanOverviewSection formData={plan} onChange={() => {}} errors={{}} mode="view" projectId={plan.project_id} />
      case 'schedule':
        return <StagePlanScheduleSection formData={plan} onChange={() => {}} errors={{}} milestones={milestones} setMilestones={() => {}} planId={planId} mode="view" />
      case 'budget':
        return <StagePlanBudgetSection formData={plan} onChange={() => {}} errors={{}} mode="view" />
      case 'resources':
        return <StagePlanResourceSection formData={plan} onChange={() => {}} resources={resources} setResources={() => {}} planId={planId} mode="view" />
      case 'products':
        return <StagePlanProductsSection formData={plan} onChange={() => {}} products={products} setProducts={() => {}} planId={planId} mode="view" projectId={plan.project_id} />
      case 'risks':
        return <StagePlanRiskSection formData={plan} onChange={() => {}} mode="view" projectId={plan.project_id} />
      case 'variance':
        return <PlanVarianceAnalysis planId={planId} />
      case 'approvals':
        return <PlanApprovalSection planId={planId} planType="stage_plan" />
      case 'history':
        return <PlanRevisionHistorySection revisionHistory={revisionHistory} />
      default:
        return null
    }
  }

  return (
    <div className={`${theme === 'dark' ? 'dark' : ''} bg-white dark:bg-gray-900 min-h-screen`}>
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {plan.plan_title || 'Stage Plan'}
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {plan.plan_reference} • Stage {plan.stage_number}: {plan.stage_name} • Version {plan.version_number} • {plan.status}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <ExportRecordButtons
              onExportPPT={() => exportRecordToPPT(STAGE_PLAN_SECTIONS, plan, `StagePlan_${plan.plan_reference || plan.id}`)}
              onExportWord={() => exportRecordToWord(STAGE_PLAN_SECTIONS, plan, `StagePlan_${plan.plan_reference || plan.id}`)}
              onExportExcel={() => exportRecordToExcel(STAGE_PLAN_SECTIONS, plan, `StagePlan_${plan.plan_reference || plan.id}`)}
              onExportCSV={() => exportRecordToCSV(STAGE_PLAN_SECTIONS, plan, `StagePlan_${plan.plan_reference || plan.id}`)}
              onExportXML={() => exportRecordToXML(STAGE_PLAN_SECTIONS, plan, `StagePlan_${plan.plan_reference || plan.id}`)}
              onExportJSON={() => exportRecordToJSON(STAGE_PLAN_SECTIONS, plan, `StagePlan_${plan.plan_reference || plan.id}`)}
              onExportPrint={() => exportRecordToPrint(STAGE_PLAN_SECTIONS, plan, `StagePlan_${plan.plan_reference || plan.id}`)}
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
            {onEdit && plan.status !== 'baseline' && plan.status !== 'in_execution' && (
              <button
                onClick={() => onEdit(plan)}
                className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </button>
            )}
          </div>
        </div>

        <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
          <nav className="flex space-x-8">
            {TABS.map(tab => {
              const TabIcon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  <TabIcon className="w-4 h-4 mr-2" />
                  {tab.label}
                </button>
              )
            })}
          </nav>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          {renderTabContent()}
        </div>
      </div>
    </div>
  )
}

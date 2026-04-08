/**
 * Product Description View Component
 * Read-only view with tabs for all sections
 */

import { useState, useEffect } from 'react'
import { FileText, Package, BookOpen, Target, Award, Users, CheckCircle, History, Edit, Download, BarChart3, Link as LinkIcon } from 'lucide-react'
import { useThemeContext } from '../../context/ThemeContext'
import { getProductDescriptionById, getRevisionHistory } from '../../services/productDescriptionService'
import { supabase } from '../../services/supabaseClient'
import { getCompositionItems } from '../../services/pdCompositionItemsService'
import { getDerivations } from '../../services/pdDerivationsService'
import { getAcceptanceCriteria } from '../../services/pdAcceptanceCriteriaService'
import { getQualityExpectations } from '../../services/pdQualityExpectationsService'
import { getSkills } from '../../services/pdSkillsRequiredService'
import { getResponsibilities } from '../../services/pdAcceptanceResponsibilitiesService'
import PDIntroductionSection from './PDIntroductionSection'
import PDCompositionSection from './PDCompositionSection'
import PDDerivationsSection from './PDDerivationsSection'
import PDAcceptanceCriteriaSection from './PDAcceptanceCriteriaSection'
import PDQualityExpectationsSection from './PDQualityExpectationsSection'
import PDSkillsSection from './PDSkillsSection'
import PDAcceptanceResponsibilitiesSection from './PDAcceptanceResponsibilitiesSection'
import ProductDescriptionRevisionHistory from './ProductDescriptionRevisionHistory'
import ProductDescriptionDistribution from './ProductDescriptionDistribution'
import PlanApprovalSection from '../plans/PlanApprovalSection'
import ProductDescriptionExportMenu from './ProductDescriptionExportMenu'
import ExportRecordButtons from '../ui/ExportRecordButtons'
import { exportRecordToExcel, exportRecordToWord, exportRecordToPPT, exportRecordToCSV, exportRecordToXML, exportRecordToJSON, exportRecordToPrint } from '../../utils/exportUtils'

const PD_VIEW_SECTIONS = [
  { title: 'Document Information', fields: [
    { key: 'pd_reference', label: 'Reference' },
    { key: 'product_title', label: 'Product Title' },
    { key: 'status', label: 'Status' },
    { key: 'version_number', label: 'Version' }
  ]}
]

const TABS = [
  { id: 'introduction', label: 'Introduction', icon: FileText },
  { id: 'composition', label: 'Composition', icon: Package },
  { id: 'derivation', label: 'Derivation', icon: BookOpen },
  { id: 'acceptance', label: 'Acceptance Criteria', icon: Target },
  { id: 'quality', label: 'Quality', icon: Award },
  { id: 'skills', label: 'Skills', icon: Users },
  { id: 'responsibilities', label: 'Responsibilities', icon: CheckCircle },
  { id: 'approvals', label: 'Approvals', icon: CheckCircle },
  { id: 'history', label: 'History', icon: History },
]

export default function ProductDescriptionView({ pdId, onEdit, onExport }) {
  const { theme } = useThemeContext()
  const [activeTab, setActiveTab] = useState('introduction')
  const [pd, setPd] = useState(null)
  const [compositionItems, setCompositionItems] = useState([])
  const [derivations, setDerivations] = useState([])
  const [acceptanceCriteria, setAcceptanceCriteria] = useState([])
  const [qualityExpectations, setQualityExpectations] = useState([])
  const [skills, setSkills] = useState([])
  const [responsibilities, setResponsibilities] = useState([])
  const [revisionHistory, setRevisionHistory] = useState([])
  const [approvals, setApprovals] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (pdId) {
      loadProductDescription()
    }
  }, [pdId])

  const loadProductDescription = async () => {
    try {
      setLoading(true)
      const result = await getProductDescriptionById(pdId)
      if (result.success) {
        setPd(result.data)
        
        // Load child data
        const [compResult, derivResult, criteriaResult, qualityResult, skillsResult, respResult, historyResult] = await Promise.all([
          getCompositionItems(pdId),
          getDerivations(pdId),
          getAcceptanceCriteria(pdId),
          getQualityExpectations(pdId),
          getSkills(pdId),
          getResponsibilities(pdId),
          getRevisionHistory(pdId)
        ])
        
        if (compResult.success) setCompositionItems(compResult.data || [])
        if (derivResult.success) setDerivations(derivResult.data || [])
        if (criteriaResult.success) setAcceptanceCriteria(criteriaResult.data || [])
        if (qualityResult.success) setQualityExpectations(qualityResult.data || [])
        if (skillsResult.success) setSkills(skillsResult.data || [])
        if (respResult.success) setResponsibilities(respResult.data || [])
        if (historyResult.success) setRevisionHistory(historyResult.data || [])

        // Load approvals
        const { data: approvalData } = await supabase
          .from('pd_approvals')
          .select(`
            *,
            approver:approver_id(id, full_name, email)
          `)
          .eq('product_description_id', pdId)
          .order('created_at', { ascending: false })
        setApprovals(approvalData || [])
      }
    } catch (error) {
      console.error('Error loading product description:', error)
      alert('Error loading product description: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading product description...</p>
        </div>
      </div>
    )
  }

  if (!pd) {
    return (
      <div className="text-center p-8">
        <p className="text-gray-600 dark:text-gray-400">Product Description not found</p>
      </div>
    )
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'introduction':
        return <PDIntroductionSection formData={pd} onChange={() => {}} errors={{}} mode="view" projectId={pd.project_id} />
      case 'composition':
        return <PDCompositionSection compositionItems={compositionItems} setCompositionItems={() => {}} pdId={pdId} mode="view" projectId={pd.project_id} />
      case 'derivation':
        return <PDDerivationsSection derivations={derivations} setDerivations={() => {}} pdId={pdId} mode="view" projectId={pd.project_id} />
      case 'acceptance':
        return <PDAcceptanceCriteriaSection acceptanceCriteria={acceptanceCriteria} setAcceptanceCriteria={() => {}} pdId={pdId} mode="view" />
      case 'quality':
        return <PDQualityExpectationsSection qualityExpectations={qualityExpectations} setQualityExpectations={() => {}} formData={pd} onChange={() => {}} pdId={pdId} mode="view" />
      case 'skills':
        return <PDSkillsSection skills={skills} setSkills={() => {}} formData={pd} onChange={() => {}} pdId={pdId} mode="view" />
      case 'responsibilities':
        return <PDAcceptanceResponsibilitiesSection responsibilities={responsibilities} setResponsibilities={() => {}} formData={pd} onChange={() => {}} pdId={pdId} mode="view" projectId={pd.project_id} />
      case 'approvals':
        return (
          <div className="space-y-6">
            <PlanApprovalSection planId={pdId} planType="product_description" />
            <ProductDescriptionDistribution pdId={pdId} />
          </div>
        )
      case 'history':
        return <ProductDescriptionRevisionHistory revisionHistory={revisionHistory} />
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
              {pd.product_title || 'Product Description'}
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {pd.pd_reference} • Version {pd.version_number} • {pd.status}
            </p>
            {/* Links */}
            <div className="flex items-center gap-4 mt-2 text-sm">
              {pd.product_deliverable_id && (
                <a
                  href={`/app/projects/${pd.project_id}/product-deliverables`}
                  className="flex items-center text-blue-600 dark:text-blue-400 hover:underline"
                >
                  <LinkIcon className="w-3 h-3 mr-1" />
                  Product Deliverable
                </a>
              )}
              <button
                onClick={async () => {
                  const { data: { user } } = await supabase.auth.getUser()
                  if (user) {
                    const { data: userData } = await supabase
                      .from('users')
                      .select('id')
                      .eq('auth_user_id', user.id)
                      .eq('is_deleted', false)
                      .single()
                    
                    if (userData) {
                      const { createPSAForProductDescription } = await import('../../services/productStatusAccountService')
                      const result = await createPSAForProductDescription(pdId, null, userData.id)
                      if (result.success) {
                        window.location.href = `/app/projects/${pd.project_id}/product-status-accounts/${result.data.id}`
                      } else {
                        alert('Error: ' + result.error)
                      }
                    }
                  }
                }}
                className="flex items-center text-purple-600 dark:text-purple-400 hover:underline"
              >
                <BarChart3 className="w-3 h-3 mr-1" />
                Product Status Account
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ExportRecordButtons
              onExportPPT={() => exportRecordToPPT(PD_VIEW_SECTIONS, pd, `ProductDescription_${pd.pd_reference || pd.id}`)}
              onExportWord={() => exportRecordToWord(PD_VIEW_SECTIONS, pd, `ProductDescription_${pd.pd_reference || pd.id}`)}
              onExportExcel={() => exportRecordToExcel(PD_VIEW_SECTIONS, pd, `ProductDescription_${pd.pd_reference || pd.id}`)}
              onExportCSV={() => exportRecordToCSV(PD_VIEW_SECTIONS, pd, `ProductDescription_${pd.pd_reference || pd.id}`)}
              onExportXML={() => exportRecordToXML(PD_VIEW_SECTIONS, pd, `ProductDescription_${pd.pd_reference || pd.id}`)}
              onExportJSON={() => exportRecordToJSON(PD_VIEW_SECTIONS, pd, `ProductDescription_${pd.pd_reference || pd.id}`)}
              onExportPrint={() => exportRecordToPrint(PD_VIEW_SECTIONS, pd, `ProductDescription_${pd.pd_reference || pd.id}`)}
            />
            <ProductDescriptionExportMenu
              pd={pd}
              compositionItems={compositionItems}
              derivations={derivations}
              acceptanceCriteria={acceptanceCriteria}
              qualityExpectations={qualityExpectations}
              skills={skills}
              responsibilities={responsibilities}
              revisionHistory={revisionHistory}
              approvals={approvals}
            />
            {onEdit && pd.status !== 'approved' && (
              <button
                onClick={() => onEdit(pd)}
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

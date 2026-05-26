import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

import { usePlatformProjectId } from '../hooks/usePlatformProjectId.js'
import { supabase } from '../services/supabaseClient'
import { FileText, Edit2, CheckCircle, Clock, AlertCircle, Plus, Users, Target, Package, BookOpen, Award, Settings, ArrowRight, Mail } from 'lucide-react'
import { getPPDByProject, getOrCreatePPD } from '../services/projectProductDescriptionService'
import { getCompositionItems } from '../services/ppdCompositionService'
import { getCriteria } from '../services/ppdAcceptanceCriteriaService'
import { getExpectations } from '../services/ppdQualityExpectationsService'
import { getSkills } from '../services/ppdSkillsService'
import { getResponsibilities } from '../services/ppdAcceptanceResponsibilitiesService'
import { getDerivations } from '../services/ppdDerivationsService'
import PPDForm from '../components/ppd/PPDForm'
import PPDExportMenu from '../components/ppd/PPDExportMenu'
import CompositionItemForm from '../components/ppd/CompositionItemForm'
import AcceptanceCriteriaForm from '../components/ppd/AcceptanceCriteriaForm'
import DerivationSection from '../components/ppd/DerivationSection'
import QualityExpectationsSection from '../components/ppd/QualityExpectationsSection'
import SkillsSection from '../components/ppd/SkillsSection'
import AcceptanceResponsibilitiesSection from '../components/ppd/AcceptanceResponsibilitiesSection'
import AcceptanceCriteriaSection from '../components/ppd/AcceptanceCriteriaSection'
import PPDRevisionHistory from '../components/ppd/PPDRevisionHistory'
import PPDDistribution from '../components/ppd/PPDDistribution'
import ExportRecordButtons from '../components/ui/ExportRecordButtons'
import { exportRecordToExcel, exportRecordToWord, exportRecordToPPT, exportRecordToCSV, exportRecordToXML, exportRecordToJSON, exportRecordToPrint } from '../utils/exportUtils'

const PPD_VIEW_SECTIONS = [
  { title: 'Document Information', fields: [
    { key: 'document_ref', label: 'Document Ref' },
    { key: 'product_title', label: 'Product Title' },
    { key: 'status', label: 'Status' }
  ]}
]

export default function PPDView() {
  const { projectId, routeKey } = usePlatformProjectId()
  const navigate = useNavigate()
  const [project, setProject] = useState(null)
  const [ppd, setPpd] = useState(null)
  const [compositionItems, setCompositionItems] = useState([])
  const [criteria, setCriteria] = useState([])
  const [expectations, setExpectations] = useState([])
  const [skills, setSkills] = useState([])
  const [responsibilities, setResponsibilities] = useState([])
  const [derivations, setDerivations] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview') // 'overview', 'composition', 'derivations', 'skills', 'quality', 'criteria', 'responsibilities', 'acceptance'
  const [showPPDForm, setShowPPDForm] = useState(false)
  const [showCompositionForm, setShowCompositionForm] = useState(false)
  const [showCriteriaForm, setShowCriteriaForm] = useState(false)
  const [selectedCompositionItem, setSelectedCompositionItem] = useState(null)
  const [selectedCriterion, setSelectedCriterion] = useState(null)

  useEffect(() => {
    if (projectId) {
      fetchData()
    }
  }, [projectId])

  const fetchData = async () => {
    try {
      setLoading(true)

      // Fetch project
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('id, project_name, project_code')
        .eq('id', projectId)
        .eq('is_deleted', false)
        .single()

      if (projectError) throw projectError
      setProject(projectData)

      // Get or create PPD
      const ppdData = await getOrCreatePPD(projectId)
      setPpd(ppdData)

      // Fetch related data
      if (ppdData) {
        const [
          compositionData,
          criteriaData,
          expectationsData,
          skillsData,
          responsibilitiesData,
          derivationsResult
        ] = await Promise.all([
          getCompositionItems(ppdData.id),
          getCriteria(ppdData.id),
          getExpectations(ppdData.id),
          getSkills(ppdData.id),
          getResponsibilities(ppdData.id),
          getDerivations(ppdData.id)
        ])

        setCompositionItems(compositionData || [])
        setCriteria(criteriaData || [])
        setExpectations(expectationsData || [])
        setSkills(skillsData || [])
        setResponsibilities(responsibilitiesData || [])
        if (derivationsResult.success) {
          setDerivations(derivationsResult.data || [])
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      alert('Error: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading Project Product Description...</p>
        </div>
      </div>
    )
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
      case 'under_review':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
      case 'superseded':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
      default:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button
        onClick={() => navigate(`/projects/${projectId}`)}
        className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
      >
        ← Back to Project
      </button>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Project Product Description
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              {project?.project_name} - {ppd?.ppd_reference || 'Draft'}
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {ppd && (
              <ExportRecordButtons
                onExportPPT={() => exportRecordToPPT(PPD_VIEW_SECTIONS, ppd, `PPD_${ppd.document_ref || ppd.id}`)}
                onExportWord={() => exportRecordToWord(PPD_VIEW_SECTIONS, ppd, `PPD_${ppd.document_ref || ppd.id}`)}
                onExportExcel={() => exportRecordToExcel(PPD_VIEW_SECTIONS, ppd, `PPD_${ppd.document_ref || ppd.id}`)}
                onExportCSV={() => exportRecordToCSV(PPD_VIEW_SECTIONS, ppd, `PPD_${ppd.document_ref || ppd.id}`)}
                onExportXML={() => exportRecordToXML(PPD_VIEW_SECTIONS, ppd, `PPD_${ppd.document_ref || ppd.id}`)}
                onExportJSON={() => exportRecordToJSON(PPD_VIEW_SECTIONS, ppd, `PPD_${ppd.document_ref || ppd.id}`)}
                onExportPrint={() => exportRecordToPrint(PPD_VIEW_SECTIONS, ppd, `PPD_${ppd.document_ref || ppd.id}`)}
              />
            )}
            {ppd && (
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(ppd.status)}`}>
                {ppd.status.replace('_', ' ').toUpperCase()}
              </span>
            )}
            {ppd && (
              <>
                <PPDExportMenu
                  ppd={ppd}
                  compositionItems={compositionItems}
                  criteria={criteria}
                  expectations={expectations}
                  skills={skills}
                  responsibilities={responsibilities}
                />
                <button
                  onClick={() => navigate(`/projects/${projectId}/ppd/acceptance`)}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2"
                >
                  <Target className="h-4 w-4" />
                  Acceptance Testing
                </button>
              </>
            )}
            {ppd && ppd.status === 'draft' && (
              <button
                onClick={() => setShowPPDForm(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
              >
                <Edit2 className="h-4 w-4" />
                Edit
              </button>
            )}
          </div>
        </div>
      </div>

      {!ppd ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
          <FileText className="h-16 w-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            No Project Product Description
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Create a Project Product Description to define what this project will deliver.
          </p>
          <button
            onClick={() => setShowPPDForm(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 mx-auto"
          >
            <Plus className="h-4 w-4" />
            Create PPD
          </button>
        </div>
      ) : (
        <>
          {/* Tabs */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 mb-6">
            <div className="border-b border-gray-200 dark:border-gray-700">
              <nav className="flex -mb-px overflow-x-auto">
                {[
                  { id: 'overview', label: 'Overview', icon: FileText },
                  { id: 'composition', label: `Composition (${compositionItems.length})`, icon: Package },
                  { id: 'derivations', label: 'Derivations', icon: BookOpen },
                  { id: 'skills', label: `Skills (${skills.length})`, icon: Users },
                  { id: 'quality', label: `Quality (${expectations.length})`, icon: Award },
                  { id: 'criteria', label: `Acceptance Criteria (${criteria.length})`, icon: Target },
                  { id: 'history', label: 'Revision History', icon: Clock },
                  { id: 'distribution', label: 'Distribution', icon: Mail },
                  { id: 'responsibilities', label: `Responsibilities (${responsibilities.length})`, icon: Settings },
                  { id: 'acceptance', label: 'Acceptance Testing', icon: CheckCircle },
                  { id: 'history', label: 'Revision History', icon: Clock },
                  { id: 'distribution', label: 'Distribution', icon: Mail }
                ].map((tab) => {
                  const Icon = tab.icon
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`px-6 py-3 text-sm font-medium border-b-2 flex items-center gap-2 whitespace-nowrap ${
                        activeTab === tab.id
                          ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {tab.label}
                    </button>
                  )
                })}
              </nav>
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Product Title */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Product Title</h3>
                    <p className="text-gray-700 dark:text-gray-300">{ppd.product_title || 'Not defined'}</p>
                  </div>

                  {/* Purpose */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Purpose</h3>
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{ppd.purpose || 'Not defined'}</p>
                  </div>

                  {/* Composition Summary */}
                  {ppd.composition && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Composition</h3>
                      <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{ppd.composition}</p>
                    </div>
                  )}

                  {/* Derivation */}
                  {ppd.derivation && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Derivation</h3>
                      <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{ppd.derivation}</p>
                    </div>
                  )}

                  {/* Quality Expectations */}
                  {ppd.customer_quality_expectations && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Customer Quality Expectations</h3>
                      <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{ppd.customer_quality_expectations}</p>
                    </div>
                  )}

                  {/* Acceptance Method */}
                  {ppd.acceptance_method && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Acceptance Method</h3>
                      <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{ppd.acceptance_method}</p>
                    </div>
                  )}

                  {/* Acceptance Responsibilities */}
                  {ppd.acceptance_responsibilities && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Acceptance Responsibilities</h3>
                      <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{ppd.acceptance_responsibilities}</p>
                    </div>
                  )}

                  {/* Ownership */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Ownership</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Author</p>
                        <p className="text-gray-900 dark:text-white">
                          {ppd.author?.full_name || ppd.author_name || 'Not assigned'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Owner</p>
                        <p className="text-gray-900 dark:text-white">
                          {ppd.owner?.full_name || ppd.owner_name || 'Not assigned'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Client</p>
                        <p className="text-gray-900 dark:text-white">
                          {ppd.client?.full_name || ppd.client_name || 'Not assigned'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'composition' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Major Products/Deliverables</h3>
                    {ppd.status === 'draft' && (
                      <button
                        onClick={() => {
                          setSelectedCompositionItem(null)
                          setShowCompositionForm(true)
                        }}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 text-sm"
                      >
                        <Plus className="h-4 w-4" />
                        Add Item
                      </button>
                    )}
                  </div>
                  {compositionItems.length === 0 ? (
                    <p className="text-gray-500 dark:text-gray-400">No composition items defined</p>
                  ) : (
                    <div className="space-y-3">
                      {compositionItems.map((item, index) => (
                        <div
                          key={item.id}
                          className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="font-mono text-sm text-gray-500 dark:text-gray-400">#{item.item_number}</span>
                                <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs">
                                  {item.product_type?.replace('_', ' ')}
                                </span>
                                {item.is_mandatory && (
                                  <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded text-xs">
                                    Mandatory
                                  </span>
                                )}
                              </div>
                              <h4 className="font-semibold text-gray-900 dark:text-white mb-1">{item.product_name}</h4>
                              {item.product_description && (
                                <p className="text-sm text-gray-600 dark:text-gray-400">{item.product_description}</p>
                              )}
                              {item.product_description_id && (
                                <div className="mt-2">
                                  <a
                                    href={`/app/projects/${projectId}/product-descriptions/${item.product_description_id}`}
                                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                                  >
                                    View Product Description →
                                  </a>
                                </div>
                              )}
                              {item.linked_product && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                  Linked: {item.linked_product.product_code} - {item.linked_product.product_name}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'criteria' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Acceptance Criteria</h3>
                    {ppd.status === 'draft' && (
                      <button
                        onClick={() => {
                          setSelectedCriterion(null)
                          setShowCriteriaForm(true)
                        }}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 text-sm"
                      >
                        <Plus className="h-4 w-4" />
                        Add Criterion
                      </button>
                    )}
                  </div>
                  {criteria.length === 0 ? (
                    <p className="text-gray-500 dark:text-gray-400">No acceptance criteria defined</p>
                  ) : (
                    <div className="space-y-3">
                      {criteria.map((criterion, index) => (
                        <div
                          key={criterion.id}
                          className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="font-mono text-sm text-gray-500 dark:text-gray-400">{criterion.criteria_reference}</span>
                                <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded text-xs">
                                  {criterion.criteria_category?.replace('_', ' ')}
                                </span>
                                <span className={`px-2 py-1 rounded text-xs ${
                                  criterion.priority === 'must_have' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' :
                                  criterion.priority === 'should_have' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300' :
                                  criterion.priority === 'could_have' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' :
                                  'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300'
                                }`}>
                                  {criterion.priority?.replace('_', ' ')}
                                </span>
                                {criterion.is_measurable && (
                                  <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded text-xs">
                                    Measurable
                                  </span>
                                )}
                              </div>
                              <h4 className="font-semibold text-gray-900 dark:text-white mb-1">{criterion.criteria_title}</h4>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{criterion.criteria_description}</p>
                              {criterion.measurement_method && (
                                <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                  <strong>Measurement:</strong> {criterion.measurement_method}
                                  {criterion.target_value && ` | Target: ${criterion.target_value} ${criterion.unit_of_measure || ''}`}
                                </div>
                              )}
                              <div className="flex items-center gap-2 mt-2">
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  Stakeholder: {criterion.stakeholder_group?.replace('_', ' ')}
                                </span>
                                <span className={`text-xs px-2 py-1 rounded ${
                                  criterion.acceptance_status === 'passed' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' :
                                  criterion.acceptance_status === 'failed' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' :
                                  'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300'
                                }`}>
                                  {criterion.acceptance_status || 'Pending'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Derivations Tab */}
              {activeTab === 'derivations' && ppd && (
                <DerivationSection
                  ppdId={ppd.id}
                  mode={ppd.status === 'draft' ? 'edit' : 'view'}
                  projectId={projectId}
                />
              )}

              {/* Skills Tab */}
              {activeTab === 'skills' && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <p>Skills section - Implementation in progress...</p>
                </div>
              )}

              {/* Quality Tab */}
              {activeTab === 'quality' && ppd && (
                <QualityExpectationsSection
                  ppdId={ppd.id}
                  mode={ppd.status === 'draft' ? 'edit' : 'view'}
                  formData={ppd}
                  onChange={(field, value) => {
                    // Handle form updates
                  }}
                />
              )}

              {/* Responsibilities Tab */}
              {activeTab === 'responsibilities' && ppd && (
                <AcceptanceResponsibilitiesSection
                  ppdId={ppd.id}
                  mode={ppd.status === 'draft' ? 'edit' : 'view'}
                  formData={ppd}
                  onChange={(field, value) => {
                    // Handle form updates
                  }}
                  projectId={projectId}
                />
              )}

              {/* Acceptance Testing Tab */}
              {activeTab === 'acceptance' && (
                <div className="space-y-6">
                  <div className="text-center py-8">
                    <p className="text-gray-500 dark:text-gray-400 mb-4">
                      Use the Acceptance Testing button above to conduct acceptance testing.
                    </p>
                    <button
                      onClick={() => navigate(`/projects/${projectId}/ppd/acceptance`)}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2 mx-auto"
                    >
                      <Target className="w-4 h-4" />
                      Go to Acceptance Testing
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* PPD Form Modal */}
      {showPPDForm && (
        <PPDForm
          ppd={ppd}
          projectId={projectId}
          onSave={() => {
            setShowPPDForm(false)
            fetchData()
          }}
          onCancel={() => setShowPPDForm(false)}
        />
      )}

      {/* Composition Item Form Modal */}
      {showCompositionForm && ppd && (
        <CompositionItemForm
          item={selectedCompositionItem}
          ppdId={ppd.id}
          onSave={() => {
            setShowCompositionForm(false)
            setSelectedCompositionItem(null)
            fetchData()
          }}
          onCancel={() => {
            setShowCompositionForm(false)
            setSelectedCompositionItem(null)
          }}
        />
      )}

      {/* Acceptance Criteria Form Modal */}
      {showCriteriaForm && ppd && (
        <AcceptanceCriteriaForm
          criterion={selectedCriterion}
          ppdId={ppd.id}
          onSave={() => {
            setShowCriteriaForm(false)
            setSelectedCriterion(null)
            fetchData()
          }}
          onCancel={() => {
            setShowCriteriaForm(false)
            setSelectedCriterion(null)
          }}
        />
      )}
    </div>
  )
}

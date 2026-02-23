import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, Edit, FileText, FileIcon, Users, CheckCircle, XCircle, Clock } from 'lucide-react'
import { getMandateByIdOrReference, canEditMandate, canCreateProject, createProjectFromMandate, getAssociatedDocuments, getStakeholders } from '../../services/projectMandateService'
import { getConstraintsByMandate } from '../../services/mandateConstraintService'
import { submitForApproval, getApprovalStatus } from '../../services/mandateWorkflowService'
import { useToastContext } from '../../context/ToastContext'
import ConstraintListItem from '../../components/constraints/ConstraintListItem'
import MandateSubmitModal from '../../components/mandate/MandateSubmitModal'

/** Parse JSON array or return raw string for display */
function parseListOrText(value) {
  if (value == null || value === '') return null
  try {
    const parsed = JSON.parse(value)
    if (Array.isArray(parsed) && parsed.length > 0) return parsed
  } catch {}
  return null
}

export default function ProjectMandateView() {
  const { mandateId: mandateIdentifier } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToastContext()

  const isPMOContext = location.pathname.startsWith('/pmo')
  const basePath = isPMOContext ? '/pmo/mandates' : '/platform/mandates'

  const [mandate, setMandate] = useState(null)
  const [loading, setLoading] = useState(true)
  const [canEdit, setCanEdit] = useState(false)
  const [canCreate, setCanCreate] = useState(false)
  const [approvalPending, setApprovalPending] = useState(false)
  const [creatingProject, setCreatingProject] = useState(false)
  const [submittingForApproval, setSubmittingForApproval] = useState(false)
  const [constraints, setConstraints] = useState([])
  const [associatedDocuments, setAssociatedDocuments] = useState([])
  const [stakeholders, setStakeholders] = useState([])
  const [approvalHistory, setApprovalHistory] = useState([])
  const [showSubmitModal, setShowSubmitModal] = useState(false)

  const fetchMandate = useCallback(async () => {
    if (!mandateIdentifier) return
    try {
      setLoading(true)
      const data = await getMandateByIdOrReference(mandateIdentifier)
      setMandate(data)
      if (!data) return

      const id = data.id
      const [editable, creatable, approvalStatus, constraintsResult, docsData, stakeholdersData] = await Promise.all([
        canEditMandate(id),
        canCreateProject(id),
        getApprovalStatus(id).catch(() => ({ isPending: false })),
        getConstraintsByMandate(id).catch(() => ({ success: false })),
        getAssociatedDocuments(id).catch(() => []),
        getStakeholders(id).catch(() => [])
      ])

      setCanEdit(editable)
      setCanCreate(creatable)
      setApprovalPending(approvalStatus?.isPending ?? false)
      setApprovalHistory(approvalStatus?.approvals ?? [])
      if (constraintsResult.success && constraintsResult.data) setConstraints(constraintsResult.data)
      if (docsData?.length > 0) setAssociatedDocuments(docsData)
      if (stakeholdersData?.length > 0) setStakeholders(stakeholdersData)
    } catch (error) {
      console.error('Error fetching mandate:', error)
      alert('Error loading mandate: ' + error.message)
    } finally {
      setLoading(false)
    }
  }, [mandateIdentifier])

  useEffect(() => {
    fetchMandate()
  }, [fetchMandate])

  const parsedSections = useMemo(() => {
    if (!mandate) return {}
    return {
      authority: parseListOrText(mandate.authority_responsible),
      objectives: parseListOrText(mandate.project_objectives),
      scope: parseListOrText(mandate.scope),
      scopeExclusions: parseListOrText(mandate.scope_exclusions),
      interfaces: parseListOrText(mandate.interfaces),
      qualityExpectations: parseListOrText(mandate.quality_expectations)
    }
  }, [mandate])

  const renderListOrText = (items, fallbackText) => {
    if (items && items.length > 0) {
      return (
        <ul className="list-disc list-inside space-y-1">
          {items.map((item, idx) => (
            <li key={idx} className="text-gray-700 dark:text-gray-300">{item}</li>
          ))}
        </ul>
      )
    }
    return <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{fallbackText || ''}</p>
  }

  const handleCreateProject = async () => {
    if (!confirm('Create a new project from this approved mandate?')) return

    try {
      setCreatingProject(true)
      const projectId = await createProjectFromMandate(mandate.id)
      toast.success('Project created successfully!')
      navigate(`/projects/${projectId}`)
    } catch (error) {
      console.error('Error creating project:', error)
      toast.error('Error creating project: ' + (error?.message || 'Unknown error'))
    } finally {
      setCreatingProject(false)
    }
  }

  const canSubmitForApproval = mandate && (mandate.document_status === 'draft' || mandate.document_status === 'rejected') && !approvalPending

  const REQUEST_TIMEOUT_MS = 30000

  const handleSubmitForApproval = async () => {
    if (!mandate?.id || !canSubmitForApproval) return
    setSubmittingForApproval(true)
    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timed out. Please try again.')), REQUEST_TIMEOUT_MS)
      )
      await Promise.race([submitForApproval(mandate.id, null), timeoutPromise])
      toast.success('Mandate submitted for approval successfully')
      setShowSubmitModal(false)
      await fetchMandate()
    } catch (error) {
      console.error('Error submitting for approval:', error)
      toast.error(error?.message || 'Failed to submit for approval')
      setShowSubmitModal(false)
    } finally {
      setSubmittingForApproval(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading mandate...</p>
        </div>
      </div>
    )
  }

  if (!mandate) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">Mandate not found</p>
        </div>
      </div>
    )
  }

  const getApprovalStatusIcon = (status) => {
    if (status === 'approved') return <CheckCircle className="w-4 h-4 text-green-500" />
    if (status === 'rejected') return <XCircle className="w-4 h-4 text-red-500" />
    return <Clock className="w-4 h-4 text-yellow-500" />
  }

  const getApprovalBadgeClass = (status) => {
    if (status === 'approved') return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
    if (status === 'rejected') return 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
    return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Submit for Approval Confirmation Modal */}
      {showSubmitModal && (
        <MandateSubmitModal
          mandate={mandate}
          submitting={submittingForApproval}
          onConfirm={handleSubmitForApproval}
          onCancel={() => setShowSubmitModal(false)}
        />
      )}
      <div className="mb-6">
        <button
          onClick={() => navigate(isPMOContext ? '/pmo/governance/mandate' : '/platform/mandates/list')}
          className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 flex items-center"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Mandates
        </button>
        
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{mandate.mandate_title}</h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Reference: {mandate.mandate_reference} | Status: {mandate.document_status}
            </p>
          </div>
          
          <div className="flex flex-wrap gap-3">
            {canSubmitForApproval && (
              <button
                onClick={() => setShowSubmitModal(true)}
                disabled={submittingForApproval}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 flex items-center"
              >
                <FileText className="w-4 h-4 mr-2" />
                Submit for approval
              </button>
            )}
            {canCreate && (
              <button
                onClick={handleCreateProject}
                disabled={creatingProject}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center"
              >
                <FileText className="w-4 h-4 mr-2" />
                {creatingProject ? 'Creating...' : 'Create Project'}
              </button>
            )}
            {canEdit && (
              <button
                onClick={() => navigate(`${basePath}/${mandate.mandate_reference || mandate.id}/edit`)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Status Badge */}
        <div className={`px-4 py-2 rounded-lg ${
          mandate.document_status === 'approved' ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' :
          mandate.document_status === 'submitted' ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200' :
          mandate.document_status === 'rejected' ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200' :
          'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
        }`}>
          <span className="font-semibold">Status: {mandate.document_status.toUpperCase()}</span>
        </div>

        {/* Basic Information */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Basic Information</h2>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Reference</dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white">{mandate.mandate_reference}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Version</dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white">{mandate.version_number}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Created Date</dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white">{mandate.created_date}</dd>
            </div>
            {mandate.project_created_date && (
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Project Created</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                  {new Date(mandate.project_created_date).toLocaleDateString()}
                </dd>
              </div>
            )}
          </dl>
        </div>

        {/* 2-Column Layout for Main Form Sections - Chronological Order (1-12) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Sections 1, 2, 3, 4, 5, 6 */}
          <div className="space-y-6">
            {/* Section 1: Purpose */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">1. Purpose</h2>
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{mandate.purpose}</p>
            </div>

            {/* Section 2: Authority */}
            {mandate.authority_responsible && (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">2. Authority</h2>
                {renderListOrText(parsedSections.authority, mandate.authority_responsible)}
              </div>
            )}

            {/* Section 3: Background */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">3. Background</h2>
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{mandate.background}</p>
            </div>

            {/* Section 4: Project Objectives */}
            {mandate.project_objectives && (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">4. Project Objectives</h2>
                {renderListOrText(parsedSections.objectives, mandate.project_objectives)}
              </div>
            )}

            {/* Section 5: Scope */}
            {(mandate.scope || mandate.scope_exclusions) && (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">5. Scope</h2>
                {mandate.scope && (
                  <div className="mb-4">
                    <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">In-Scope Deliverables</h3>
                    {renderListOrText(parsedSections.scope, mandate.scope)}
                  </div>
                )}
                {mandate.scope_exclusions && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Out-of-Scope Exclusions</h3>
                    {renderListOrText(parsedSections.scopeExclusions, mandate.scope_exclusions)}
                  </div>
                )}
              </div>
            )}

            {/* Section 6: Constraints */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">6. Constraints</h2>
              {constraints.length > 0 ? (
                <div className="space-y-2">
                  {constraints.map((c) => (
                    <ConstraintListItem key={c.id} constraint={c} readOnly />
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400 italic">No constraints defined</p>
              )}
            </div>
          </div>

          {/* Right Column - Sections 7, 8, 9, 10, 11, 12 */}
          <div className="space-y-6">
            {/* Section 7: Interfaces */}
            {mandate.interfaces && (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">7. Interfaces</h2>
                {renderListOrText(parsedSections.interfaces, mandate.interfaces)}
              </div>
            )}

            {/* Section 8: Quality Expectations */}
            {mandate.quality_expectations && (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">8. Quality Expectations</h2>
                {renderListOrText(parsedSections.qualityExpectations, mandate.quality_expectations)}
              </div>
            )}

            {/* Section 9: Outline Business Case */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">9. Outline Business Case</h2>
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{mandate.outline_business_case}</p>
            </div>

            {/* Section 10: Associated Documents */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">10. Associated Documents</h2>
              {associatedDocuments.length > 0 ? (
                <div className="space-y-3">
                  {associatedDocuments.map((doc, idx) => (
                    <div key={doc.id || idx} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <FileIcon className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 dark:text-white">{doc.document_title}</p>
                        {doc.document_type && (
                          <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
                            {doc.document_type}
                          </span>
                        )}
                        {doc.reference_number && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Ref: {doc.reference_number}</p>
                        )}
                        {doc.document_url && (
                          <a href={doc.document_url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline mt-1 block">
                            View Document
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400 italic">No associated documents defined</p>
              )}
            </div>

            {/* Section 11: Proposed Roles */}
            {(mandate.proposed_executive_name || mandate.proposed_pm_name) && (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">11. Proposed Roles</h2>
                <dl className="space-y-2">
                  {mandate.proposed_executive_name && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Proposed Executive</dt>
                      <dd className="mt-1 text-sm text-gray-900 dark:text-white">{mandate.proposed_executive_name}</dd>
                    </div>
                  )}
                  {mandate.proposed_pm_name && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Proposed Project Manager</dt>
                      <dd className="mt-1 text-sm text-gray-900 dark:text-white">{mandate.proposed_pm_name}</dd>
                    </div>
                  )}
                </dl>
              </div>
            )}

            {/* Section 12: Customers/Users/Stakeholders */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">12. Customers/Users/Stakeholders</h2>
              {stakeholders.length > 0 ? (
                <div className="space-y-3">
                  {stakeholders.map((stakeholder, idx) => (
                    <div key={stakeholder.id || idx} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <Users className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900 dark:text-white">{stakeholder.stakeholder_name}</p>
                          {stakeholder.is_primary && (
                            <span className="text-xs px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded">
                              Primary
                            </span>
                          )}
                        </div>
                        {stakeholder.stakeholder_type && (
                          <span className="text-xs px-2 py-0.5 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded">
                            {stakeholder.stakeholder_type}
                          </span>
                        )}
                        {stakeholder.stakeholder_organisation && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{stakeholder.stakeholder_organisation}</p>
                        )}
                        {stakeholder.stakeholder_role && (
                          <p className="text-sm text-gray-600 dark:text-gray-300 mt-0.5">{stakeholder.stakeholder_role}</p>
                        )}
                        {stakeholder.contact_email && (
                          <a href={`mailto:${stakeholder.contact_email}`} className="text-sm text-blue-600 hover:underline mt-1 block">
                            {stakeholder.contact_email}
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400 italic">No stakeholders defined</p>
              )}
            </div>
          </div>
        </div>

        {/* Project Link */}
        {mandate.project_id && mandate.project && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Linked Project</h2>
            <p className="text-gray-700 dark:text-gray-300">
              This mandate is linked to project: <a href={`/projects/${mandate.project_id}`} className="text-blue-600 hover:underline">{mandate.project.name}</a>
            </p>
          </div>
        )}

        {/* Approval History */}
        {approvalHistory.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Approval History</h2>
            <div className="space-y-3">
              {approvalHistory.map((approval) => (
                <div key={approval.id} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="mt-0.5">{getApprovalStatusIcon(approval.approval_status)}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${getApprovalBadgeClass(approval.approval_status)}`}>
                        {approval.approval_status.toUpperCase()}
                      </span>
                      {approval.approver_name && (
                        <span className="text-sm text-gray-700 dark:text-gray-300">{approval.approver_name}</span>
                      )}
                      {approval.approval_date && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(approval.approval_date).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    {approval.approval_comments && (
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{approval.approval_comments}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      Requested: {new Date(approval.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

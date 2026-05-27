/**
 * BusinessCaseViewPage
 * Full read-only view of a single Business Case, with approve/reject actions for PMO Admin.
 * Route: /pmo/initiation/business-case/:id/view
 */

import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, Edit, FileText, Send, Loader2 } from 'lucide-react'
import {
  getBusinessCaseById,
  canEditBusinessCase,
  submitBusinessCaseForApproval,
} from '../../services/businessCaseService'
import { platformDb } from '../../services/supabase/supabaseClient'
import { useToastContext } from '../../context/ToastContext'
import BusinessCaseViewComponent from '../../components/businessCase/BusinessCaseView'
import BusinessCaseStatusBadge from '../../components/businessCase/BusinessCaseStatusBadge'
import ExportRecordButtons from '../../components/ui/ExportRecordButtons'
import { resolveInitiationBasePath } from '../../utils/initiationRouteUtils'
import {
  BUSINESS_CASE_EXPORT_SECTIONS,
  buildBusinessCaseExportRecord,
  businessCaseExportFilename,
} from '../../utils/businessCaseExportSections'

export default function BusinessCaseViewPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToastContext()

  const basePath = resolveInitiationBasePath(location.pathname)

  const [businessCase, setBusinessCase] = useState(null)
  const [loading, setLoading] = useState(true)
  const [canEdit, setCanEdit] = useState(false)
  const [isPMOAdmin, setIsPMOAdmin] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const [bc, editable] = await Promise.all([
        getBusinessCaseById(id),
        canEditBusinessCase(id),
      ])
      setBusinessCase(bc)
      setCanEdit(editable)

      // Check if current user is PMO Admin (for approve/reject buttons)
      const { data: { user: authUser } } = await platformDb.auth.getUser()
      if (authUser) {
        const { data: roles } = await platformDb
          .from('user_roles')
          .select('roles:role_id (role_name)')
          .eq('user_id', authUser.id)
          .eq('is_active', true)

        const roleNames = roles?.map(r => r.roles?.role_name) || []
        setIsPMOAdmin(roleNames.some(r => ['pmo_admin', 'org_admin', 'super_admin'].includes(r)))
      }
    } catch (err) {
      console.error('Error loading business case:', err)
      toast.error(err.message || 'Failed to load business case')
    } finally {
      setLoading(false)
    }
  }, [id, toast])

  useEffect(() => { fetchData() }, [fetchData])

  const handleSubmitForApproval = async () => {
    if (!window.confirm('Submit this business case for approval? It will be locked for editing until approved or rejected.')) return
    setSubmitting(true)
    try {
      await submitBusinessCaseForApproval(id)
      toast.success('Business case submitted for approval')
      await fetchData()
    } catch (err) {
      toast.error(err.message || 'Failed to submit for approval')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!businessCase) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 text-center">
        <p className="text-gray-600 dark:text-gray-400">Business case not found.</p>
        <button onClick={() => navigate(basePath)} className="mt-4 text-blue-600 dark:text-blue-400 underline text-sm">
          Back to list
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate(basePath)}
          className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Business Cases
        </button>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <FileText className="w-7 h-7 text-blue-600 mt-0.5" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{businessCase.case_title}</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm font-mono text-gray-500 dark:text-gray-400">{businessCase.case_reference}</span>
                <BusinessCaseStatusBadge status={businessCase.document_status} />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <ExportRecordButtons
              sections={BUSINESS_CASE_EXPORT_SECTIONS}
              record={buildBusinessCaseExportRecord(businessCase)}
              baseFilename={businessCaseExportFilename(businessCase)}
            />

            {canEdit && (
              <button
                onClick={() => navigate(`${basePath}/${id}/edit`)}
                className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <Edit className="w-4 h-4" /> Edit
              </button>
            )}

            {businessCase.document_status === 'draft' && (
              <button
                onClick={handleSubmitForApproval}
                disabled={submitting}
                className="flex items-center gap-2 px-3 py-2 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {submitting ? 'Submitting...' : 'Submit for Approval'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Full view */}
      <BusinessCaseViewComponent
        businessCase={businessCase}
        canApprove={isPMOAdmin && businessCase.document_status === 'submitted'}
        onRefresh={fetchData}
      />
    </div>
  )
}

/**
 * Plan Approval Section Component
 */

import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, Clock, User } from 'lucide-react'
import { supabase } from '../../services/supabaseClient'
import { approvePlan } from '../../services/projectPlanService'
import { approvePlan as approveStagePlan } from '../../services/stagePlanService'

export default function PlanApprovalSection({ planId, planType }) {
  const [approvals, setApprovals] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (planId) {
      loadApprovals()
    }
  }, [planId])

  const loadApprovals = async () => {
    try {
      setLoading(true)
      let tableName, idField
      if (planType === 'product_description') {
        tableName = 'pd_approvals'
        idField = 'product_description_id'
      } else {
        tableName = 'plan_approvals'
        idField = 'plan_id'
      }

      const { data, error } = await platformDb
        .from(tableName)
        .select(`
          *,
          approver:approver_id(id, full_name, email)
        `)
        .eq(idField, planId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setApprovals(data || [])
    } catch (error) {
      console.error('Error loading approvals:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (approvalId) => {
    try {
      let approveFn
      if (planType === 'product_description') {
        const { approveProductDescription } = await import('../../services/productDescriptionService')
        approveFn = approveProductDescription
      } else {
        const { approvePlan } = await import('../../services/projectPlanService')
        const { approvePlan: approveStagePlan } = await import('../../services/stagePlanService')
        approveFn = planType === 'project_plan' ? approvePlan : approveStagePlan
      }
      
      const { data: { user } } = await supabase.auth.getUser()
      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .single()

      const result = await approveFn(approvalId, userData.id, 'Approved')
      if (result.success) {
        loadApprovals()
      } else {
        alert('Error approving: ' + result.error)
      }
    } catch (error) {
      console.error('Error approving:', error)
      alert('Error approving: ' + error.message)
    }
  }

  if (loading) {
    return <div className="text-center py-4">Loading approvals...</div>
  }

  if (approvals.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        No approvals yet
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {approvals.map(approval => (
        <div
          key={approval.id}
          className={`p-4 rounded-lg border ${
            approval.approval_status === 'approved'
              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
              : approval.approval_status === 'rejected'
              ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
              : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start">
              {approval.approval_status === 'approved' ? (
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mr-3 mt-0.5" />
              ) : approval.approval_status === 'rejected' ? (
                <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 mr-3 mt-0.5" />
              ) : (
                <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mr-3 mt-0.5" />
              )}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <User className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  <span className="font-medium text-gray-900 dark:text-white">
                    {approval.approver_name || approval.approver?.full_name || 'Unknown'}
                  </span>
                  {approval.approver_title && (
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      ({approval.approver_title})
                    </span>
                  )}
                </div>
                {approval.approver_role && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    Role: {approval.approver_role.replace('_', ' ')}
                  </p>
                )}
                {approval.approval_date && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Date: {new Date(approval.approval_date).toLocaleDateString()}
                  </p>
                )}
                {approval.comments && (
                  <p className="text-sm text-gray-700 dark:text-gray-300 mt-2">
                    {approval.comments}
                  </p>
                )}
              </div>
            </div>
            {approval.approval_status === 'pending' && (
              <button
                onClick={() => handleApprove(approval.id)}
                className="px-3 py-1 text-sm font-medium text-white bg-green-600 rounded hover:bg-green-700"
              >
                Approve
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

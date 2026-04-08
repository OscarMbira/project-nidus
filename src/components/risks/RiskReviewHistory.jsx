/**
 * Risk Review History Component
 * Display periodic risk review records
 */

import { useState, useEffect } from 'react'
import { Calendar, Users, FileText, CheckCircle } from 'lucide-react'
import { platformDb } from '../../services/supabase/supabaseClient'

export default function RiskReviewHistory({ registerId, projectId }) {
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (registerId || projectId) {
      loadReviews()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registerId, projectId])

  const loadReviews = async () => {
    try {
      setLoading(true)
      let targetRegisterId = registerId

      // Get register ID from project if not provided
      if (!targetRegisterId && projectId) {
        const { data: register } = await platformDb
          .from('risk_registers')
          .select('id')
          .eq('project_id', projectId)
          .eq('is_deleted', false)
          .single()

        if (register) {
          targetRegisterId = register.id
        }
      }

      if (!targetRegisterId) {
        setReviews([])
        return
      }

      const { data, error } = await platformDb
        .from('risk_reviews')
        .select(`
          *,
          reviewed_by_user:reviewed_by(id, full_name, email)
        `)
        .eq('risk_register_id', targetRegisterId)
        .order('review_date', { ascending: false })

      if (error) throw error
      setReviews(data || [])
    } catch (error) {
      console.error('Error fetching risk reviews:', error)
    } finally {
      setLoading(false)
    }
  }

  const reviewTypeLabels = {
    scheduled: 'Scheduled Review',
    stage_gate: 'Stage Gate Review',
    ad_hoc: 'Ad-hoc Review',
    escalation: 'Escalation Review'
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A'
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    } catch {
      return dateStr
    }
  }

  if (loading) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        Loading review history...
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
          Risk Review History
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Periodic reviews and risk assessments
        </p>
      </div>

      {reviews.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
          <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-500 dark:text-gray-400 mb-2">No risk reviews recorded yet</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Reviews are typically conducted at stage gates or on a scheduled basis
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => (
            <div
              key={review.id}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs font-medium">
                      {reviewTypeLabels[review.review_type] || review.review_type}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(review.review_date)}
                    </span>
                  </div>

                  {review.reviewed_by_user && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      Reviewed by: {review.reviewed_by_user.full_name || review.reviewed_by_user.email}
                    </p>
                  )}

                  {review.participants && review.participants.length > 0 && (
                    <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 mb-2">
                      <Users className="h-4 w-4" />
                      <span>{review.participants.length} participant{review.participants.length > 1 ? 's' : ''}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Risks Reviewed</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{review.risks_reviewed_count || 0}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">New Risks</p>
                  <p className="text-lg font-bold text-green-600">{review.new_risks_identified || 0}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Risks Closed</p>
                  <p className="text-lg font-bold text-red-600">{review.risks_closed || 0}</p>
                </div>
              </div>

              {review.key_findings && (
                <div className="mb-3">
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Key Findings</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                    {review.key_findings}
                  </p>
                </div>
              )}

              {review.actions_arising && (
                <div className="mb-3">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Actions Arising</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                    {review.actions_arising}
                  </p>
                </div>
              )}

              {review.next_review_date && (
                <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Next Review: {formatDate(review.next_review_date)}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

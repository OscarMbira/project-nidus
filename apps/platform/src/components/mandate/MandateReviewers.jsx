/**
 * MandateReviewers Component
 * Displays and manages reviewers for mandate review workflow
 * Platform only (not needed for Simulator practice)
 */

import { useState, useEffect } from 'react'
import { User, CheckCircle, XCircle, Clock } from 'lucide-react'
import { getReviewStatus, reviewMandate } from '../../services/mandateWorkflowService'

export default function MandateReviewers({ mandateId, readOnly = false }) {
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [reviewing, setReviewing] = useState(null)

  useEffect(() => {
    if (mandateId) {
      fetchReviews()
    }
  }, [mandateId])

  const fetchReviews = async () => {
    try {
      setLoading(true)
      const data = await getReviewStatus(mandateId)
      setReviews(data || [])
    } catch (error) {
      console.error('Error fetching reviews:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleReview = async (reviewId, status, comments) => {
    try {
      setReviewing(reviewId)
      await reviewMandate(reviewId, status, comments)
      await fetchReviews()
    } catch (error) {
      console.error('Error submitting review:', error)
      alert('Error submitting review: ' + error.message)
    } finally {
      setReviewing(null)
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'reviewed':
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'rejected':
        return <XCircle className="w-4 h-4 text-red-600" />
      default:
        return <Clock className="w-4 h-4 text-yellow-600" />
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'reviewed':
        return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
      case 'rejected':
        return 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
      default:
        return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
    }
  }

  if (loading) {
    return <div className="text-sm text-gray-500">Loading reviews...</div>
  }

  if (reviews.length === 0) {
    return (
      <div className="text-sm text-gray-500 dark:text-gray-400 italic">
        No reviewers assigned yet.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Reviewers</h3>
      {reviews.map((review) => (
        <div
          key={review.id}
          className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <User className="w-4 h-4 text-gray-400" />
                <span className="font-medium text-gray-900 dark:text-white">
                  {review.reviewer?.full_name || review.reviewer_name || 'Unknown Reviewer'}
                </span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(review.review_status)}`}>
                  {getStatusIcon(review.review_status)}
                  <span className="ml-1 capitalize">{review.review_status}</span>
                </span>
              </div>
              {review.review_date && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Reviewed: {new Date(review.review_date).toLocaleDateString()}
                </p>
              )}
              {review.review_comments && (
                <p className="text-sm text-gray-700 dark:text-gray-300 mt-2">
                  {review.review_comments}
                </p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

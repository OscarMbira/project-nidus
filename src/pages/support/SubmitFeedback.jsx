import { useState } from 'react'
import { MessageSquare, Send, Star } from 'lucide-react'
import { supabase } from '../../services/supabaseClient'
import { useToastContext } from '../../context/ToastContext'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Textarea } from '../../components/ui/Textarea'
import { Select } from '../../components/ui/Select'
import { useNavigate } from 'react-router-dom'

export default function SubmitFeedback() {
  const navigate = useNavigate()
  const toast = useToastContext()
  const [loading, setLoading] = useState(false)
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [formData, setFormData] = useState({
    feedback_type: 'general',
    feedback_text: '',
    page_url: window.location.pathname,
    rating: null
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        if (toast) {
          toast.error('Please log in to submit feedback')
        }
        return
      }

      const feedbackData = {
        ...formData,
        user_id: user.id,
        rating: rating || null,
        status: 'new',
        page_url: window.location.pathname,
        browser_info: navigator.userAgent
      }

      const { error } = await supabase
        .from('user_feedback')
        .insert([feedbackData])

      if (error) throw error

      if (toast) {
        toast.success('Thank you for your feedback!')
      }

      // Reset form
      setFormData({
        feedback_type: 'general',
        feedback_text: '',
        page_url: window.location.pathname,
        rating: null
      })
      setRating(0)

      // Optionally navigate away or show success message
      setTimeout(() => {
        navigate('/help')
      }, 2000)
    } catch (error) {
      console.error('Error submitting feedback:', error)
      if (toast) {
        toast.error('Failed to submit feedback. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleRatingClick = (value) => {
    setRating(value)
    setFormData({ ...formData, rating: value })
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <MessageSquare className="h-12 w-12 text-blue-600 dark:text-blue-400 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Submit Feedback
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            We value your feedback! Help us improve Project Nidus by sharing your thoughts, suggestions, or reporting issues.
          </p>
        </div>

        {/* Feedback Form */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Feedback Type */}
            <Select
              label="Feedback Type *"
              value={formData.feedback_type}
              onChange={(e) => setFormData({ ...formData, feedback_type: e.target.value })}
              required
            >
              <option value="general">General Feedback</option>
              <option value="bug_report">Bug Report</option>
              <option value="feature_request">Feature Request</option>
              <option value="usability">Usability Issue</option>
              <option value="performance">Performance Issue</option>
              <option value="compliment">Compliment</option>
            </Select>

            {/* Rating (optional) */}
            {formData.feedback_type !== 'bug_report' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Overall Rating (Optional)
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => handleRatingClick(value)}
                      onMouseEnter={() => setHoverRating(value)}
                      onMouseLeave={() => setHoverRating(0)}
                      className={`p-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        (hoverRating || rating) >= value
                          ? 'text-yellow-400'
                          : 'text-gray-300 dark:text-gray-600 hover:text-yellow-300'
                      }`}
                      aria-label={`Rate ${value} out of 5`}
                    >
                      <Star
                        className={`h-6 w-6 ${
                          (hoverRating || rating) >= value ? 'fill-current' : ''
                        }`}
                      />
                    </button>
                  ))}
                  {rating > 0 && (
                    <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                      {rating} / 5
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Feedback Text */}
            <Textarea
              label="Your Feedback *"
              value={formData.feedback_text}
              onChange={(e) => setFormData({ ...formData, feedback_text: e.target.value })}
              required
              rows={8}
              placeholder={
                formData.feedback_type === 'bug_report'
                  ? 'Please describe the bug in detail, including steps to reproduce...'
                  : formData.feedback_type === 'feature_request'
                  ? 'Describe the feature you would like to see...'
                  : 'Share your thoughts, suggestions, or feedback...'
              }
            />

            {/* Page URL (auto-filled) */}
            <Input
              label="Page URL"
              type="url"
              value={formData.page_url}
              onChange={(e) => setFormData({ ...formData, page_url: e.target.value })}
              placeholder="Current page URL"
              readOnly
              className="bg-gray-50 dark:bg-gray-700"
            />

            {/* Additional Context */}
            {formData.feedback_type === 'bug_report' && (
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-800 dark:text-blue-200 mb-2">
                  <strong>For bug reports, please include:</strong>
                </p>
                <ul className="text-sm text-blue-700 dark:text-blue-300 list-disc list-inside space-y-1">
                  <li>Steps to reproduce the issue</li>
                  <li>Expected behavior</li>
                  <li>Actual behavior</li>
                  <li>Browser and device information</li>
                  <li>Screenshots (if applicable)</li>
                </ul>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/help')}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                loading={loading}
                disabled={!formData.feedback_text || loading}
              >
                <Send className="h-4 w-4 mr-2" />
                Submit Feedback
              </Button>
            </div>
          </form>
        </div>

        {/* Help Text */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Need immediate help?{' '}
            <a href="/help/contact" className="text-blue-600 dark:text-blue-400 hover:underline">
              Contact Support
            </a>
            {' '}or visit the{' '}
            <a href="/help" className="text-blue-600 dark:text-blue-400 hover:underline">
              Help Center
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}


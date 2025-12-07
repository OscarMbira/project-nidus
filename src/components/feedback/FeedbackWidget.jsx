import { useState, useEffect, useRef } from 'react'
import { MessageSquare, X, Send, Camera, Image as ImageIcon } from 'lucide-react'
import { supabase } from '../../services/supabaseClient'
import { submitFeedback } from '../../services/feedbackService'
import { useToastContext } from '../../context/ToastContext'
import Button from '../ui/Button.jsx'
import Textarea from '../ui/Textarea.jsx'
import Select from '../ui/Select.jsx'

export default function FeedbackWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [screenshot, setScreenshot] = useState(null)
  const [userId, setUserId] = useState(null)
  const fileInputRef = useRef(null)
  const toast = useToastContext()

  const [formData, setFormData] = useState({
    feedback_type: 'general_feedback',
    feedback_text: '',
    rating: null,
    page_url: window.location.href
  })

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUserId(user?.id || null)
    }
    getUser()

    // Update page URL on navigation
    const handleLocationChange = () => {
      setFormData(prev => ({ ...prev, page_url: window.location.href }))
    }
    window.addEventListener('popstate', handleLocationChange)
    return () => window.removeEventListener('popstate', handleLocationChange)
  }, [])

  const handleScreenshotCapture = async () => {
    try {
      // Use html2canvas or similar library if available
      // For now, allow file upload
      fileInputRef.current?.click()
    } catch (error) {
      console.error('Error capturing screenshot:', error)
      toast.error('Failed to capture screenshot')
    }
  }

  const handleFileUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onloadend = () => {
          setScreenshot(reader.result)
        }
        reader.readAsDataURL(file)
      } else {
        toast.error('Please select an image file')
      }
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.feedback_text.trim()) {
      toast.error('Please enter your feedback')
      return
    }

    if (!userId) {
      toast.error('You must be logged in to submit feedback')
      return
    }

    setIsSubmitting(true)
    try {
      const feedbackData = {
        ...formData,
        page_url: window.location.href,
        browser_info: {
          platform: navigator.platform,
          language: navigator.language,
          userAgent: navigator.userAgent
        }
      }

      const result = await submitFeedback(
        userId,
        feedbackData.feedback_type,
        feedbackData.feedback_text,
        feedbackData.rating,
        feedbackData.page_url
      )

      if (result.success) {
        toast.success('Thank you for your feedback!')
        setIsOpen(false)
        setFormData({
          feedback_type: 'general_feedback',
          feedback_text: '',
          rating: null,
          page_url: window.location.href
        })
        setScreenshot(null)
      } else {
        toast.error(result.message || 'Failed to submit feedback')
      }
    } catch (error) {
      console.error('Error submitting feedback:', error)
      toast.error('Failed to submit feedback')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2"
        aria-label="Open feedback widget"
      >
        <MessageSquare className="h-6 w-6" />
        <span className="hidden sm:inline">Feedback</span>
      </button>
    )
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-96 max-w-[calc(100vw-3rem)] bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Send Feedback</h3>
        <button
          onClick={() => setIsOpen(false)}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          aria-label="Close feedback widget"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-4 space-y-4 max-h-[calc(100vh-12rem)] overflow-y-auto">
        <Select
          label="Feedback Type"
          value={formData.feedback_type}
          onChange={(e) => setFormData({ ...formData, feedback_type: e.target.value })}
        >
          <option value="general_feedback">General Feedback</option>
          <option value="bug_report">Bug Report</option>
          <option value="feature_request">Feature Request</option>
          <option value="usability_issue">Usability Issue</option>
          <option value="performance_issue">Performance Issue</option>
          <option value="compliment">Compliment</option>
        </Select>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Rating {formData.feedback_type === 'compliment' && '(optional)'}
          </label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((rating) => (
              <button
                key={rating}
                type="button"
                onClick={() => setFormData({ ...formData, rating })}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                  formData.rating === rating
                    ? 'bg-yellow-400 text-yellow-900'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
                aria-label={`Rate ${rating} star${rating > 1 ? 's' : ''}`}
              >
                ★
              </button>
            ))}
          </div>
        </div>

        <Textarea
          label="Your Feedback"
          value={formData.feedback_text}
          onChange={(e) => setFormData({ ...formData, feedback_text: e.target.value })}
          rows={5}
          placeholder="Tell us what you think..."
          required
        />

        {screenshot && (
          <div className="relative">
            <img
              src={screenshot}
              alt="Screenshot"
              className="w-full rounded-lg border border-gray-200 dark:border-gray-700"
            />
            <button
              type="button"
              onClick={() => setScreenshot(null)}
              className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1 hover:bg-red-700"
              aria-label="Remove screenshot"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={handleScreenshotCapture}
            icon={<Camera className="h-4 w-4" />}
            className="flex-1"
          >
            {screenshot ? 'Change' : 'Screenshot'}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>

        <div className="flex gap-2 pt-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setIsOpen(false)}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            loading={isSubmitting}
            icon={<Send className="h-4 w-4" />}
            className="flex-1"
          >
            Send
          </Button>
        </div>
      </form>
    </div>
  )
}


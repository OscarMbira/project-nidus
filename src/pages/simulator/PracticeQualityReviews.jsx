/**
 * Practice Quality Reviews – Simulator
 * List and manage practice quality reviews (sim schema).
 */

import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle, Plus, Calendar, Clock } from 'lucide-react'
import {
  getPracticeQualityReviews,
  deletePracticeQualityReview
} from '../../services/sim/practiceQualityService'
import { getMyPracticeProjects } from '../../services/sim/practiceProjectService'
import { simDb } from '../../services/supabase/supabaseClient'
import ExportListMenu from '../../components/ui/ExportListMenu'

const REVIEW_EXPORT_COLUMNS = [
  { key: 'review_title', label: 'Review' },
  { key: 'review_reference', label: 'Reference' },
  { key: 'review_type', label: 'Type' },
  { key: 'planned_date', label: 'Planned Date' },
  { key: 'review_status', label: 'Status' },
  { key: 'overall_score', label: 'Score' }
]

export default function PracticeQualityReviews() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const projectIdParam = searchParams.get('projectId')
  const [reviews, setReviews] = useState([])
  const [projects, setProjects] = useState([])
  const [selectedProjectId, setSelectedProjectId] = useState(projectIdParam || '')
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(null)

  useEffect(() => {
    loadProjects()
  }, [])

  useEffect(() => {
    if (selectedProjectId) loadReviews()
    else setReviews([])
  }, [selectedProjectId])

  const loadProjects = async () => {
    try {
      const { data: { user } } = await simDb.auth.getUser()
      if (!user) return
      const u = await simDb.from('users').select('id').eq('auth_user_id', user.id).single()
      if (u.data?.id) {
        const res = await getMyPracticeProjects(u.data.id)
        if (res.success) setProjects(res.data || [])
      }
      if (projectIdParam && !selectedProjectId) setSelectedProjectId(projectIdParam)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const loadReviews = async () => {
    if (!selectedProjectId) return
    setLoading(true)
    try {
      const res = await getPracticeQualityReviews({ practice_project_id: selectedProjectId })
      if (res.success) setReviews(res.data || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (review) => {
    if (!window.confirm(`Delete review "${review.review_title}"?`)) return
    try {
      setDeleting(review.id)
      await deletePracticeQualityReview(review.id)
      loadReviews()
    } catch (e) {
      alert('Error: ' + e.message)
    } finally {
      setDeleting(null)
    }
  }

  const getStatusColor = (s) => {
    if (s === 'completed') return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
    if (s === 'in-progress') return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
    if (s === 'planned') return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <button
          onClick={() => navigate('/simulator/practice-quality-register' + (selectedProjectId ? `?projectId=${selectedProjectId}` : ''))}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
        </button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
            Practice Quality Reviews
          </h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">Plan and manage practice quality reviews</p>
        </div>
        <div className="flex items-center gap-2">
          <ExportListMenu
            columns={REVIEW_EXPORT_COLUMNS}
            data={reviews.map(r => ({
              review_title: r.review_title,
              review_reference: r.review_reference || '',
              review_type: r.review_type || '',
              planned_date: r.planned_date || '',
              review_status: r.review_status || '',
              overall_score: r.overall_score != null ? `${Math.round(r.overall_score)}%` : ''
            }))}
            baseFilename="Practice-Quality-Reviews"
            disabled={!reviews.length}
          />
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Practice Project</label>
        <select
          value={selectedProjectId}
          onChange={(e) => setSelectedProjectId(e.target.value)}
          className="w-full max-w-md px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        >
          <option value="">Select project</option>
          {projects.map(p => (
            <option key={p.id} value={p.id}>{p.project_name} {p.project_code ? `(${p.project_code})` : ''}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" /></div>
      ) : !selectedProjectId ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center text-gray-500">Select a practice project to view reviews.</div>
      ) : reviews.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center text-gray-500">No practice quality reviews yet.</div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Review</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Planned Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Score</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {reviews.map(r => (
                <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">{r.review_title}</div>
                    {r.review_reference && <div className="text-xs text-gray-500">{r.review_reference}</div>}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white capitalize">{r.review_type?.replace('-', ' ') || '—'}</td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{r.planned_date ? new Date(r.planned_date).toLocaleDateString() : '—'}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full capitalize ${getStatusColor(r.review_status)}`}>
                      {r.review_status === 'in-progress' && <Clock className="h-3 w-3" />}
                      {r.review_status === 'completed' && <CheckCircle className="h-3 w-3" />}
                      {r.review_status?.replace('-', ' ') || '—'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">{r.overall_score != null ? `${Math.round(r.overall_score)}%` : '—'}</td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => handleDelete(r)} disabled={deleting === r.id} className="text-red-600 hover:text-red-800 dark:text-red-400 disabled:opacity-50 text-sm">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

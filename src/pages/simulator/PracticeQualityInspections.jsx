/**
 * Practice Quality Inspections – Simulator
 * List and manage practice quality inspections (sim schema).
 */

import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Search, CheckCircle, XCircle, Calendar } from 'lucide-react'
import {
  getPracticeQualityInspections,
  deletePracticeQualityInspection
} from '../../services/sim/practiceQualityService'
import { getMyPracticeProjects } from '../../services/sim/practiceProjectService'
import { simDb } from '../../services/supabase/supabaseClient'
import ExportListMenu from '../../components/ui/ExportListMenu'

const INSPECTION_EXPORT_COLUMNS = [
  { key: 'inspection_title', label: 'Inspection' },
  { key: 'inspection_reference', label: 'Reference' },
  { key: 'inspection_type', label: 'Type' },
  { key: 'inspection_date', label: 'Date' },
  { key: 'inspection_result', label: 'Result' },
  { key: 'defects_found_count', label: 'Defects' }
]

export default function PracticeQualityInspections() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const projectIdParam = searchParams.get('projectId')
  const [inspections, setInspections] = useState([])
  const [projects, setProjects] = useState([])
  const [selectedProjectId, setSelectedProjectId] = useState(projectIdParam || '')
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(null)

  useEffect(() => {
    loadProjects()
  }, [])

  useEffect(() => {
    if (selectedProjectId) loadInspections()
    else setInspections([])
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

  const loadInspections = async () => {
    if (!selectedProjectId) return
    setLoading(true)
    try {
      const res = await getPracticeQualityInspections({ practice_project_id: selectedProjectId })
      if (res.success) setInspections(res.data || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (inspection) => {
    if (!window.confirm(`Delete inspection "${inspection.inspection_title}"?`)) return
    try {
      setDeleting(inspection.id)
      await deletePracticeQualityInspection(inspection.id)
      loadInspections()
    } catch (e) {
      alert('Error: ' + e.message)
    } finally {
      setDeleting(null)
    }
  }

  const getResultColor = (result) => {
    if (result === 'passed') return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
    if (result === 'passed-with-conditions') return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
    if (result === 'failed') return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
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
            <Search className="h-8 w-8 text-purple-600 dark:text-purple-400" />
            Practice Quality Inspections
          </h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">Record and track practice inspection results</p>
        </div>
        <div className="flex items-center gap-2">
          <ExportListMenu
            columns={INSPECTION_EXPORT_COLUMNS}
            data={inspections.map(i => ({
              inspection_title: i.inspection_title,
              inspection_reference: i.inspection_reference || '',
              inspection_type: i.inspection_type || '',
              inspection_date: i.inspection_date || '',
              inspection_result: i.inspection_result || '',
              defects_found_count: i.defects_found_count ?? ''
            }))}
            baseFilename="Practice-Quality-Inspections"
            disabled={!inspections.length}
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
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center text-gray-500">Select a practice project to view inspections.</div>
      ) : inspections.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center text-gray-500">No practice quality inspections yet.</div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Inspection</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Defects</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Result</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {inspections.map(i => (
                <tr key={i.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">{i.inspection_title}</div>
                    {i.inspection_reference && <div className="text-xs text-gray-500">{i.inspection_reference}</div>}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white capitalize">{i.inspection_type?.replace('-', ' ') || '—'}</td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{i.inspection_date ? new Date(i.inspection_date).toLocaleDateString() : '—'}</td>
                  <td className="px-6 py-4 text-sm">{i.defects_found_count ?? '—'}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full capitalize ${getResultColor(i.inspection_result)}`}>
                      {i.inspection_result === 'passed' && <CheckCircle className="h-3 w-3" />}
                      {i.inspection_result === 'failed' && <XCircle className="h-3 w-3" />}
                      {i.inspection_result?.replace('-', ' ') || '—'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => handleDelete(i)} disabled={deleting === i.id} className="text-red-600 hover:text-red-800 dark:text-red-400 disabled:opacity-50 text-sm">Delete</button>
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

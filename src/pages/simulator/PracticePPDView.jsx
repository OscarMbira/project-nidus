/**
 * Practice Project Product Description View Page
 */

import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import ExportRecordButtons from '../../components/ui/ExportRecordButtons'

export default function PracticePPDView() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const projectId = searchParams.get('projectId')
  const [ppd, setPpd] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(false)
  }, [id])

  if (loading) return <div className="text-center py-12">Loading...</div>
  if (!ppd) return <div className="text-center py-12">PPD not found</div>

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button onClick={() => navigate(`/simulator/practice-ppd?projectId=${projectId}`)} className="mb-4 inline-flex items-center text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="h-4 w-4 mr-2" /> Back
      </button>
      <div className="flex justify-between items-start mb-6 flex-wrap gap-3">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Project Product Description</h1>
        <ExportRecordButtons onExportPPT={() => {}} onExportWord={() => {}} onExportExcel={() => {}} disabled />
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <p className="text-gray-500">PPD details coming soon</p>
      </div>
    </div>
  )
}

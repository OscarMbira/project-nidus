/**
 * Practice Governance Page
 */

import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Shield, Plus } from 'lucide-react'
import { getPracticeGovernanceDecisions, getPracticeDocumentRegister } from '../../services/sim/practiceGovernanceService'

export default function PracticeGovernance() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const projectId = searchParams.get('projectId')
  const [decisions, setDecisions] = useState([])
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('decisions')

  useEffect(() => {
    if (projectId) {
      loadData()
    }
  }, [projectId, activeTab])

  const loadData = async () => {
    try {
      setLoading(true)
      if (activeTab === 'decisions') {
        const result = await getPracticeGovernanceDecisions(projectId)
        if (result.success) setDecisions(result.data || [])
      } else {
        const result = await getPracticeDocumentRegister(projectId)
        if (result.success) setDocuments(result.data || [])
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Practice Governance</h1>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-6">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex -mb-px">
            {['decisions', 'documents'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 text-sm font-medium border-b-2 ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'decisions' && (
            <div>
              <div className="mb-4 flex justify-between items-center">
                <h2 className="text-xl font-semibold">Governance Decisions</h2>
                <button onClick={() => navigate(`/simulator/practice-governance/decision/create?projectId=${projectId}`)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-2 inline" /> Add Decision
                </button>
              </div>
              {decisions.length === 0 ? <p className="text-gray-500">No decisions found</p> : (
                <div className="space-y-4">
                  {decisions.map((decision) => (
                    <div key={decision.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                      <h3 className="font-semibold">{decision.decision_title}</h3>
                      <p className="text-sm text-gray-500">{decision.decision_date}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'documents' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Document Register</h2>
              {documents.length === 0 ? <p className="text-gray-500">No documents found</p> : (
                <div className="space-y-4">
                  {documents.map((doc) => (
                    <div key={doc.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                      <h3 className="font-semibold">{doc.document_title}</h3>
                      <p className="text-sm text-gray-500">Type: {doc.document_type}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

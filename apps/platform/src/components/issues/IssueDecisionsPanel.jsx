import { useState } from 'react'
import { Plus, CheckCircle, XCircle, Clock, AlertTriangle, User, Calendar } from 'lucide-react'
import { format } from 'date-fns'
import { recordDecision } from '../../services/issueDecisionService'
import DecisionForm from './DecisionForm'

export default function IssueDecisionsPanel({ issueId, issue, decisions, onRefresh }) {
  const [showDecisionForm, setShowDecisionForm] = useState(false)

  const getDecisionTypeColor = (type) => {
    switch (type) {
      case 'approve':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
      case 'reject':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
      case 'defer':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
      case 'escalate':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
      case 'accept_concession':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    }
  }

  const getDecisionIcon = (type) => {
    switch (type) {
      case 'approve':
        return CheckCircle
      case 'reject':
        return XCircle
      case 'defer':
        return Clock
      case 'escalate':
        return AlertTriangle
      default:
        return CheckCircle
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Decisions ({decisions.length})
        </h3>
        {(issue.status === 'awaiting_decision' || issue.status === 'under_assessment') && (
          <button
            onClick={() => setShowDecisionForm(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Record Decision
          </button>
        )}
      </div>

      {decisions.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <CheckCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>No decisions recorded yet.</p>
          {(issue.status === 'awaiting_decision' || issue.status === 'under_assessment') && (
            <p className="text-sm mt-2">Click "Record Decision" to add a decision.</p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {decisions.map((decision) => {
            const Icon = getDecisionIcon(decision.decision_type)
            return (
              <div
                key={decision.id}
                className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className={`p-2 rounded ${getDecisionTypeColor(decision.decision_type)}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getDecisionTypeColor(decision.decision_type)}`}>
                        {decision.decision_type.replace('_', ' ')}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {format(new Date(decision.decision_date), 'MMM dd, yyyy')}
                      </span>
                    </div>
                    <div className="mb-2">
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                        Decision Maker: <span className="font-medium text-gray-900 dark:text-white">
                          {decision.decision_maker_name}
                        </span>
                        {decision.decision_maker_role && (
                          <span className="text-gray-500 dark:text-gray-400"> ({decision.decision_maker_role})</span>
                        )}
                      </p>
                    </div>
                    <div className="mb-2">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Rationale:</p>
                      <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                        {decision.decision_rationale}
                      </p>
                    </div>
                    {decision.conditions && (
                      <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded">
                        <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300 mb-1">Conditions:</p>
                        <p className="text-sm text-yellow-700 dark:text-yellow-400 whitespace-pre-wrap">
                          {decision.conditions}
                        </p>
                      </div>
                    )}
                    {decision.review_date && (
                      <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                        Review Date: {format(new Date(decision.review_date), 'MMM dd, yyyy')}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showDecisionForm && (
        <DecisionForm
          issueId={issueId}
          issue={issue}
          onSave={() => {
            setShowDecisionForm(false)
            onRefresh()
          }}
          onCancel={() => setShowDecisionForm(false)}
        />
      )}
    </div>
  )
}

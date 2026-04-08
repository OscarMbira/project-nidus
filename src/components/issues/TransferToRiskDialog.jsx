import { useState } from 'react'
import { X, AlertTriangle, Link2 } from 'lucide-react'
import { transferToRisk } from '../../services/issueTransferService'

export default function TransferToRiskDialog({ issue, onClose, onSuccess }) {
  const [transferring, setTransferring] = useState(false)
  const [riskData, setRiskData] = useState({
    probability: 3,
    impact: 3,
    risk_category: ''
  })

  const handleTransfer = async () => {
    if (!confirm(`Transfer issue "${issue.issue_title}" to Risk Register?`)) return

    try {
      setTransferring(true)
      await transferToRisk(issue.id, riskData)
      alert('Issue transferred to Risk Register successfully!')
      onSuccess()
    } catch (error) {
      console.error('Error transferring issue:', error)
      alert('Error transferring issue: ' + error.message)
    } finally {
      setTransferring(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-orange-600" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Transfer to Risk Register
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300 mb-1">
                  Transferring Issue to Risk Register
                </p>
                <p className="text-sm text-yellow-700 dark:text-yellow-400">
                  This will create a new risk from this issue and close the issue. The issue will be linked to the new risk for traceability.
                </p>
              </div>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Issue: <span className="font-normal">{issue.issue_title}</span>
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {issue.issue_description?.substring(0, 100)}...
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Initial Risk Assessment
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  Probability (1-5)
                </label>
                <select
                  value={riskData.probability}
                  onChange={(e) => setRiskData({ ...riskData, probability: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  {[1, 2, 3, 4, 5].map(val => (
                    <option key={val} value={val}>{val}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  Impact (1-5)
                </label>
                <select
                  value={riskData.impact}
                  onChange={(e) => setRiskData({ ...riskData, impact: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  {[1, 2, 3, 4, 5].map(val => (
                    <option key={val} value={val}>{val}</option>
                  ))}
                </select>
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Risk Score: {riskData.probability * riskData.impact}
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              onClick={handleTransfer}
              disabled={transferring}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg flex items-center gap-2 disabled:opacity-50"
            >
              <Link2 className="h-4 w-4" />
              {transferring ? 'Transferring...' : 'Transfer to Risk'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

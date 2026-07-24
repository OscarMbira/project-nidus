import { Users, Plus, Trash2, Send, CheckCircle } from 'lucide-react'
import { useState, useEffect } from 'react'
import IssueReportApprovalWorkflow from './IssueReportApprovalWorkflow'

export default function IssueReportDistributionSection({
  formData,
  onChange,
  reportId,
  errors = {},
  readOnly = false
}) {
  const [distributionList, setDistributionList] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (reportId) {
      loadDistributionList()
    }
  }, [reportId])

  const loadDistributionList = async () => {
    try {
      setLoading(true)
      const { getDistributionList } = await import('../../services/issueReportDistributionService')
      const list = await getDistributionList(reportId)
      setDistributionList(list)
    } catch (error) {
      console.error('Error loading distribution list:', error)
    } finally {
      setLoading(false)
    }
  }

  const addRecipient = async () => {
    // This would open a modal to add recipient
    // For now, placeholder
    alert('Add recipient functionality - to be implemented')
  }

  const sendToDistribution = async () => {
    if (!reportId) return
    
    try {
      const { sendReportToDistribution } = await import('../../services/issueReportDistributionService')
      await sendReportToDistribution(reportId)
      alert('Report sent to distribution list')
      loadDistributionList()
    } catch (error) {
      console.error('Error sending to distribution:', error)
      alert('Error sending to distribution: ' + error.message)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Distribution & Approval</h3>
      </div>

      {/* Approval Workflow */}
      <div className="border-b border-gray-200 dark:border-gray-700 pb-6">
        <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-4">Approval Workflow</h4>
        {reportId ? (
          <IssueReportApprovalWorkflow reportId={reportId} readOnly={readOnly} />
        ) : (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 text-center text-gray-500 dark:text-gray-400">
            Save the report first to manage approvals
          </div>
        )}
      </div>

      {/* Distribution List */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-md font-semibold text-gray-900 dark:text-white">Distribution List</h4>
          {!readOnly && (
            <div className="flex gap-2">
              <button
                onClick={addRecipient}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Recipient
              </button>
              {distributionList.length > 0 && (
                <button
                  onClick={sendToDistribution}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  Send Report
                </button>
              )}
            </div>
          )}
        </div>

        {loading ? (
          <div className="text-center py-8">Loading distribution list...</div>
        ) : distributionList.length > 0 ? (
          <div className="space-y-2">
            {distributionList.map((item) => (
              <div
                key={item.id}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 flex items-center justify-between"
              >
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {item.recipient_name || item.recipient?.full_name || 'Unknown'}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {item.recipient_email || item.recipient?.email} • {item.recipient_role}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    Status: {item.distribution_status} • Version: {item.version_distributed}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {item.distribution_status === 'acknowledged' && (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  )}
                  {!readOnly && (
                    <button
                      onClick={() => {
                        if (confirm('Remove this recipient?')) {
                          // Remove recipient
                        }
                      }}
                      className="px-2 py-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-8 text-center text-gray-500 dark:text-gray-400">
            No distribution recipients added yet
          </div>
        )}
      </div>
    </div>
  )
}

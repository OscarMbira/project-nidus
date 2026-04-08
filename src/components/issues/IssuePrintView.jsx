/**
 * Issue Print View Component
 * Print-optimized view for Issue Register
 */

import { Printer, X, ArrowLeft } from 'lucide-react'

export default function IssuePrintView({ register, issues, onBack }) {
  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A'
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    } catch {
      return dateStr
    }
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'critical': return 'text-red-700'
      case 'high': return 'text-orange-700'
      case 'medium': return 'text-yellow-700'
      case 'low': return 'text-green-700'
      default: return 'text-gray-700'
    }
  }

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'text-red-700'
      case 'major': return 'text-orange-700'
      case 'moderate': return 'text-yellow-700'
      case 'minor': return 'text-gray-700'
      default: return 'text-gray-700'
    }
  }

  const typeLabels = {
    request_for_change: 'Request for Change (RFC)',
    off_specification: 'Off-Specification',
    problem_concern: 'Problem/Concern'
  }

  return (
    <div className="print-view min-h-screen bg-white">
      {/* Print Controls - Hidden when printing */}
      <div className="no-print fixed top-4 right-4 z-50 flex gap-2">
        <button
          onClick={onBack}
          className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to View
        </button>
        <button
          onClick={() => window.print()}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
        >
          <Printer className="h-4 w-4" />
          Print
        </button>
      </div>

      {/* Print Content */}
      <div className="print-content max-w-4xl mx-auto p-8">
        {/* Header */}
        <div className="mb-8 border-b-2 border-black pb-4">
          <h1 className="text-3xl font-bold mb-2">Issue Register</h1>
          {register && (
            <div className="space-y-1 text-sm">
              <p><strong>Reference:</strong> {register.register_reference || 'N/A'}</p>
              <p><strong>Version:</strong> {register.version_number || '1.0'}</p>
              {register.project && (
                <p><strong>Project:</strong> {register.project.project_name || register.project.project_code || 'N/A'}</p>
              )}
              <p><strong>Generated:</strong> {new Date().toLocaleString()}</p>
            </div>
          )}
        </div>

        {/* Issues Table */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Issues ({issues?.length || 0})</h2>
          
          {issues && issues.length > 0 ? (
            <table className="w-full border-collapse border border-gray-800 text-xs">
              <thead>
                <tr className="bg-gray-200">
                  <th className="border border-gray-800 p-2 text-left">ID</th>
                  <th className="border border-gray-800 p-2 text-left">Type</th>
                  <th className="border border-gray-800 p-2 text-left">Title</th>
                  <th className="border border-gray-800 p-2 text-center">Priority</th>
                  <th className="border border-gray-800 p-2 text-center">Severity</th>
                  <th className="border border-gray-800 p-2 text-center">Status</th>
                  <th className="border border-gray-800 p-2 text-left">Owner</th>
                  <th className="border border-gray-800 p-2 text-center">Date Raised</th>
                </tr>
              </thead>
              <tbody>
                {issues.map((issue, index) => (
                  <tr key={issue.id || index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="border border-gray-800 p-2 font-mono text-xs">
                      {issue.issue_identifier || `ISS-${index + 1}`}
                    </td>
                    <td className="border border-gray-800 p-2 capitalize">
                      {typeLabels[issue.issue_type] || issue.issue_type?.replace(/_/g, ' ') || 'N/A'}
                    </td>
                    <td className="border border-gray-800 p-2">{issue.issue_title || 'Untitled'}</td>
                    <td className={`border border-gray-800 p-2 text-center font-semibold ${getPriorityColor(issue.priority)}`}>
                      {(issue.priority || '').toUpperCase()}
                    </td>
                    <td className={`border border-gray-800 p-2 text-center font-semibold ${getSeverityColor(issue.severity)}`}>
                      {(issue.severity || '').toUpperCase()}
                    </td>
                    <td className="border border-gray-800 p-2 text-center capitalize">
                      {(issue.status || '').replace(/_/g, ' ')}
                    </td>
                    <td className="border border-gray-800 p-2">
                      {issue.owner?.full_name || issue.owner_name || 'Unassigned'}
                    </td>
                    <td className="border border-gray-800 p-2 text-center">
                      {issue.date_raised ? formatDate(issue.date_raised) : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-center py-8 text-gray-500">No issues registered</p>
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 pt-4 border-t border-gray-400 text-xs text-gray-600">
          <p>Issue Register - {register?.register_reference || 'N/A'}</p>
          <p>Generated on {new Date().toLocaleString()}</p>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          .no-print {
            display: none !important;
          }
          .print-view {
            background: white;
          }
          .print-content {
            max-width: 100%;
            padding: 0;
          }
          @page {
            margin: 2cm;
          }
          table {
            page-break-inside: auto;
          }
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
        }
        @media screen {
          .print-view {
            background: white;
            min-height: 100vh;
          }
        }
      `}</style>
    </div>
  )
}

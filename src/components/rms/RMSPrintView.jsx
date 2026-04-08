/**
 * RMS Print View Component
 * Printable format of Risk Management Strategy
 */

import { FileText, Download, Printer } from 'lucide-react'

export default function RMSPrintView({ rms, standards, methods, scales, matrices, strategies, tools, templates, records, reports, roles, activities }) {
  const handlePrint = () => {
    window.print()
  }

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

  if (!rms) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
        <p>No RMS data available for printing</p>
      </div>
    )
  }

  return (
    <div className="print-view">
      {/* Print controls - hidden when printing */}
      <div className="no-print mb-6 flex items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Print Preview</h2>
        <div className="flex items-center gap-3">
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 text-sm font-medium"
          >
            <Printer className="h-4 w-4" />
            Print
          </button>
        </div>
      </div>

      {/* Print content */}
      <div className="print-content bg-white text-black p-8" style={{ maxWidth: '8.5in', margin: '0 auto' }}>
        <h1 className="text-2xl font-bold mb-4 border-b-2 border-black pb-2">
          Risk Management Strategy
        </h1>

        <div className="mb-6 space-y-1 text-sm">
          <p><strong>Reference:</strong> {rms.rms_reference || 'N/A'}</p>
          <p><strong>Version:</strong> {rms.version_number || '1.0'}</p>
          <p><strong>Status:</strong> {(rms.status || 'draft').replace('_', ' ').toUpperCase()}</p>
          <p><strong>Project:</strong> {rms.project?.project_name || rms.project_name || 'N/A'} ({rms.project?.project_code || rms.project_code || 'N/A'})</p>
          {rms.author && <p><strong>Author:</strong> {rms.author.full_name || rms.author_name || 'N/A'}</p>}
          {rms.owner && <p><strong>Owner:</strong> {rms.owner.full_name || rms.owner_name || 'N/A'}</p>}
          {rms.approved_date && <p><strong>Approved Date:</strong> {formatDate(rms.approved_date)}</p>}
          {rms.approved_by_user && <p><strong>Approved By:</strong> {rms.approved_by_user.full_name || 'N/A'}</p>}
        </div>

        {rms.purpose && (
          <div className="mb-6">
            <h2 className="text-lg font-bold mb-2 border-b border-gray-300 pb-1">Purpose</h2>
            <p className="text-justify whitespace-pre-wrap">{rms.purpose}</p>
          </div>
        )}

        {rms.objectives && (
          <div className="mb-6">
            <h2 className="text-lg font-bold mb-2 border-b border-gray-300 pb-1">Objectives</h2>
            <p className="text-justify whitespace-pre-wrap">{rms.objectives}</p>
          </div>
        )}

        {rms.scope && (
          <div className="mb-6">
            <h2 className="text-lg font-bold mb-2 border-b border-gray-300 pb-1">Scope</h2>
            <p className="text-justify whitespace-pre-wrap">{rms.scope}</p>
          </div>
        )}

        {rms.strategy_responsibility && (
          <div className="mb-6">
            <h2 className="text-lg font-bold mb-2 border-b border-gray-300 pb-1">Strategy Responsibility</h2>
            <p className="text-justify whitespace-pre-wrap">{rms.strategy_responsibility}</p>
          </div>
        )}

        {rms.risk_identification_approach && (
          <div className="mb-6">
            <h2 className="text-lg font-bold mb-2 border-b border-gray-300 pb-1">Risk Identification Approach</h2>
            <p className="text-justify whitespace-pre-wrap">{rms.risk_identification_approach}</p>
          </div>
        )}

        {rms.risk_assessment_approach && (
          <div className="mb-6">
            <h2 className="text-lg font-bold mb-2 border-b border-gray-300 pb-1">Risk Assessment Approach</h2>
            <p className="text-justify whitespace-pre-wrap">{rms.risk_assessment_approach}</p>
          </div>
        )}

        {rms.risk_response_approach && (
          <div className="mb-6">
            <h2 className="text-lg font-bold mb-2 border-b border-gray-300 pb-1">Risk Response Approach</h2>
            <p className="text-justify whitespace-pre-wrap">{rms.risk_response_approach}</p>
          </div>
        )}

        {rms.risk_monitoring_approach && (
          <div className="mb-6">
            <h2 className="text-lg font-bold mb-2 border-b border-gray-300 pb-1">Risk Monitoring Approach</h2>
            <p className="text-justify whitespace-pre-wrap">{rms.risk_monitoring_approach}</p>
          </div>
        )}

        {standards && standards.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-bold mb-2 border-b border-gray-300 pb-1">Risk Standards ({standards.length})</h2>
            <table className="w-full border-collapse border border-black mt-2">
              <thead>
                <tr className="bg-gray-200">
                  <th className="border border-black p-2 text-left">Code</th>
                  <th className="border border-black p-2 text-left">Name</th>
                  <th className="border border-black p-2 text-left">Type</th>
                  <th className="border border-black p-2 text-left">Compliance Level</th>
                </tr>
              </thead>
              <tbody>
                {standards.map((standard, index) => (
                  <tr key={standard.id || index}>
                    <td className="border border-black p-2">{standard.standard_code || 'N/A'}</td>
                    <td className="border border-black p-2">{standard.standard_name || 'N/A'}</td>
                    <td className="border border-black p-2">{standard.standard_type || 'N/A'}</td>
                    <td className="border border-black p-2">{standard.compliance_level || 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {methods && methods.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-bold mb-2 border-b border-gray-300 pb-1">Risk Identification Methods ({methods.length})</h2>
            {methods.map((method, index) => (
              <div key={method.id || index} className="mb-4 p-3 border border-gray-300">
                <h3 className="text-sm font-bold mb-1">{index + 1}. {method.method_name || 'N/A'}</h3>
                <p className="text-xs mb-1"><strong>Type:</strong> {method.method_type || 'N/A'}</p>
                <p className="text-xs text-justify">{method.method_description || ''}</p>
                {method.frequency && <p className="text-xs mt-1"><strong>Frequency:</strong> {method.frequency}</p>}
              </div>
            ))}
          </div>
        )}

        {roles && roles.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-bold mb-2 border-b border-gray-300 pb-1">Roles and Responsibilities ({roles.length})</h2>
            {roles.map((role, index) => (
              <div key={role.id || index} className="mb-4 p-3 border border-gray-300">
                <h3 className="text-sm font-bold mb-1">{index + 1}. {role.role_name || 'N/A'}</h3>
                <p className="text-xs text-justify">{role.role_description || ''}</p>
                {role.independence_level && <p className="text-xs mt-1"><strong>Independence Level:</strong> {role.independence_level}</p>}
              </div>
            ))}
          </div>
        )}

        {activities && activities.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-bold mb-2 border-b border-gray-300 pb-1">Scheduled Activities ({activities.length})</h2>
            <table className="w-full border-collapse border border-black mt-2">
              <thead>
                <tr className="bg-gray-200">
                  <th className="border border-black p-2 text-left">Activity</th>
                  <th className="border border-black p-2 text-left">Type</th>
                  <th className="border border-black p-2 text-left">Frequency</th>
                  <th className="border border-black p-2 text-left">Responsible Role</th>
                </tr>
              </thead>
              <tbody>
                {activities.map((activity, index) => (
                  <tr key={activity.id || index}>
                    <td className="border border-black p-2">{activity.activity_name || 'N/A'}</td>
                    <td className="border border-black p-2">{activity.activity_type || 'N/A'}</td>
                    <td className="border border-black p-2">{activity.frequency || 'N/A'}</td>
                    <td className="border border-black p-2">{activity.responsible_role || 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-8 pt-4 border-t border-black text-xs text-center text-gray-600">
          <p>Generated on {new Date().toLocaleString()}</p>
          <p>Risk Management Strategy Reference: {rms.rms_reference || 'N/A'}</p>
        </div>
      </div>

      <style>{`
        @media print {
          .no-print {
            display: none !important;
          }
          .print-content {
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          body {
            background: white !important;
          }
          @page {
            margin: 1in;
          }
        }
      `}</style>
    </div>
  )
}

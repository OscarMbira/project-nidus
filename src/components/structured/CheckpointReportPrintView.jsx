import { Download, Printer, FileText } from 'lucide-react'
import { format } from 'date-fns'
import { exportCheckpointReportToPDF, exportCheckpointReportToWord } from '../../utils/checkpointReportExport'

export default function CheckpointReportPrintView({ report, products = [], qualityActivities = [], followUps = [], lessons = [], qualityStatus = null }) {
  if (!report) return null

  const handlePrint = () => {
    window.print()
  }

  const handleExportPDF = async () => {
    try {
      await exportCheckpointReportToPDF(report, products, qualityActivities, followUps, lessons, qualityStatus)
    } catch (error) {
      console.error('Error exporting PDF:', error)
      alert('Error exporting PDF: ' + error.message)
    }
  }

  const handleExportWord = async () => {
    try {
      await exportCheckpointReportToWord(report, products, qualityActivities, followUps, lessons, qualityStatus)
    } catch (error) {
      console.error('Error exporting Word:', error)
      alert('Error exporting Word: ' + error.message)
    }
  }

  return (
    <div className="print-view">
      {/* Print Controls - Hidden when printing */}
      <div className="no-print mb-6 flex gap-3">
        <button
          onClick={handlePrint}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
        >
          <Printer className="h-5 w-5" />
          Print
        </button>
        <button
          onClick={handleExportPDF}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center gap-2"
        >
          <Download className="h-5 w-5" />
          Export PDF
        </button>
        <button
          onClick={handleExportWord}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2"
        >
          <FileText className="h-5 w-5" />
          Export Word
        </button>
      </div>

      {/* Print Content */}
      <div className="bg-white text-black p-8 print-content">
        {/* Header */}
        <div className="border-b-2 border-black pb-4 mb-6">
          <h1 className="text-3xl font-bold mb-2">
            {report.report_title || 'Checkpoint Report'}
          </h1>
          {report.document_ref && (
            <p className="text-sm">
              <strong>Document Reference:</strong> {report.document_ref} | <strong>Version:</strong> {report.version_no || '1.0'}
            </p>
          )}
        </div>

        {/* Document Information */}
        <div className="mb-6">
          <h2 className="text-xl font-bold mb-3 border-b border-gray-300 pb-2">Document Information</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <strong>Checkpoint Date:</strong> {report.checkpoint_date && format(new Date(report.checkpoint_date), 'dd MMM yyyy')}
            </div>
            {report.period_start_date && report.period_end_date && (
              <div>
                <strong>Reporting Period:</strong> {format(new Date(report.period_start_date), 'dd MMM yyyy')} - {format(new Date(report.period_end_date), 'dd MMM yyyy')}
              </div>
            )}
            {report.author && (
              <div>
                <strong>Author:</strong> {report.author.full_name || report.author.email}
              </div>
            )}
            {report.owner && (
              <div>
                <strong>Owner:</strong> {report.owner.full_name || report.owner.email}
              </div>
            )}
            {report.client && (
              <div>
                <strong>Client:</strong> {report.client.full_name || report.client.email}
              </div>
            )}
            <div>
              <strong>Status:</strong> {report.status}
            </div>
          </div>
        </div>

        {/* Report Summary */}
        {report.report_summary && (
          <div className="mb-6">
            <h2 className="text-xl font-bold mb-3 border-b border-gray-300 pb-2">Report Summary</h2>
            <p className="whitespace-pre-wrap">{report.report_summary}</p>
          </div>
        )}

        {/* Progress Summary */}
        {report.progress_summary && (
          <div className="mb-6">
            <h2 className="text-xl font-bold mb-3 border-b border-gray-300 pb-2">Progress Summary</h2>
            <p className="whitespace-pre-wrap">{report.progress_summary}</p>
          </div>
        )}

        {/* Products */}
        {products.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xl font-bold mb-3 border-b border-gray-300 pb-2">Products & Deliverables</h2>
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 p-2 text-left">Product Name</th>
                  <th className="border border-gray-300 p-2 text-left">Status</th>
                  <th className="border border-gray-300 p-2 text-left">Quality Status</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id}>
                    <td className="border border-gray-300 p-2">{product.product_name}</td>
                    <td className="border border-gray-300 p-2">{product.product_status.replace('_', ' ')}</td>
                    <td className="border border-gray-300 p-2">{product.quality_status?.replace('_', ' ') || 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Quality Activities */}
        {qualityActivities.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xl font-bold mb-3 border-b border-gray-300 pb-2">Quality Activities</h2>
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 p-2 text-left">Activity</th>
                  <th className="border border-gray-300 p-2 text-left">Type</th>
                  <th className="border border-gray-300 p-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {qualityActivities.map((activity) => (
                  <tr key={activity.id}>
                    <td className="border border-gray-300 p-2">{activity.activity_name}</td>
                    <td className="border border-gray-300 p-2">{activity.activity_type}</td>
                    <td className="border border-gray-300 p-2">{activity.status.replace('_', ' ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Follow-Ups */}
        {followUps.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xl font-bold mb-3 border-b border-gray-300 pb-2">Follow-Up Items</h2>
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 p-2 text-left">Item</th>
                  <th className="border border-gray-300 p-2 text-left">Status</th>
                  <th className="border border-gray-300 p-2 text-left">Resolution</th>
                </tr>
              </thead>
              <tbody>
                {followUps.map((followUp) => (
                  <tr key={followUp.id}>
                    <td className="border border-gray-300 p-2">{followUp.follow_up_item}</td>
                    <td className="border border-gray-300 p-2">{followUp.status.replace('_', ' ')}</td>
                    <td className="border border-gray-300 p-2">{followUp.resolution || 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Lessons */}
        {lessons.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xl font-bold mb-3 border-b border-gray-300 pb-2">Lessons Identified</h2>
            {lessons.map((lesson) => (
              <div key={lesson.id} className="mb-4 pb-4 border-b border-gray-200">
                <h3 className="font-semibold mb-2">{lesson.lesson_title}</h3>
                <p className="text-sm mb-2">{lesson.lesson_description}</p>
                {lesson.recommendation && (
                  <p className="text-sm">
                    <strong>Recommendation:</strong> {lesson.recommendation}
                  </p>
                )}
                <div className="text-xs text-gray-600 mt-2">
                  Type: {lesson.lesson_type} | Category: {lesson.category} | Impact: {lesson.impact}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tolerance Status */}
        {(report.tolerance_time_status || report.tolerance_cost_status || report.tolerance_scope_status) && (
          <div className="mb-6">
            <h2 className="text-xl font-bold mb-3 border-b border-gray-300 pb-2">Tolerance Status</h2>
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 p-2 text-left">Type</th>
                  <th className="border border-gray-300 p-2 text-right">Actual</th>
                  <th className="border border-gray-300 p-2 text-right">Forecast</th>
                  <th className="border border-gray-300 p-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-gray-300 p-2">Time</td>
                  <td className="border border-gray-300 p-2 text-right">{report.time_actual || 0} days</td>
                  <td className="border border-gray-300 p-2 text-right">{report.time_forecast || 0} days</td>
                  <td className="border border-gray-300 p-2">{report.tolerance_time_status || 'within'}</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 p-2">Cost</td>
                  <td className="border border-gray-300 p-2 text-right">${(report.cost_actual || 0).toLocaleString()}</td>
                  <td className="border border-gray-300 p-2 text-right">${(report.cost_forecast || 0).toLocaleString()}</td>
                  <td className="border border-gray-300 p-2">{report.tolerance_cost_status || 'within'}</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 p-2">Scope</td>
                  <td className="border border-gray-300 p-2 text-right">{(report.scope_actual_percentage || 0).toFixed(1)}%</td>
                  <td className="border border-gray-300 p-2 text-right">{(report.scope_forecast_percentage || 0).toFixed(1)}%</td>
                  <td className="border border-gray-300 p-2">{report.tolerance_scope_status || 'within'}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Issues & Risks */}
        {(report.issues_summary || report.risks_summary) && (
          <div className="mb-6">
            <h2 className="text-xl font-bold mb-3 border-b border-gray-300 pb-2">Issues & Risks</h2>
            {report.issues_summary && (
              <div className="mb-4">
                <h3 className="font-semibold mb-2">Issues Summary</h3>
                <p className="whitespace-pre-wrap text-sm">{report.issues_summary}</p>
              </div>
            )}
            {report.risks_summary && (
              <div>
                <h3 className="font-semibold mb-2">Risks Summary</h3>
                <p className="whitespace-pre-wrap text-sm">{report.risks_summary}</p>
              </div>
            )}
          </div>
        )}

        {/* Quality Check Status */}
        {qualityStatus && (
          <div className="mb-6">
            <h2 className="text-xl font-bold mb-3 border-b border-gray-300 pb-2">Quality Check Status</h2>
            <p className="text-sm mb-2">
              <strong>Completion:</strong> {qualityStatus.completion_percentage?.toFixed(0) || 0}% | 
              <strong> Passed:</strong> {qualityStatus.passed || 0} | 
              <strong> Failed:</strong> {qualityStatus.failed || 0} | 
              <strong> Needs Review:</strong> {qualityStatus.needs_review || 0}
            </p>
            {qualityStatus.can_submit ? (
              <p className="text-green-600 font-semibold">✓ Ready to Submit</p>
            ) : (
              <p className="text-red-600 font-semibold">✗ Cannot Submit - Blocking Issues Present</p>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 pt-4 border-t border-gray-300 text-xs text-gray-600">
          <p>Generated: {format(new Date(), 'dd MMM yyyy HH:mm')}</p>
          {report.work_package && (
            <p>Work Package: {report.work_package.work_package_name}</p>
          )}
        </div>
      </div>

      <style>{`
        @media print {
          .no-print {
            display: none;
          }
          .print-content {
            max-width: 100%;
            margin: 0;
            padding: 20px;
          }
          @page {
            margin: 2cm;
          }
        }
        .print-view {
          font-family: Arial, sans-serif;
        }
      `}</style>
    </div>
  )
}

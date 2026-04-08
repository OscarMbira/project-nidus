import { Download, Printer, FileText } from 'lucide-react'
import { format } from 'date-fns'
import { exportEndProjectReportToPDF, exportEndProjectReportToWord } from '../../../utils/eprExport'

export default function EPRPrintView({
  report,
  businessCaseReviews = [],
  objectivesReviews = [],
  teamPerformance = [],
  qualityRecords = [],
  approvalRecords = [],
  offSpecifications = [],
  lessons = [],
  followOnActions = [],
  qualityStatus = null
}) {
  if (!report) return null

  const handlePrint = () => {
    window.print()
  }

  const handleExportPDF = async () => {
    try {
      await exportEndProjectReportToPDF(
        report,
        businessCaseReviews,
        objectivesReviews,
        teamPerformance,
        qualityRecords,
        approvalRecords,
        offSpecifications,
        lessons,
        followOnActions,
        qualityStatus
      )
    } catch (error) {
      console.error('Error exporting PDF:', error)
      alert('Error exporting PDF: ' + error.message)
    }
  }

  const handleExportWord = async () => {
    try {
      await exportEndProjectReportToWord(
        report,
        businessCaseReviews,
        objectivesReviews,
        teamPerformance,
        qualityRecords,
        approvalRecords,
        offSpecifications,
        lessons,
        followOnActions,
        qualityStatus
      )
    } catch (error) {
      console.error('Error exporting Word:', error)
      alert('Error exporting Word: ' + error.message)
    }
  }

  const formatCurrency = (value) => {
    if (!value) return 'N/A'
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
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
            {report.report_title || 'End Project Report'}
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
              <strong>Report Date:</strong> {report.report_date && format(new Date(report.report_date), 'dd MMM yyyy')}
            </div>
            {report.date_of_this_revision && (
              <div>
                <strong>Date of This Revision:</strong> {format(new Date(report.date_of_this_revision), 'dd MMM yyyy')}
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
              <strong>Closure Type:</strong> {report.closure_type || 'normal'}
            </div>
            <div>
              <strong>Status:</strong> {report.approval_status || 'draft'}
            </div>
          </div>
        </div>

        {/* Executive Summary */}
        {report.executive_summary && (
          <div className="mb-6">
            <h2 className="text-xl font-bold mb-3 border-b border-gray-300 pb-2">Executive Summary</h2>
            <p className="whitespace-pre-wrap">{report.executive_summary}</p>
          </div>
        )}

        {/* Project Manager's Report */}
        {report.project_managers_report && (
          <div className="mb-6">
            <h2 className="text-xl font-bold mb-3 border-b border-gray-300 pb-2">Project Manager's Report</h2>
            <p className="whitespace-pre-wrap">{report.project_managers_report}</p>
          </div>
        )}

        {/* Abnormal Situations */}
        {report.abnormal_situations && (
          <div className="mb-6">
            <h2 className="text-xl font-bold mb-3 border-b border-gray-300 pb-2">Abnormal Situations</h2>
            <p className="mb-2"><strong>Description:</strong></p>
            <p className="whitespace-pre-wrap mb-4">{report.abnormal_situations}</p>
            {report.abnormal_situations_impact && (
              <>
                <p className="mb-2"><strong>Impact:</strong></p>
                <p className="whitespace-pre-wrap">{report.abnormal_situations_impact}</p>
              </>
            )}
          </div>
        )}

        {/* Business Case Review */}
        {businessCaseReviews.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xl font-bold mb-3 border-b border-gray-300 pb-2">Business Case Review</h2>
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 p-2 text-left">Benefit Description</th>
                  <th className="border border-gray-300 p-2 text-left">Type</th>
                  <th className="border border-gray-300 p-2 text-right">Target Value</th>
                  <th className="border border-gray-300 p-2 text-right">Actual Value</th>
                  <th className="border border-gray-300 p-2 text-right">Variance</th>
                  <th className="border border-gray-300 p-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {businessCaseReviews.map((benefit) => (
                  <tr key={benefit.id}>
                    <td className="border border-gray-300 p-2">{benefit.benefit_description || 'N/A'}</td>
                    <td className="border border-gray-300 p-2">{benefit.benefit_type || 'N/A'}</td>
                    <td className="border border-gray-300 p-2 text-right">{benefit.original_target_value ? formatCurrency(benefit.original_target_value) : 'N/A'}</td>
                    <td className="border border-gray-300 p-2 text-right">{benefit.actual_value ? formatCurrency(benefit.actual_value) : 'N/A'}</td>
                    <td className="border border-gray-300 p-2 text-right">{benefit.variance_percentage ? `${benefit.variance_percentage.toFixed(1)}%` : 'N/A'}</td>
                    <td className="border border-gray-300 p-2">{benefit.is_post_project ? 'Post-Project' : 'Achieved'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Objectives Review */}
        {objectivesReviews.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xl font-bold mb-3 border-b border-gray-300 pb-2">Objectives Performance Review</h2>
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 p-2 text-left">Objective Area</th>
                  <th className="border border-gray-300 p-2 text-left">Target</th>
                  <th className="border border-gray-300 p-2 text-left">Actual</th>
                  <th className="border border-gray-300 p-2 text-left">Within Tolerance</th>
                  <th className="border border-gray-300 p-2 text-left">Performance Rating</th>
                </tr>
              </thead>
              <tbody>
                {objectivesReviews.map((objective) => (
                  <tr key={objective.id}>
                    <td className="border border-gray-300 p-2">{objective.objective_area || 'N/A'}</td>
                    <td className="border border-gray-300 p-2">{objective.original_target || 'N/A'}</td>
                    <td className="border border-gray-300 p-2">{objective.actual_value || 'N/A'}</td>
                    <td className="border border-gray-300 p-2">{objective.within_tolerance ? 'Yes' : 'No'}</td>
                    <td className="border border-gray-300 p-2">{objective.performance_rating || 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Team Performance */}
        {teamPerformance.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xl font-bold mb-3 border-b border-gray-300 pb-2">Team Performance & Recognition</h2>
            {teamPerformance.map((team) => (
              <div key={team.id} className="mb-4 pb-4 border-b border-gray-200">
                <h3 className="font-semibold mb-2">{team.team_name || 'Team Member'}</h3>
                <p className="text-sm mb-2"><strong>Role:</strong> {team.role || 'N/A'} | <strong>Type:</strong> {team.performance_type || 'N/A'}</p>
                <p className="text-sm mb-2">{team.performance_description || ''}</p>
                {team.achievements && team.achievements.length > 0 && (
                  <>
                    <p className="text-sm font-semibold mb-1">Achievements:</p>
                    <ul className="list-disc list-inside text-sm">
                      {team.achievements.map((achievement, idx) => (
                        <li key={idx}>{achievement}</li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Quality Records */}
        {qualityRecords.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xl font-bold mb-3 border-b border-gray-300 pb-2">Quality Records</h2>
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 p-2 text-left">Activity Name</th>
                  <th className="border border-gray-300 p-2 text-left">Type</th>
                  <th className="border border-gray-300 p-2 text-left">Product</th>
                  <th className="border border-gray-300 p-2 text-left">Planned Date</th>
                  <th className="border border-gray-300 p-2 text-left">Actual Date</th>
                  <th className="border border-gray-300 p-2 text-left">Status</th>
                  <th className="border border-gray-300 p-2 text-left">Result</th>
                </tr>
              </thead>
              <tbody>
                {qualityRecords.map((record) => (
                  <tr key={record.id}>
                    <td className="border border-gray-300 p-2">{record.activity_name || 'N/A'}</td>
                    <td className="border border-gray-300 p-2">{record.activity_type || 'N/A'}</td>
                    <td className="border border-gray-300 p-2">{record.product_name || 'N/A'}</td>
                    <td className="border border-gray-300 p-2">{record.planned_date ? format(new Date(record.planned_date), 'dd MMM yyyy') : 'N/A'}</td>
                    <td className="border border-gray-300 p-2">{record.actual_date ? format(new Date(record.actual_date), 'dd MMM yyyy') : 'N/A'}</td>
                    <td className="border border-gray-300 p-2">{record.status || 'N/A'}</td>
                    <td className="border border-gray-300 p-2">{record.result || 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Approval Records */}
        {approvalRecords.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xl font-bold mb-3 border-b border-gray-300 pb-2">Product Approval Records</h2>
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 p-2 text-left">Product Name</th>
                  <th className="border border-gray-300 p-2 text-left">Approval Status</th>
                  <th className="border border-gray-300 p-2 text-left">Approver</th>
                  <th className="border border-gray-300 p-2 text-left">Approval Date</th>
                  <th className="border border-gray-300 p-2 text-left">Conditions</th>
                </tr>
              </thead>
              <tbody>
                {approvalRecords.map((record) => (
                  <tr key={record.id}>
                    <td className="border border-gray-300 p-2">{record.product_name || 'N/A'}</td>
                    <td className="border border-gray-300 p-2">{record.approval_status || 'N/A'}</td>
                    <td className="border border-gray-300 p-2">{record.approver_name || 'N/A'}</td>
                    <td className="border border-gray-300 p-2">{record.approval_date ? format(new Date(record.approval_date), 'dd MMM yyyy') : 'N/A'}</td>
                    <td className="border border-gray-300 p-2">{record.conditions || 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Off-Specifications */}
        {offSpecifications.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xl font-bold mb-3 border-b border-gray-300 pb-2">Off-Specifications</h2>
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 p-2 text-left">Type</th>
                  <th className="border border-gray-300 p-2 text-left">Product</th>
                  <th className="border border-gray-300 p-2 text-left">Deviation Description</th>
                  <th className="border border-gray-300 p-2 text-left">Concession Granted</th>
                  <th className="border border-gray-300 p-2 text-left">Impact Assessment</th>
                </tr>
              </thead>
              <tbody>
                {offSpecifications.map((offSpec) => (
                  <tr key={offSpec.id}>
                    <td className="border border-gray-300 p-2">{offSpec.off_spec_type || 'N/A'}</td>
                    <td className="border border-gray-300 p-2">{offSpec.product_name || 'N/A'}</td>
                    <td className="border border-gray-300 p-2">{offSpec.deviation_description || 'N/A'}</td>
                    <td className="border border-gray-300 p-2">{offSpec.concession_granted ? 'Yes' : 'No'}</td>
                    <td className="border border-gray-300 p-2">{offSpec.impact_assessment || 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Lessons Learned */}
        {lessons.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xl font-bold mb-3 border-b border-gray-300 pb-2">Lessons Learned</h2>
            {lessons.map((lesson) => (
              <div key={lesson.id} className="mb-4 pb-4 border-b border-gray-200">
                <h3 className="font-semibold mb-2">{lesson.title || 'Lesson'}</h3>
                <p className="text-sm mb-2">Type: {lesson.lesson_type || 'N/A'} | Category: {lesson.category || 'N/A'} | Impact: {lesson.impact || 'N/A'}</p>
                <p className="text-sm mb-2">{lesson.description || ''}</p>
                {lesson.recommendation && (
                  <p className="text-sm">
                    <strong>Recommendation:</strong> {lesson.recommendation}
                  </p>
                )}
                {lesson.is_escalated_corporate && (
                  <span className="inline-block mt-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded">Escalated to Corporate</span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Follow-On Actions */}
        {followOnActions.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xl font-bold mb-3 border-b border-gray-300 pb-2">Follow-On Actions</h2>
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 p-2 text-left">Source</th>
                  <th className="border border-gray-300 p-2 text-left">Source Reference</th>
                  <th className="border border-gray-300 p-2 text-left">Documentation Attached</th>
                  <th className="border border-gray-300 p-2 text-left">Board Advice Requested</th>
                  <th className="border border-gray-300 p-2 text-left">Recommended Recipient</th>
                </tr>
              </thead>
              <tbody>
                {followOnActions.map((action) => (
                  <tr key={action.id}>
                    <td className="border border-gray-300 p-2">{action.source_type || 'N/A'}</td>
                    <td className="border border-gray-300 p-2">{action.source_reference || 'N/A'}</td>
                    <td className="border border-gray-300 p-2">{action.documentation_attached ? 'Yes' : 'No'}</td>
                    <td className="border border-gray-300 p-2">{action.project_board_advice_requested ? 'Yes' : 'No'}</td>
                    <td className="border border-gray-300 p-2">{action.recommended_recipient || 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Quality Check Status */}
        {qualityStatus && (
          <div className="mb-6">
            <h2 className="text-xl font-bold mb-3 border-b border-gray-300 pb-2">Quality Criteria Validation</h2>
            <p className="text-sm mb-2">
              <strong>Completion:</strong> {qualityStatus.completion_percentage?.toFixed(0) || 0}% | 
              <strong> Passed:</strong> {qualityStatus.passed || 0} | 
              <strong> Failed:</strong> {qualityStatus.failed || 0} | 
              <strong> Needs Review:</strong> {qualityStatus.needs_review || 0}
            </p>
            {qualityStatus.can_close_project ? (
              <p className="text-green-600 font-semibold">✓ Project Can Be Closed</p>
            ) : (
              <p className="text-red-600 font-semibold">✗ Cannot Close Project - Blocking Issues Present</p>
            )}
            {qualityStatus.blocking_issues && qualityStatus.blocking_issues.length > 0 && (
              <div className="mt-2">
                <p className="font-semibold mb-1">Blocking Issues:</p>
                <ul className="list-disc list-inside text-sm">
                  {qualityStatus.blocking_issues.map((issue, idx) => (
                    <li key={idx}>{issue}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Project Assurance Agreement */}
        {report.project_assurance_agreement !== null && (
          <div className="mb-6">
            <h2 className="text-xl font-bold mb-3 border-b border-gray-300 pb-2">Project Assurance Agreement</h2>
            <p className="mb-2"><strong>Agreement:</strong> {report.project_assurance_agreement ? 'Yes' : 'No'}</p>
            {report.project_assurance_notes && (
              <>
                <p className="mb-2"><strong>Notes:</strong></p>
                <p className="whitespace-pre-wrap">{report.project_assurance_notes}</p>
              </>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 pt-4 border-t border-gray-300 text-xs text-gray-600">
          <p>Generated: {format(new Date(), 'dd MMM yyyy HH:mm')}</p>
          {report.project && (
            <p>Project: {report.project.project_name} ({report.project.project_code})</p>
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

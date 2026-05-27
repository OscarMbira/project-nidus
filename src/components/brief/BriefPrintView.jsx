/**
 * Brief Print View Component
 * Print-optimized view with proper formatting
 */

import { useEffect } from 'react'
import BriefHeader from './BriefHeader'
import { Printer, Download, FileText } from 'lucide-react'
import { exportBriefToWord } from '../../services/briefWordExportService'

export default function BriefPrintView({ brief, project, mandate }) {
  useEffect(() => {
    // Add print-specific styles
    const style = document.createElement('style')
    style.textContent = `
      @media print {
        .no-print {
          display: none !important;
        }
        .print-break {
          page-break-after: always;
        }
        body {
          background: white !important;
        }
        .dark\\:bg-gray-800 {
          background: white !important;
        }
        .dark\\:text-white {
          color: black !important;
        }
      }
    `
    document.head.appendChild(style)
    return () => document.head.removeChild(style)
  }, [])

  const handlePrint = () => {
    window.print()
  }

  const handleExportPDF = () => {
    // Use browser's print to PDF functionality
    window.print()
  }

  const handleExportWord = async () => {
    try {
      await exportBriefToWord(brief, project, mandate)
    } catch (error) {
      console.error('Error exporting brief to Word:', error)
      alert('Failed to export Word document.')
    }
  }

  if (!brief) {
    return <div className="text-center py-8">No brief data available</div>
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 bg-white text-black">
      {/* Print Actions - Hidden when printing */}
      <div className="no-print mb-6 flex justify-end gap-2">
        <button
          onClick={handlePrint}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center"
        >
          <Printer className="w-4 h-4 mr-2" />
          Print
        </button>
        <button
          onClick={handleExportPDF}
          className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center"
        >
          <Download className="w-4 h-4 mr-2" />
          Export PDF
        </button>
        <button
          onClick={handleExportWord}
          className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center"
        >
          <FileText className="w-4 h-4 mr-2" />
          Export Word
        </button>
      </div>

      {/* Brief Header */}
      <div className="mb-8 border-b-2 border-gray-300 pb-4">
        <h1 className="text-3xl font-bold mb-2">PROJECT BRIEF</h1>
        <p className="text-lg font-semibold">{brief.brief_reference}</p>
        {project && (
          <p className="text-sm text-gray-600 mt-1">
            Project: {project.project_name} {project.project_code && `(${project.project_code})`}
          </p>
        )}
        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div>
            <strong>Version:</strong> {brief.version_number || '1.0'}
          </div>
          <div>
            <strong>Status:</strong> {brief.document_status?.toUpperCase() || 'DRAFT'}
          </div>
          <div>
            <strong>Created:</strong> {brief.created_date || 'N/A'}
          </div>
          {brief.approved_date && (
            <div>
              <strong>Approved:</strong> {brief.approved_date}
            </div>
          )}
        </div>
      </div>

      {/* Section 3: Project Definition */}
      <div className="mb-6 print-break">
        <h2 className="text-2xl font-bold mb-4 border-b border-gray-300 pb-2">3. Project Definition</h2>
        {brief.background && (
          <div className="mb-4">
            <h3 className="text-lg font-semibold mb-2">Background</h3>
            <p className="text-sm whitespace-pre-wrap">{brief.background}</p>
          </div>
        )}
        {brief.project_objectives && (
          <div className="mb-4">
            <h3 className="text-lg font-semibold mb-2">Project Objectives</h3>
            <p className="text-sm whitespace-pre-wrap">{brief.project_objectives}</p>
          </div>
        )}
        {brief.desired_outcomes && (
          <div className="mb-4">
            <h3 className="text-lg font-semibold mb-2">Desired Outcomes</h3>
            <p className="text-sm whitespace-pre-wrap">{brief.desired_outcomes}</p>
          </div>
        )}
      </div>

      {/* Scope */}
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-3">Project Scope</h2>
        {brief.project_scope && (
          <div className="mb-3">
            <h3 className="font-semibold mb-1">In Scope</h3>
            <p className="text-sm whitespace-pre-wrap">{brief.project_scope}</p>
          </div>
        )}
        {brief.scope_exclusions && (
          <div className="mb-3">
            <h3 className="font-semibold mb-1">Out of Scope</h3>
            <p className="text-sm whitespace-pre-wrap">{brief.scope_exclusions}</p>
          </div>
        )}
        {brief.constraints && (
          <div className="mb-3">
            <h3 className="font-semibold mb-1">Constraints</h3>
            <p className="text-sm whitespace-pre-wrap">{brief.constraints}</p>
          </div>
        )}
        {brief.assumptions && (
          <div>
            <h3 className="font-semibold mb-1">Assumptions</h3>
            <p className="text-sm whitespace-pre-wrap">{brief.assumptions}</p>
          </div>
        )}
      </div>

      {/* Section 4: Outline Business Case */}
      {brief.outline_business_case_summary && (
        <div className="mb-6 print-break">
          <h2 className="text-2xl font-bold mb-4 border-b border-gray-300 pb-2">4. Outline Business Case</h2>
          <p className="text-sm whitespace-pre-wrap">{brief.outline_business_case_summary}</p>
          {brief.business_option_selected && (
            <p className="mt-3 text-sm">
              <strong>Business Option Selected:</strong> {brief.business_option_selected.replace('_', ' ')}
            </p>
          )}
        </div>
      )}

      {/* Section 5: Product Description */}
      {brief.product_description && (
        <div className="mb-6 print-break">
          <h2 className="text-2xl font-bold mb-4 border-b border-gray-300 pb-2">5. Project Product Description</h2>
          <p className="text-sm whitespace-pre-wrap">{brief.product_description}</p>
          {brief.customer_quality_expectations && (
            <div className="mt-4">
              <h3 className="font-semibold mb-2">Quality Expectations</h3>
              <p className="text-sm whitespace-pre-wrap">{brief.customer_quality_expectations}</p>
            </div>
          )}
        </div>
      )}

      {/* Section 6: Project Approach */}
      {brief.project_approach_description && (
        <div className="mb-6 print-break">
          <h2 className="text-2xl font-bold mb-4 border-b border-gray-300 pb-2">6. Project Approach</h2>
          <p className="text-sm whitespace-pre-wrap mb-4">{brief.project_approach_description}</p>
          <div className="grid grid-cols-3 gap-4 text-sm">
            {brief.solution_type && (
              <div>
                <strong>Solution Type:</strong> {brief.solution_type.replace('_', ' ')}
              </div>
            )}
            {brief.delivery_approach && (
              <div>
                <strong>Delivery:</strong> {brief.delivery_approach.replace('_', ' ')}
              </div>
            )}
            {brief.development_approach && (
              <div>
                <strong>Development:</strong> {brief.development_approach.replace('_', ' ')}
              </div>
            )}
          </div>
          {brief.approach_justification && (
            <div className="mt-4">
              <h3 className="font-semibold mb-2">Justification</h3>
              <p className="text-sm whitespace-pre-wrap">{brief.approach_justification}</p>
            </div>
          )}
        </div>
      )}

      {/* Section 7 & 8: Team Structure */}
      {brief.team_structure_description && (
        <div className="mb-6 print-break">
          <h2 className="text-2xl font-bold mb-4 border-b border-gray-300 pb-2">7. Team Structure</h2>
          <p className="text-sm whitespace-pre-wrap">{brief.team_structure_description}</p>
        </div>
      )}

      {/* Authorship */}
      <div className="mt-8 pt-6 border-t-2 border-gray-300 print-break">
        <h2 className="text-xl font-bold mb-4">Document Authorship</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <strong>Author:</strong> {brief.author_name || brief.author?.full_name || 'N/A'}
          </div>
          <div>
            <strong>Owner:</strong> {brief.owner_name || brief.owner?.full_name || 'N/A'}
          </div>
          {brief.client_name && (
            <div>
              <strong>Client:</strong> {brief.client_name || brief.client?.full_name || 'N/A'}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 pt-4 border-t border-gray-300 text-xs text-center text-gray-500">
        <p>Generated on {new Date().toLocaleString()}</p>
        <p>Project Brief Reference: {brief.brief_reference}</p>
      </div>
    </div>
  )
}

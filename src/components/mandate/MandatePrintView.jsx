/**
 * MandatePrintView Component
 * Print-optimized view for Project Mandate documents
 * Works for both Platform and Simulator
 */

import { Download, Printer, FileText } from 'lucide-react'
import MandateHeader from './MandateHeader'
import { format } from 'date-fns'

export default function MandatePrintView({ mandate, deliverables = [], stakeholders = [], isPractice = false }) {
  if (!mandate) return null

  const handlePrint = () => {
    window.print()
  }

  const handleExportPDF = () => {
    // Use browser print dialog - user can save as PDF
    window.print()
  }

  const handleExportText = () => {
    // Export as plain text
    const content = generateTextExport(mandate, deliverables, stakeholders)
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${mandate.mandate_reference}_${format(new Date(), 'yyyy-MM-dd')}.txt`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const generateTextExport = (mandate, deliverables, stakeholders) => {
    let text = 'PROJECT MANDATE\n'
    text += '='.repeat(50) + '\n\n'
    text += `Reference: ${mandate.mandate_reference}\n`
    text += `Title: ${mandate.mandate_title}\n`
    text += `Version: ${mandate.version_number || '1.0'}\n`
    text += `Status: ${mandate.document_status}\n`
    text += `Created: ${mandate.created_date || 'N/A'}\n`
    if (isPractice) text += `Practice Mode\n`
    text += '\n' + '='.repeat(50) + '\n\n'

    text += '1. PURPOSE\n'
    text += '-'.repeat(50) + '\n'
    text += (mandate.purpose || 'Not specified') + '\n\n'

    if (mandate.authority_responsible) {
      text += '2. AUTHORITY RESPONSIBLE\n'
      text += '-'.repeat(50) + '\n'
      text += mandate.authority_responsible + '\n\n'
    }

    text += '3. BACKGROUND\n'
    text += '-'.repeat(50) + '\n'
    text += (mandate.background || 'Not specified') + '\n\n'

    text += '4. PROJECT OBJECTIVES\n'
    text += '-'.repeat(50) + '\n'
    text += (mandate.project_objectives || 'Not specified') + '\n\n'

    if (mandate.scope) {
      text += '5. SCOPE\n'
      text += '-'.repeat(50) + '\n'
      text += 'In Scope:\n' + mandate.scope + '\n\n'
      if (mandate.scope_exclusions) {
        text += 'Out of Scope:\n' + mandate.scope_exclusions + '\n\n'
      }
    }

    if (deliverables.length > 0) {
      text += 'DELIVERABLES\n'
      text += '-'.repeat(50) + '\n'
      deliverables.filter(d => d.is_in_scope !== false).forEach((d, idx) => {
        text += `${idx + 1}. ${d.deliverable_name}\n`
        if (d.deliverable_description) text += `   ${d.deliverable_description}\n`
        if (d.estimated_completion) text += `   Estimated: ${d.estimated_completion}\n`
      })
      text += '\n'
    }

    if (mandate.constraints) {
      text += '6. CONSTRAINTS\n'
      text += '-'.repeat(50) + '\n'
      text += mandate.constraints + '\n\n'
    }

    if (mandate.interfaces) {
      text += '7. INTERFACES\n'
      text += '-'.repeat(50) + '\n'
      text += mandate.interfaces + '\n\n'
    }

    if (mandate.quality_expectations || mandate.quality_priority) {
      text += '8. QUALITY EXPECTATIONS\n'
      text += '-'.repeat(50) + '\n'
      if (mandate.quality_priority) text += `Priority: ${mandate.quality_priority}\n`
      if (mandate.quality_expectations) text += mandate.quality_expectations + '\n\n'
    }

    text += '9. OUTLINE BUSINESS CASE\n'
    text += '-'.repeat(50) + '\n'
    text += (mandate.outline_business_case || 'Not specified') + '\n\n'

    if (mandate.proposed_executive_name || mandate.proposed_pm_name) {
      text += '11. PROPOSED ROLES\n'
      text += '-'.repeat(50) + '\n'
      if (mandate.proposed_executive_name) text += `Executive: ${mandate.proposed_executive_name}\n`
      if (mandate.proposed_pm_name) text += `Project Manager: ${mandate.proposed_pm_name}\n`
      text += '\n'
    }

    if (stakeholders.length > 0) {
      text += '12. CUSTOMERS AND USERS\n'
      text += '-'.repeat(50) + '\n'
      stakeholders.forEach((s, idx) => {
        text += `${idx + 1}. ${s.stakeholder_name} (${s.stakeholder_type})\n`
        if (s.stakeholder_organisation) text += `   Organisation: ${s.stakeholder_organisation}\n`
        if (s.stakeholder_role) text += `   Role: ${s.stakeholder_role}\n`
        if (s.contact_email) text += `   Email: ${s.contact_email}\n`
      })
      text += '\n'
    }

    text += '\n' + '='.repeat(50) + '\n'
    text += `Generated: ${format(new Date(), 'dd MMMM yyyy HH:mm')}\n`
    if (isPractice) text += 'This is a practice mandate for learning purposes.\n'

    return text
  }

  return (
    <>
      {/* Print Actions - Hidden when printing */}
      <div className="no-print mb-6 flex justify-end space-x-3">
        <button
          onClick={handleExportText}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center"
        >
          <Download className="w-4 h-4 mr-2" />
          Export as Text
        </button>
        <button
          onClick={handleExportPDF}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
        >
          <FileText className="w-4 h-4 mr-2" />
          Export as PDF
        </button>
        <button
          onClick={handlePrint}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center"
        >
          <Printer className="w-4 h-4 mr-2" />
          Print
        </button>
      </div>

      {/* Print View */}
      <div className="print-view bg-white text-black">
        <style>{`
          @media print {
            @page {
              size: A4;
              margin: 2cm;
            }
            .no-print {
              display: none !important;
            }
            body {
              background: white !important;
              color: black !important;
            }
            .print-view {
              background: white !important;
              color: black !important;
            }
          }
          .print-view h1 {
            font-size: 24px;
            margin-bottom: 10px;
            color: #1f2937;
          }
          .print-view h2 {
            font-size: 18px;
            margin-top: 24px;
            margin-bottom: 12px;
            color: #374151;
            border-bottom: 2px solid #e5e7eb;
            padding-bottom: 6px;
          }
          .print-view h3 {
            font-size: 16px;
            margin-top: 20px;
            margin-bottom: 10px;
            color: #4b5563;
          }
          .print-view p {
            margin-bottom: 12px;
            line-height: 1.6;
          }
          .print-view ul, .print-view ol {
            margin-bottom: 12px;
            padding-left: 24px;
          }
          .print-view li {
            margin-bottom: 6px;
          }
        `}</style>

        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">{mandate.mandate_title}</h1>
          <div className="text-sm text-gray-600 space-y-1">
            <p><strong>Reference:</strong> {mandate.mandate_reference}</p>
            <p><strong>Version:</strong> {mandate.version_number || '1.0'}</p>
            <p><strong>Status:</strong> {mandate.document_status}</p>
            <p><strong>Created:</strong> {mandate.created_date ? format(new Date(mandate.created_date), 'dd MMMM yyyy') : 'N/A'}</p>
            {isPractice && <p><strong>Practice Mode:</strong> For learning purposes</p>}
          </div>
        </div>

        <div className="space-y-8">
          {/* Section 1: Purpose */}
          <section>
            <h2>1. Purpose</h2>
            <p className="whitespace-pre-wrap">{mandate.purpose || 'Not specified'}</p>
          </section>

          {/* Section 2: Authority Responsible */}
          {mandate.authority_responsible && (
            <section>
              <h2>2. Authority Responsible</h2>
              <p className="whitespace-pre-wrap">{mandate.authority_responsible}</p>
            </section>
          )}

          {/* Section 3: Background */}
          <section>
            <h2>3. Background</h2>
            <p className="whitespace-pre-wrap">{mandate.background || 'Not specified'}</p>
          </section>

          {/* Section 4: Project Objectives */}
          <section>
            <h2>4. Project Objectives</h2>
            <p className="whitespace-pre-wrap">{mandate.project_objectives || 'Not specified'}</p>
          </section>

          {/* Section 5: Scope */}
          {(mandate.scope || deliverables.length > 0) && (
            <section>
              <h2>5. Scope</h2>
              {mandate.scope && (
                <>
                  <h3>In Scope</h3>
                  <p className="whitespace-pre-wrap">{mandate.scope}</p>
                </>
              )}
              {deliverables.length > 0 && (
                <>
                  <h3>Key Deliverables</h3>
                  <ul>
                    {deliverables.filter(d => d.is_in_scope !== false).map((d, idx) => (
                      <li key={d.id}>
                        <strong>{d.deliverable_name}</strong>
                        {d.deliverable_description && ` - ${d.deliverable_description}`}
                        {d.estimated_completion && ` (Estimated: ${d.estimated_completion})`}
                      </li>
                    ))}
                  </ul>
                </>
              )}
              {mandate.scope_exclusions && (
                <>
                  <h3>Out of Scope</h3>
                  <p className="whitespace-pre-wrap">{mandate.scope_exclusions}</p>
                </>
              )}
            </section>
          )}

          {/* Section 6: Constraints */}
          {mandate.constraints && (
            <section>
              <h2>6. Constraints</h2>
              <p className="whitespace-pre-wrap">{mandate.constraints}</p>
            </section>
          )}

          {/* Section 7: Interfaces */}
          {mandate.interfaces && (
            <section>
              <h2>7. Interfaces</h2>
              <p className="whitespace-pre-wrap">{mandate.interfaces}</p>
            </section>
          )}

          {/* Section 8: Quality Expectations */}
          {(mandate.quality_expectations || mandate.quality_priority) && (
            <section>
              <h2>8. Quality Expectations</h2>
              {mandate.quality_priority && (
                <p><strong>Priority:</strong> {mandate.quality_priority}</p>
              )}
              {mandate.quality_expectations && (
                <p className="whitespace-pre-wrap">{mandate.quality_expectations}</p>
              )}
            </section>
          )}

          {/* Section 9: Outline Business Case */}
          <section>
            <h2>9. Outline Business Case</h2>
            <p className="whitespace-pre-wrap">{mandate.outline_business_case || 'Not specified'}</p>
          </section>

          {/* Section 11: Proposed Roles */}
          {(mandate.proposed_executive_name || mandate.proposed_pm_name) && (
            <section>
              <h2>11. Proposed Roles</h2>
              {mandate.proposed_executive_name && (
                <p><strong>Executive:</strong> {mandate.proposed_executive_name}</p>
              )}
              {mandate.proposed_pm_name && (
                <p><strong>Project Manager:</strong> {mandate.proposed_pm_name}</p>
              )}
            </section>
          )}

          {/* Section 12: Customers and Users */}
          {stakeholders.length > 0 && (
            <section>
              <h2>12. Customers and Users</h2>
              <ul>
                {stakeholders.map((s) => (
                  <li key={s.id}>
                    <strong>{s.stakeholder_name}</strong> ({s.stakeholder_type})
                    {s.stakeholder_organisation && ` - ${s.stakeholder_organisation}`}
                    {s.stakeholder_role && ` (${s.stakeholder_role})`}
                    {s.contact_email && ` - ${s.contact_email}`}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <div className="mt-12 pt-8 border-t text-xs text-gray-500 text-center">
          <p>Generated: {format(new Date(), 'dd MMMM yyyy HH:mm')}</p>
          {isPractice && <p>Practice Mode - For learning purposes only</p>}
        </div>
      </div>
    </>
  )
}

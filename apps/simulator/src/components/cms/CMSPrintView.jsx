/**
 * CMS Print View Component
 * Print-friendly format
 */

import { FileText, Calendar, User } from 'lucide-react'

export default function CMSPrintView({ cmsData, sections = {} }) {
  if (!cmsData) {
    return (
      <div className="text-center py-12 text-gray-500">
        No CMS data available for printing
      </div>
    )
  }

  const formatDate = (date) => {
    if (!date) return 'N/A'
    return new Date(date).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    })
  }

  return (
    <div className="print:p-8 print:bg-white print:text-black" style={{ fontFamily: 'serif' }}>
      {/* Print Styles */}
      <style>{`
        @media print {
          body { margin: 0; padding: 0; }
          .no-print { display: none !important; }
          .print-break { page-break-after: always; }
          .print-avoid-break { page-break-inside: avoid; }
        }
      `}</style>

      {/* Header */}
      <div className="print-break print-avoid-break mb-8 border-b-2 border-gray-900 pb-4">
        <div className="flex items-center gap-3 mb-4">
          <FileText className="w-8 h-8" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              COMMUNICATION MANAGEMENT STRATEGY
            </h1>
            {cmsData.cms_reference && (
              <p className="text-lg text-gray-700 mt-1">
                Reference: {cmsData.cms_reference}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <strong>Version:</strong> {cmsData.version_number || '1.0'}
          </div>
          <div>
            <strong>Status:</strong> {cmsData.status?.toUpperCase() || 'DRAFT'}
          </div>
          {cmsData.created_at && (
            <div>
              <strong>Created:</strong> {formatDate(cmsData.created_at)}
            </div>
          )}
          {cmsData.owner_name && (
            <div>
              <strong>Owner:</strong> {cmsData.owner_name}
            </div>
          )}
        </div>
      </div>

      {/* Introduction Section */}
      {cmsData.purpose && (
        <section className="print-avoid-break mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-3 border-b border-gray-700 pb-1">
            1. Purpose
          </h2>
          <p className="text-gray-900 whitespace-pre-wrap">{cmsData.purpose}</p>
        </section>
      )}

      {cmsData.objectives && (
        <section className="print-avoid-break mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-3 border-b border-gray-700 pb-1">
            2. Objectives
          </h2>
          <p className="text-gray-900 whitespace-pre-wrap">{cmsData.objectives}</p>
        </section>
      )}

      {cmsData.scope && (
        <section className="print-avoid-break mb-6 print-break">
          <h2 className="text-xl font-bold text-gray-900 mb-3 border-b border-gray-700 pb-1">
            3. Scope
          </h2>
          <p className="text-gray-900 whitespace-pre-wrap">{cmsData.scope}</p>
        </section>
      )}

      {/* Communication Procedures */}
      {cmsData.communication_planning_approach && (
        <section className="print-avoid-break mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-3 border-b border-gray-700 pb-1">
            4. Communication Planning Approach
          </h2>
          <p className="text-gray-900 whitespace-pre-wrap">{cmsData.communication_planning_approach}</p>
        </section>
      )}

      {cmsData.communication_control_approach && (
        <section className="print-avoid-break mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-3 border-b border-gray-700 pb-1">
            5. Communication Control Approach
          </h2>
          <p className="text-gray-900 whitespace-pre-wrap">{cmsData.communication_control_approach}</p>
        </section>
      )}

      {cmsData.communication_assurance_approach && (
        <section className="print-avoid-break mb-6 print-break">
          <h2 className="text-xl font-bold text-gray-900 mb-3 border-b border-gray-700 pb-1">
            6. Communication Assurance Approach
          </h2>
          <p className="text-gray-900 whitespace-pre-wrap">{cmsData.communication_assurance_approach}</p>
        </section>
      )}

      {/* Additional Sections Placeholder */}
      {sections.channels && sections.channels.length > 0 && (
        <section className="print-avoid-break mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-3 border-b border-gray-700 pb-1">
            7. Communication Channels
          </h2>
          {sections.channels.map((channel, index) => (
            <div key={index} className="mb-4">
              <h3 className="font-semibold text-gray-900">{channel.channel_name}</h3>
              <p className="text-gray-900 text-sm">{channel.channel_description}</p>
            </div>
          ))}
        </section>
      )}

      {/* Footer */}
      <div className="print-avoid-break mt-12 pt-4 border-t border-gray-700 text-xs text-gray-600 text-center">
        <p>Printed on {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}</p>
        <p className="mt-1">This document is confidential and should not be distributed without authorization.</p>
      </div>
    </div>
  )
}

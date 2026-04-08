/**
 * RFPPrintView - Print-friendly RFP document layout
 * Renders RFP header, service provider, and line items for printing/physical distribution
 */

import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import * as defaultRfpService from '../../services/rfpService'
import RFPStatusBadge from './RFPStatusBadge'

export default function RFPPrintView({ rfpService = defaultRfpService } = {}) {
  const { id } = useParams()
  const { getRFPById, getLineItems } = rfpService
  const [rfp, setRfp] = useState(null)
  const [lineItems, setLineItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    const load = async () => {
      try {
        const [doc, items] = await Promise.all([getRFPById(id), getLineItems(id)])
        setRfp(doc)
        setLineItems(items || [])
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  if (loading || !rfp) {
    return <div className="p-8 text-gray-500">Loading...</div>
  }

  return (
    <div className="rfp-print-view max-w-4xl mx-auto p-8 bg-white text-black print:p-4">
      {/* Print-specific: hide when not printing via media query handled by caller */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">{rfp.rfp_title}</h1>
        <p className="text-gray-600 mt-2">
          {rfp.rfp_reference} · <RFPStatusBadge status={rfp.status} /> · {rfp.rfp_category || 'N/A'}
        </p>
      </div>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-300 pb-2 mb-4">RFP Details</h2>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div><dt className="text-gray-600">Category</dt><dd>{rfp.rfp_category || '-'}</dd></div>
          <div><dt className="text-gray-600">Original Reference</dt><dd>{rfp.original_document_ref || '-'}</dd></div>
          <div><dt className="text-gray-600">Original Issue Date</dt><dd>{rfp.original_issue_date || '-'}</dd></div>
          <div className="col-span-2"><dt className="text-gray-600">Description</dt><dd className="mt-1">{rfp.rfp_description || '-'}</dd></div>
        </dl>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-300 pb-2 mb-4">Service Provider</h2>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div><dt className="text-gray-600">Name</dt><dd>{rfp.service_provider_name || '-'}</dd></div>
          <div><dt className="text-gray-600">Code</dt><dd>{rfp.service_provider_code || '-'}</dd></div>
          <div><dt className="text-gray-600">Contract Value</dt><dd>{rfp.contract_value != null ? `${rfp.currency || 'USD'} ${rfp.contract_value}` : '-'}</dd></div>
        </dl>
        {Array.isArray(rfp.service_provider_contacts) && rfp.service_provider_contacts.length > 0 ? (
          <div className="mt-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Contact persons</h3>
            <table className="min-w-full border border-gray-300 text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-2 py-1 text-left border-b border-gray-300 font-medium">Contact Person</th>
                  <th className="px-2 py-1 text-left border-b border-gray-300 font-medium">Email</th>
                  <th className="px-2 py-1 text-left border-b border-gray-300 font-medium">Phone</th>
                  <th className="px-2 py-1 text-left border-b border-gray-300 font-medium">Mobile</th>
                </tr>
              </thead>
              <tbody>
                {rfp.service_provider_contacts.map((c, i) => (
                  <tr key={i} className="border-b border-gray-200">
                    <td className="px-2 py-1">{c.contact_person || '-'}</td>
                    <td className="px-2 py-1">{c.email || '-'}</td>
                    <td className="px-2 py-1">{c.phone || '-'}</td>
                    <td className="px-2 py-1">{c.mobile || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <dl className="grid grid-cols-2 gap-3 text-sm mt-2">
            <div><dt className="text-gray-600">Contact Person</dt><dd>{rfp.service_provider_contact_person || '-'}</dd></div>
            <div><dt className="text-gray-600">Email</dt><dd>{rfp.service_provider_email || '-'}</dd></div>
            <div><dt className="text-gray-600">Phone</dt><dd>{rfp.service_provider_phone || '-'}</dd></div>
          </dl>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-300 pb-2 mb-4">Line Items ({lineItems.length})</h2>
        <table className="min-w-full border border-gray-300 text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="px-3 py-2 text-left border-b border-gray-300 font-medium">S/No</th>
              <th className="px-3 py-2 text-left border-b border-gray-300 font-medium">Reference</th>
              <th className="px-3 py-2 text-left border-b border-gray-300 font-medium">Scope/Entity</th>
              <th className="px-3 py-2 text-left border-b border-gray-300 font-medium">Business Area</th>
              <th className="px-3 py-2 text-left border-b border-gray-300 font-medium">Description</th>
              <th className="px-3 py-2 text-left border-b border-gray-300 font-medium">Vendor Response</th>
            </tr>
          </thead>
          <tbody>
            {lineItems.map((item) => (
              <tr key={item.id} className="border-b border-gray-200">
                <td className="px-3 py-2">{item.item_number}</td>
                <td className="px-3 py-2">{item.reference_number || '-'}</td>
                <td className="px-3 py-2">{item.scope_entity || '-'}</td>
                <td className="px-3 py-2">{item.business_area || '-'}</td>
                <td className="px-3 py-2">{item.description || '-'}</td>
                <td className="px-3 py-2">{item.vendor_response || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <p className="text-xs text-gray-500 mt-8">Printed from Nidus PMO · {new Date().toLocaleString()}</p>
    </div>
  )
}

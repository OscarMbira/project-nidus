/**
 * RFPDetailView - Detail view with readOnly prop
 * PMO Admin: Edit, Delete, Status Change buttons
 * Others: read-only, Export/Print only
 */

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, FileDown, Upload, Paperclip, ExternalLink } from 'lucide-react'
import { RowActionButton } from '@nidus/ui'
import * as defaultRfpService from '../../services/rfpService'
import { downloadRFPLineItemsCSV } from '../../services/rfpBulkImportService'
import RFPStatusBadge from './RFPStatusBadge'
import RFPLineItemsTable from './RFPLineItemsTable'
import ExportRecordButtons from '../ui/ExportRecordButtons'
import { exportRecordToExcel, exportRecordToWord, exportRecordToPPT, exportRecordToCSV, exportRecordToXML, exportRecordToJSON, exportRecordToPrint } from '@nidus/shared/utils/exportUtils'
import { platformDb } from '@nidus/supabase'
import DetailAuditTabList from '@nidus/ui/DetailAuditTabList'
import AuditDetailsPanel from '@nidus/ui/AuditDetailsPanel'
import AuditCard from '@nidus/ui/AuditCard'
import AuditField from '@nidus/ui/AuditField'
import AuditTimestampPair from '@nidus/ui/AuditTimestampPair'
import { humanizeAuditToken, resolveAuditUserLabels } from '@nidus/shared/utils/auditDisplayUtils'

const RFP_VIEW_SECTIONS = [
  { title: 'RFP', fields: [
    { key: 'rfp_reference', label: 'Reference' },
    { key: 'rfp_title', label: 'Title' },
    { key: 'status', label: 'Status' }
  ]}
]

export default function RFPDetailView({ readOnly = false, basePath = '/pmo', rfpService = defaultRfpService }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const { getRFPById, getLineItems, getAttachments, deleteAttachment, updateRFPStatus, deleteRFP } = rfpService
  const [rfp, setRfp] = useState(null)
  const [lineItems, setLineItems] = useState([])
  const [attachments, setAttachments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [statusChanging, setStatusChanging] = useState(false)
  const [activeTab, setActiveTab] = useState('details')
  const [auditUserLabels, setAuditUserLabels] = useState({})

  useEffect(() => {
    if (activeTab !== 'audit' || !rfp) return
    let cancelled = false
    ;(async () => {
      const labels = await resolveAuditUserLabels(platformDb, [
        rfp.created_by,
        rfp.updated_by,
      ])
      if (!cancelled) setAuditUserLabels(labels || {})
    })()
    return () => { cancelled = true }
  }, [activeTab, rfp])

  useEffect(() => {
    if (!id) return
    const load = async () => {
      try {
        setLoading(true)
        const [doc, items, atts] = await Promise.all([
          getRFPById(id),
          getLineItems(id),
          getAttachments ? getAttachments(id) : Promise.resolve([]),
        ])
        setRfp(doc)
        setLineItems(items || [])
        setAttachments(atts || [])
      } catch (err) {
        setError(err.message || 'Failed to load RFP')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  const handleDeleteAttachment = async (attId) => {
    if (!confirm('Delete this attachment?')) return
    try {
      await deleteAttachment(attId)
      setAttachments((prev) => prev.filter((a) => a.id !== attId))
    } catch (err) {
      alert(err.message || 'Failed to delete attachment')
    }
  }

  const handleEdit = () => navigate(`${basePath}/rfp/${id}/edit`)
  const handleBack = () => navigate(`${basePath}/procurement/rfp`)
  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this RFP?')) return
    try {
      await deleteRFP(id)
      navigate(`${basePath}/procurement/rfp`)
    } catch (err) {
      alert(err.message || 'Failed to delete')
    }
  }
  const handleStatusChange = async (newStatus) => {
    try {
      setStatusChanging(true)
      await updateRFPStatus(id, newStatus)
      setRfp(p => ({ ...p, status: newStatus }))
    } catch (err) {
      alert(err.message || 'Failed to update status')
    } finally {
      setStatusChanging(false)
    }
  }

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" /></div>
  if (error || !rfp) return <div className="text-red-600 dark:text-red-400 p-4">{error || 'RFP not found'}</div>

  const canEditStatus = !readOnly && ['draft', 'active', 'on_hold'].includes(rfp.status)

  return (
    <div className="space-y-6">
      <button onClick={handleBack} className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to RFP Register
      </button>

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{rfp.rfp_title}</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">{rfp.rfp_reference} · <RFPStatusBadge status={rfp.status} /></p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <ExportRecordButtons
            onExportPPT={() => exportRecordToPPT(RFP_VIEW_SECTIONS, rfp, `RFP_${rfp.rfp_reference || id}`)}
            onExportWord={() => exportRecordToWord(RFP_VIEW_SECTIONS, rfp, `RFP_${rfp.rfp_reference || id}`)}
            onExportExcel={() => exportRecordToExcel(RFP_VIEW_SECTIONS, rfp, `RFP_${rfp.rfp_reference || id}`)}
            onExportCSV={() => exportRecordToCSV(RFP_VIEW_SECTIONS, rfp, `RFP_${rfp.rfp_reference || id}`)}
            onExportXML={() => exportRecordToXML(RFP_VIEW_SECTIONS, rfp, `RFP_${rfp.rfp_reference || id}`)}
            onExportJSON={() => exportRecordToJSON(RFP_VIEW_SECTIONS, rfp, `RFP_${rfp.rfp_reference || id}`)}
            onExportPrint={() => exportRecordToPrint(RFP_VIEW_SECTIONS, rfp, `RFP_${rfp.rfp_reference || id}`)}
          />
          {!readOnly && (
            <>
              <RowActionButton variant="edit" label="Edit RFP" onClick={handleEdit} />
              {canEditStatus && (
                <select
                  value={rfp.status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  disabled={statusChanging}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="on_hold">On Hold</option>
                  <option value="closed">Closed</option>
                </select>
              )}
              <RowActionButton variant="delete" label="Delete RFP" onClick={handleDelete} />
            </>
          )}
          <button
            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            onClick={() => window.open(`${basePath}/rfp/${id}/print`, '_blank', 'noopener')}
          >
            <FileDown className="w-4 h-4 mr-2" /> Print
          </button>
          <button
            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            onClick={() => downloadRFPLineItemsCSV(lineItems, `RFP_${rfp.rfp_reference || id}_Line_Items.csv`)}
          >
            <FileDown className="w-4 h-4 mr-2" /> Export CSV
          </button>
        </div>
      </div>

      <DetailAuditTabList activeTab={activeTab} onChange={setActiveTab} ariaLabel="RFP sections" />

      {activeTab === 'audit' && (
        <AuditDetailsPanel description="Who created or changed this RFP, and how it is classified.">
          <AuditCard title="Identity" description="How this RFP is labelled and tracked.">
            <AuditField label="RFP reference" value={rfp.rfp_reference} />
            <AuditField label="Title" value={rfp.rfp_title} />
            <AuditField label="Status" value={humanizeAuditToken(rfp.status)} />
          </AuditCard>
          <AuditCard title="Classification" description="Where this RFP sits.">
            <AuditField label="Category" value={rfp.rfp_category} />
            <AuditField label="Service provider" value={rfp.service_provider_name} />
          </AuditCard>
          <AuditCard title="Record history" description="When this RFP was created and last changed.">
            <AuditField label="Created by" value={rfp.created_by ? auditUserLabels[rfp.created_by] || null : null} />
            <AuditTimestampPair dateLabel="Created at" value={rfp.created_at} />
            <AuditField label="Updated by" value={rfp.updated_by ? auditUserLabels[rfp.updated_by] || null : null} />
            <AuditTimestampPair dateLabel="Last updated" value={rfp.updated_at} />
          </AuditCard>
        </AuditDetailsPanel>
      )}

      {activeTab === 'details' && (
      <div className="grid gap-6">
        <section className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">RFP Details</h2>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div><dt className="text-gray-500 dark:text-gray-400">Category</dt><dd className="text-gray-900 dark:text-white">{rfp.rfp_category || '-'}</dd></div>
            <div><dt className="text-gray-500 dark:text-gray-400">Original Reference</dt><dd className="text-gray-900 dark:text-white">{rfp.original_document_ref || '-'}</dd></div>
            <div className="md:col-span-2"><dt className="text-gray-500 dark:text-gray-400">Description</dt><dd className="text-gray-900 dark:text-white mt-1">{rfp.rfp_description || '-'}</dd></div>
          </dl>
        </section>

        <section className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Service Provider</h2>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div><dt className="text-gray-500 dark:text-gray-400">Name</dt><dd className="text-gray-900 dark:text-white">{rfp.service_provider_name || '-'}</dd></div>
            <div><dt className="text-gray-500 dark:text-gray-400">Contract Value</dt><dd className="text-gray-900 dark:text-white">{rfp.contract_value != null ? `${rfp.currency || 'USD'} ${rfp.contract_value}` : '-'}</dd></div>
          </dl>
          {Array.isArray(rfp.service_provider_contacts) && rfp.service_provider_contacts.length > 0 ? (
            <div className="mt-4">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Contact persons</h3>
              <ul className="space-y-3">
                {rfp.service_provider_contacts.map((c, i) => (
                  <li key={i} className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-600 text-sm">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">                      <span className="text-gray-500 dark:text-gray-400">Contact</span>
                      <span className="text-gray-900 dark:text-white">{c.contact_person || '-'}</span>
                      <span className="text-gray-500 dark:text-gray-400">Email</span>
                      <span className="text-gray-900 dark:text-white">{c.email || '-'}</span>
                      <span className="text-gray-500 dark:text-gray-400">Phone</span>
                      <span className="text-gray-900 dark:text-white">{c.phone || '-'}</span>
                      <span className="text-gray-500 dark:text-gray-400">Mobile</span>
                      <span className="text-gray-900 dark:text-white">{c.mobile || '-'}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mt-2">
              <div><dt className="text-gray-500 dark:text-gray-400">Contact</dt><dd className="text-gray-900 dark:text-white">{rfp.service_provider_contact_person || '-'}</dd></div>
              <div><dt className="text-gray-500 dark:text-gray-400">Email</dt><dd className="text-gray-900 dark:text-white">{rfp.service_provider_email || '-'}</dd></div>
              <div><dt className="text-gray-500 dark:text-gray-400">Phone</dt><dd className="text-gray-900 dark:text-white">{rfp.service_provider_phone || '-'}</dd></div>
            </dl>
          )}
        </section>

        <section className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Line Items ({lineItems.length})</h2>
            {!readOnly && (
              <button onClick={() => navigate(`${basePath}/rfp/${id}/import`)} className="inline-flex items-center px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                <Upload className="w-4 h-4 mr-2" /> Bulk Import
              </button>
            )}
          </div>
          <RFPLineItemsTable items={lineItems} readOnly={readOnly} />
        </section>

        <section className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Attachments</h2>
          {!attachments || attachments.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-sm">No attachments</p>
          ) : (
            <ul className="space-y-2">
              {attachments.map((att) => (
                <li key={att.id} className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700 last:border-0">
                  <a
                    href={att.file_path}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    <Paperclip className="w-4 h-4 mr-2" />
                    {att.file_name}
                    <ExternalLink className="w-3 h-3 ml-1" />
                  </a>
                  {!readOnly && deleteAttachment && (
                    <RowActionButton
                      variant="delete"
                      label="Delete attachment"
                      onClick={() => handleDeleteAttachment(att.id)}
                    />
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
      )}
    </div>
  )
}

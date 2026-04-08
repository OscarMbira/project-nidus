import { useState } from 'react'
import { Package, CheckCircle, XCircle, AlertTriangle, Plus, X, Edit2 } from 'lucide-react'
import { addQualityRecord, updateQualityRecord, deleteQualityRecord, getQualityRecords } from '../../../services/eprProductsReviewService'
import { addApprovalRecord, updateApprovalRecord, getApprovalRecords } from '../../../services/eprProductsReviewService'
import { addOffSpecification, updateOffSpecification, grantConcession, getOffSpecifications } from '../../../services/eprProductsReviewService'

export default function EPRProductsReview({
  reportId,
  qualityRecords,
  approvalRecords,
  offSpecifications,
  onQualityRecordsChange,
  onApprovalRecordsChange,
  onOffSpecificationsChange,
  projectId,
  mode
}) {
  const [activeTab, setActiveTab] = useState('quality')

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Products Review</h3>
        <p className="text-sm text-blue-700 dark:text-blue-300">
          Review quality records, product approvals, and off-specifications for all project products.
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <div className="flex gap-2">
          {['quality', 'approvals', 'offspecs'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {tab === 'quality' && 'Quality Records'}
              {tab === 'approvals' && 'Approval Records'}
              {tab === 'offspecs' && 'Off-Specifications'}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'quality' && (
        <QualityRecordsTab
          reportId={reportId}
          qualityRecords={qualityRecords}
          onQualityRecordsChange={onQualityRecordsChange}
          projectId={projectId}
          mode={mode}
        />
      )}

      {activeTab === 'approvals' && (
        <ApprovalRecordsTab
          reportId={reportId}
          approvalRecords={approvalRecords}
          onApprovalRecordsChange={onApprovalRecordsChange}
          projectId={projectId}
          mode={mode}
        />
      )}

      {activeTab === 'offspecs' && (
        <OffSpecificationsTab
          reportId={reportId}
          offSpecifications={offSpecifications}
          onOffSpecificationsChange={onOffSpecificationsChange}
          projectId={projectId}
          mode={mode}
        />
      )}
    </div>
  )
}

function QualityRecordsTab({ reportId, qualityRecords, onQualityRecordsChange, projectId, mode }) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [newRecord, setNewRecord] = useState({
    activity_name: '',
    activity_type: 'review',
    product_id: null,
    product_name: '',
    planned_date: null,
    actual_date: null,
    status: 'planned',
    result: null,
    findings_summary: '',
    actions_taken: ''
  })

  const handleAdd = async () => {
    if (!newRecord.activity_name.trim()) return

    try {
      const added = await addQualityRecord(reportId, newRecord)
      onQualityRecordsChange([...qualityRecords, added])
      setNewRecord({
        activity_name: '',
        activity_type: 'review',
        product_id: null,
        product_name: '',
        planned_date: null,
        actual_date: null,
        status: 'planned',
        result: null,
        findings_summary: '',
        actions_taken: ''
      })
      setShowAddForm(false)
    } catch (error) {
      console.error('Error adding quality record:', error)
      alert('Error adding quality record: ' + error.message)
    }
  }

  const handleUpdate = async (recordId, updates) => {
    try {
      const updated = await updateQualityRecord(recordId, updates)
      onQualityRecordsChange(qualityRecords.map(r => r.id === recordId ? updated : r))
      setEditingId(null)
    } catch (error) {
      console.error('Error updating quality record:', error)
      alert('Error updating quality record: ' + error.message)
    }
  }

  const handleDelete = async (recordId) => {
    if (!confirm('Delete this quality record?')) return

    try {
      await deleteQualityRecord(recordId)
      onQualityRecordsChange(qualityRecords.filter(r => r.id !== recordId))
    } catch (error) {
      console.error('Error deleting quality record:', error)
      alert('Error deleting quality record: ' + error.message)
    }
  }

  return (
    <div className="space-y-4">
      {qualityRecords.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No quality records added yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {qualityRecords.map((record) => (
            <div key={record.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">{record.activity_name}</h4>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-1 text-xs rounded bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                      {record.activity_type}
                    </span>
                    <span className="px-2 py-1 text-xs rounded bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                      {record.status}
                    </span>
                    {record.result && (
                      <span className={`px-2 py-1 text-xs rounded ${
                        record.result === 'passed' ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' :
                        record.result === 'failed' ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200' :
                        'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
                      }`}>
                        {record.result.replace('_', ' ')}
                      </span>
                    )}
                  </div>
                  {record.product_name && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Product: {record.product_name}</p>
                  )}
                  {record.findings_summary && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      <strong>Findings:</strong> {record.findings_summary}
                    </p>
                  )}
                </div>
                {mode !== 'view' && (
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => setEditingId(record.id)}
                      className="p-2 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(record.id)}
                      className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {mode !== 'view' && (
        <>
          {showAddForm ? (
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-900">
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Activity Name *
                  </label>
                  <input
                    type="text"
                    value={newRecord.activity_name}
                    onChange={(e) => setNewRecord({ ...newRecord, activity_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Activity Type
                    </label>
                    <select
                      value={newRecord.activity_type}
                      onChange={(e) => setNewRecord({ ...newRecord, activity_type: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    >
                      <option value="review">Review</option>
                      <option value="inspection">Inspection</option>
                      <option value="test">Test</option>
                      <option value="audit">Audit</option>
                      <option value="walkthrough">Walkthrough</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Status
                    </label>
                    <select
                      value={newRecord.status}
                      onChange={(e) => setNewRecord({ ...newRecord, status: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    >
                      <option value="planned">Planned</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                      <option value="not_required">Not Required</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleAdd}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => setShowAddForm(false)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full px-4 py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 flex items-center justify-center gap-2"
            >
              <Plus className="h-5 w-5" />
              Add Quality Record
            </button>
          )}
        </>
      )}
    </div>
  )
}

function ApprovalRecordsTab({ reportId, approvalRecords, onApprovalRecordsChange, projectId, mode }) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [newRecord, setNewRecord] = useState({
    product_name: '',
    product_description: '',
    approval_status: 'pending',
    approval_date: new Date().toISOString().split('T')[0]
  })

  const handleAdd = async () => {
    if (!newRecord.product_name.trim()) return

    try {
      const added = await addApprovalRecord(reportId, newRecord)
      onApprovalRecordsChange([...approvalRecords, added])
      setNewRecord({
        product_name: '',
        product_description: '',
        approval_status: 'pending',
        approval_date: new Date().toISOString().split('T')[0]
      })
      setShowAddForm(false)
    } catch (error) {
      console.error('Error adding approval record:', error)
      alert('Error adding approval record: ' + error.message)
    }
  }

  const getApprovalStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
      case 'conditionally_approved':
        return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
      case 'rejected':
        return 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
      case 'pending':
        return 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
    }
  }

  return (
    <div className="space-y-4">
      {approvalRecords.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No approval records added yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {approvalRecords.map((record) => (
            <div key={record.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">{record.product_name}</h4>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-1 text-xs rounded ${getApprovalStatusColor(record.approval_status)}`}>
                      {record.approval_status.replace('_', ' ')}
                    </span>
                    {record.approver_name && (
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Approved by: {record.approver_name}
                      </span>
                    )}
                  </div>
                  {record.conditions && (
                    <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-2">
                      <strong>Conditions:</strong> {record.conditions}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {mode !== 'view' && (
        <>
          {showAddForm ? (
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-900">
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Product Name *
                  </label>
                  <input
                    type="text"
                    value={newRecord.product_name}
                    onChange={(e) => setNewRecord({ ...newRecord, product_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Approval Status
                  </label>
                  <select
                    value={newRecord.approval_status}
                    onChange={(e) => setNewRecord({ ...newRecord, approval_status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    <option value="approved">Approved</option>
                    <option value="conditionally_approved">Conditionally Approved</option>
                    <option value="rejected">Rejected</option>
                    <option value="pending">Pending</option>
                    <option value="deferred">Deferred</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleAdd}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => setShowAddForm(false)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full px-4 py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 flex items-center justify-center gap-2"
            >
              <Plus className="h-5 w-5" />
              Add Approval Record
            </button>
          )}
        </>
      )}
    </div>
  )
}

function OffSpecificationsTab({ reportId, offSpecifications, onOffSpecificationsChange, projectId, mode }) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [newOffSpec, setNewOffSpec] = useState({
    off_spec_type: 'non_conforming',
    product_name: '',
    original_requirement: '',
    actual_delivery: '',
    deviation_description: '',
    impact_assessment: '',
    concession_granted: false
  })

  const handleAdd = async () => {
    if (!newOffSpec.original_requirement.trim() || !newOffSpec.deviation_description.trim()) return

    try {
      const added = await addOffSpecification(reportId, newOffSpec)
      onOffSpecificationsChange([...offSpecifications, added])
      setNewOffSpec({
        off_spec_type: 'non_conforming',
        product_name: '',
        original_requirement: '',
        actual_delivery: '',
        deviation_description: '',
        impact_assessment: '',
        concession_granted: false
      })
      setShowAddForm(false)
    } catch (error) {
      console.error('Error adding off-specification:', error)
      alert('Error adding off-specification: ' + error.message)
    }
  }

  const handleGrantConcession = async (offSpecId) => {
    const reference = prompt('Enter concession reference:')
    const conditions = prompt('Enter concession conditions:')
    if (reference) {
      try {
        const { grantConcession } = await import('../../../services/eprProductsReviewService')
        await grantConcession(offSpecId, {
          concession_reference: reference,
          concession_conditions: conditions
        })
        // Reload off-specifications
        const { getOffSpecifications } = await import('../../../services/eprProductsReviewService')
        const updated = await getOffSpecifications(reportId)
        onOffSpecificationsChange(updated)
      } catch (error) {
        console.error('Error granting concession:', error)
        alert('Error granting concession: ' + error.message)
      }
    }
  }

  return (
    <div className="space-y-4">
      {offSpecifications.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No off-specifications recorded</p>
        </div>
      ) : (
        <div className="space-y-3">
          {offSpecifications.map((offSpec) => (
            <div key={offSpec.id} className="border border-red-200 dark:border-red-800 rounded-lg p-4 bg-red-50 dark:bg-red-900/20">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                    <h4 className="font-semibold text-gray-900 dark:text-white">{offSpec.product_name || 'Off-Specification'}</h4>
                    <span className="px-2 py-1 text-xs rounded bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200">
                      {offSpec.off_spec_type.replace('_', ' ')}
                    </span>
                    {offSpec.concession_granted && (
                      <span className="px-2 py-1 text-xs rounded bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200">
                        Concession Granted
                      </span>
                    )}
                  </div>
                  <div className="space-y-2 text-sm">
                    <div>
                      <strong>Original Requirement:</strong>
                      <p className="text-gray-600 dark:text-gray-400">{offSpec.original_requirement}</p>
                    </div>
                    <div>
                      <strong>Deviation:</strong>
                      <p className="text-gray-600 dark:text-gray-400">{offSpec.deviation_description}</p>
                    </div>
                    {offSpec.impact_assessment && (
                      <div>
                        <strong>Impact:</strong>
                        <p className="text-gray-600 dark:text-gray-400">{offSpec.impact_assessment}</p>
                      </div>
                    )}
                  </div>
                </div>
                {mode !== 'view' && !offSpec.concession_granted && (
                  <button
                    onClick={() => handleGrantConcession(offSpec.id)}
                    className="ml-4 px-3 py-1 bg-yellow-600 hover:bg-yellow-700 text-white rounded text-sm"
                  >
                    Grant Concession
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {mode !== 'view' && (
        <>
          {showAddForm ? (
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-900">
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Off-Spec Type *
                  </label>
                  <select
                    value={newOffSpec.off_spec_type}
                    onChange={(e) => setNewOffSpec({ ...newOffSpec, off_spec_type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    <option value="missing_product">Missing Product</option>
                    <option value="non_conforming">Non-Conforming</option>
                    <option value="partial_delivery">Partial Delivery</option>
                    <option value="quality_deviation">Quality Deviation</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Original Requirement *
                  </label>
                  <textarea
                    value={newOffSpec.original_requirement}
                    onChange={(e) => setNewOffSpec({ ...newOffSpec, original_requirement: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Deviation Description *
                  </label>
                  <textarea
                    value={newOffSpec.deviation_description}
                    onChange={(e) => setNewOffSpec({ ...newOffSpec, deviation_description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleAdd}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => setShowAddForm(false)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full px-4 py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:border-red-500 hover:text-red-600 dark:hover:text-red-400 flex items-center justify-center gap-2"
            >
              <Plus className="h-5 w-5" />
              Add Off-Specification
            </button>
          )}
        </>
      )}
    </div>
  )
}

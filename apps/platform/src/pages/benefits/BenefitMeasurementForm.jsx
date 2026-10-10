/**
 * Add or edit one benefit measurement on its own page.
 */
import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Save, Loader } from 'lucide-react'
import { useUnsavedChangesGuard } from '@nidus/shared/context/UnsavedChangesContext'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import { DetailAuditTabList, AuditDetailsPanel, AuditCard, AuditField, AuditTimestampPair } from '@nidus/ui'
import {
  getBenefit,
  getBenefitMeasurement,
  saveBenefitMeasurement,
} from '../../services/benefitsService'

const TYPES = [
  { value: 'actual', label: 'Actual' },
  { value: 'forecast', label: 'Forecast' },
  { value: 'planned', label: 'Planned' },
  { value: 'baseline', label: 'Baseline' },
]
const QUALITIES = ['excellent', 'good', 'fair', 'poor', 'unknown']

const inputClass = 'w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent'

function today() {
  return new Date().toISOString().split('T')[0]
}

export default function BenefitMeasurementForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const isCreate = !id
  const benefitIdFromQuery = searchParams.get('benefitId') || ''
  const { showSuccess, modal: successModal } = useSuccessModal()

  const [loading, setLoading] = useState(!isCreate)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('details')
  const [record, setRecord] = useState(null)
  const [benefitLabel, setBenefitLabel] = useState('')
  const [benefitUnit, setBenefitUnit] = useState('')

  const [measurementDate, setMeasurementDate] = useState(today())
  const [measurementValue, setMeasurementValue] = useState('')
  const [measurementType, setMeasurementType] = useState('actual')
  const [dataQuality, setDataQuality] = useState('good')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (isCreate) {
        if (!benefitIdFromQuery) {
          setLoading(false)
          return
        }
        try {
          const benefit = await getBenefit(benefitIdFromQuery)
          if (cancelled || !benefit) return
          setBenefitLabel(benefit.benefit_name || benefit.benefit_code || '')
          setBenefitUnit(benefit.measurement_unit || '')
        } catch (err) {
          if (!cancelled) setError(err.message || 'Could not load the benefit')
        } finally {
          if (!cancelled) setLoading(false)
        }
        return
      }
      setLoading(true)
      try {
        const row = await getBenefitMeasurement(id)
        if (cancelled) return
        if (!row) {
          setNotFound(true)
          setLoading(false)
          return
        }
        setRecord(row)
        setMeasurementDate(row.measurement_date || today())
        setMeasurementValue(row.measurement_value ?? '')
        setMeasurementType(row.measurement_type || 'actual')
        setDataQuality(row.data_quality || 'good')
        setNotes(row.notes || '')
        setBenefitLabel(row.benefit?.benefit_name || row.benefit?.benefit_code || '')
        setBenefitUnit(row.measurement_unit || row.benefit?.measurement_unit || '')
      } catch (err) {
        if (!cancelled) setError(err.message || 'Could not load this measurement')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [id, isCreate, benefitIdFromQuery])

  const baseline = useMemo(() => {
    if (isCreate) {
      return JSON.stringify({
        measurementDate: today(),
        measurementValue: '',
        measurementType: 'actual',
        dataQuality: 'good',
        notes: '',
      })
    }
    return JSON.stringify({
      measurementDate: record?.measurement_date || today(),
      measurementValue: record?.measurement_value ?? '',
      measurementType: record?.measurement_type || 'actual',
      dataQuality: record?.data_quality || 'good',
      notes: record?.notes || '',
    })
  }, [isCreate, record])

  const isDirty = !loading && !saved && JSON.stringify({
    measurementDate,
    measurementValue,
    measurementType,
    dataQuality,
    notes,
  }) !== baseline
  const { confirmDiscard } = useUnsavedChangesGuard(isDirty, 'You have unsaved measurement changes.')

  const handleBack = () => confirmDiscard(() => navigate(-1))

  const handleSubmit = async (e) => {
    e.preventDefault()
    const benefitId = record?.benefit_id || benefitIdFromQuery
    if (!benefitId) {
      setError('Choose a benefit on the measurements page before adding a reading.')
      return
    }
    if (measurementValue === '' || measurementValue === null) {
      setError('Measurement value is required.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const row = await saveBenefitMeasurement(benefitId, {
        measure_id: record?.measure_id || null,
        measurement_date: measurementDate,
        measurement_value: parseFloat(measurementValue),
        measurement_unit: benefitUnit || record?.measurement_unit || null,
        measurement_period: record?.measurement_period || 'monthly',
        measurement_type: measurementType,
        data_quality: dataQuality,
        notes: notes || null,
      }, isCreate ? null : id)
      const label = `${row?.measurement_date || measurementDate} · ${row?.measurement_value ?? measurementValue}`
      setSaved(true)
      showSuccess({
        recordId: label,
        operation: isCreate ? 'created' : 'updated',
        message: isCreate ? 'Measurement recorded.' : 'Measurement updated.',
        onOk: () => navigate(-1),
      })
    } catch (err) {
      setError(err.message || 'Could not save this measurement')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="w-full px-3 sm:px-4 lg:px-5 xl:px-6 py-6 flex justify-center">
        <Loader className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="w-full px-3 sm:px-4 lg:px-5 xl:px-6 py-6">
        <button type="button" onClick={() => navigate(-1)} className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <p className="text-gray-700 dark:text-gray-200">This measurement could not be found.</p>
      </div>
    )
  }

  return (
    <div className="w-full px-3 sm:px-4 lg:px-5 xl:px-6 py-6 max-w-3xl">
      <button type="button" onClick={handleBack} className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 flex items-center gap-2">
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
        {isCreate ? 'Add Measurement' : 'Edit Measurement'}
      </h1>
      {benefitLabel && (
        <p className="text-sm text-gray-700 dark:text-gray-200 mb-6">{benefitLabel}</p>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="px-4 pt-4">
          <DetailAuditTabList activeTab={activeTab} onChange={setActiveTab} detailsLabel="Details" />
        </div>
        {activeTab === 'details' ? (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-800 dark:text-red-200">{error}</div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" htmlFor="measurement-date">Measurement Date *</label>
              <input id="measurement-date" type="date" required value={measurementDate} onChange={(e) => setMeasurementDate(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" htmlFor="measurement-value">Measurement Value *</label>
              <input id="measurement-value" type="number" required step="0.01" value={measurementValue} onChange={(e) => setMeasurementValue(e.target.value)} className={inputClass} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" htmlFor="measurement-type">Measurement Type</label>
                <select id="measurement-type" value={measurementType} onChange={(e) => setMeasurementType(e.target.value)} className={inputClass}>
                  {TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" htmlFor="measurement-quality">Data Quality</label>
                <select id="measurement-quality" value={dataQuality} onChange={(e) => setDataQuality(e.target.value)} className={`${inputClass} capitalize`}>
                  {QUALITIES.map((quality) => <option key={quality} value={quality} className="capitalize">{quality}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" htmlFor="measurement-notes">Notes</label>
              <textarea id="measurement-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} className={inputClass} placeholder="Additional notes about this measurement..." />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {saving ? <Loader className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {isCreate ? 'Add Measurement' : 'Update Measurement'}
              </button>
              <button type="button" onClick={handleBack} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="p-6">
            {isCreate || !record ? (
              <p className="text-sm text-gray-700 dark:text-gray-200">Audit details appear after this record is saved.</p>
            ) : (
              <AuditDetailsPanel description="How this measurement is labelled and classified.">
                <AuditCard title="Identity" description="The reading that was recorded.">
                  <AuditField label="Benefit" value={benefitLabel || '—'} />
                  <AuditField label="Date" value={measurementDate || '—'} />
                  <AuditField label="Value" value={`${measurementValue ?? '—'} ${benefitUnit}`.trim()} />
                </AuditCard>
                <AuditCard title="Classification" description="Type and quality of this reading.">
                  <AuditField label="Type" value={TYPES.find((type) => type.value === measurementType)?.label || measurementType} />
                  <AuditField label="Data quality" value={dataQuality} />
                  <AuditField label="Period" value={record.measurement_period || '—'} />
                </AuditCard>
                <AuditCard title="Record history" description="When this measurement was created and last changed.">
                  <AuditField label="Recorded by" value={record.created_by_user?.full_name || record.created_by_user?.email || '—'} />
                  <AuditTimestampPair dateLabel="Created at" value={record.created_at} />
                  <AuditTimestampPair dateLabel="Last updated" value={record.updated_at} />
                </AuditCard>
              </AuditDetailsPanel>
            )}
          </div>
        )}
      </div>
      {successModal}
    </div>
  )
}

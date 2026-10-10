/**
 * Create, view, or edit one configuration item type.
 * The URL carries the type code or the record UUID.
 */
import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { RowActionButton } from '@nidus/ui'
import { usePlatformProjectId } from '@nidus/shared/hooks/usePlatformProjectId'
import { platformProjectPath } from '@nidus/shared/utils/projectRouteParam'
import { isLikelyDatabaseUuid } from '@nidus/shared/utils/isUuid'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import { useUnsavedChangesGuard } from '@nidus/shared/context/UnsavedChangesContext'
import DetailAuditTabList from '@nidus/ui/DetailAuditTabList'
import AuditDetailsPanel from '@nidus/ui/AuditDetailsPanel'
import AuditCard from '@nidus/ui/AuditCard'
import AuditField from '@nidus/ui/AuditField'
import AuditTimestampPair from '@nidus/ui/AuditTimestampPair'
import SelectField from '@nidus/ui/SelectField'
import { getConfigurationMSByProject } from '../services/configurationManagementStrategyService'
import { addItemType, getItemTypes, updateItemType } from '../services/cfgItemTypesService'

const CLASSIFICATIONS = [
  { value: 'major', label: 'Major' },
  { value: 'minor', label: 'Minor' },
  { value: 'component', label: 'Component' },
  { value: 'work_product', label: 'Work product' },
]
const CONTROLS = [
  { value: 'full', label: 'Full' },
  { value: 'partial', label: 'Partial' },
  { value: 'informal', label: 'Informal' },
  { value: 'none', label: 'None' },
]

export default function ConfigurationItemTypeFormPage({ forceEdit = false }) {
  const { typeKey } = useParams()
  const navigate = useNavigate()
  const { projectId, routeKey } = usePlatformProjectId()
  const isCreate = !typeKey
  const readOnly = !isCreate && !forceEdit
  const { showSuccess, modal: successModal } = useSuccessModal()

  const [loading, setLoading] = useState(!isCreate)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [cfgMsId, setCfgMsId] = useState(null)
  const [record, setRecord] = useState(null)
  const [activeTab, setActiveTab] = useState('details')
  const [pendingPath, setPendingPath] = useState(null)
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [description, setDescription] = useState('')
  const [classification, setClassification] = useState('major')
  const [control, setControl] = useState('full')
  const [baseline, setBaseline] = useState('')

  const snapshot = JSON.stringify({ name, code, description, classification, control })
  const isDirty = !readOnly && !pendingPath && baseline !== '' && snapshot !== baseline
  const { confirmDiscard } = useUnsavedChangesGuard(isDirty)

  useEffect(() => {
    if (pendingPath) navigate(pendingPath)
  }, [pendingPath, navigate])

  const apply = (row) => {
    setRecord(row)
    setName(row?.item_type_name || '')
    setCode(row?.item_type_code || '')
    setDescription(row?.item_type_description || '')
    setClassification(row?.classification_level || 'major')
    setControl(row?.control_level || 'full')
    setBaseline(JSON.stringify({
      name: row?.item_type_name || '',
      code: row?.item_type_code || '',
      description: row?.item_type_description || '',
      classification: row?.classification_level || 'major',
      control: row?.control_level || 'full',
    }))
  }

  const load = useCallback(async () => {
    if (!projectId) return
    setLoading(true)
    setError('')
    try {
      const strategy = await getConfigurationMSByProject(projectId)
      if (!strategy?.id) {
        setError('No configuration management strategy found for this project.')
        return
      }
      setCfgMsId(strategy.id)
      if (isCreate) {
        apply(null)
        return
      }
      const rows = await getItemTypes(strategy.id)
      const match = rows.find((row) => (
        isLikelyDatabaseUuid(typeKey) ? row.id === typeKey : row.item_type_code === typeKey
      ))
      if (!match) {
        setError('Item type not found.')
        return
      }
      apply(match)
    } catch (err) {
      setError(err?.message || 'Could not load this item type.')
    } finally {
      setLoading(false)
    }
  }, [projectId, isCreate, typeKey])

  useEffect(() => { load() }, [load])

  const handleSave = async () => {
    if (!name.trim() || !code.trim()) {
      setError('Name and code are required.')
      setActiveTab('details')
      return
    }
    setSaving(true)
    setError('')
    try {
      const payload = {
        item_type_name: name.trim(),
        item_type_code: code.trim().toUpperCase(),
        item_type_description: description.trim() || null,
        classification_level: classification,
        control_level: control,
      }
      const saved = isCreate
        ? await addItemType(cfgMsId, payload)
        : await updateItemType(record.id, payload)
      setBaseline(snapshot)
      showSuccess({
        recordId: saved.item_type_code || payload.item_type_code,
        operation: isCreate ? 'created' : 'updated',
        message: `Item type "${saved.item_type_name || payload.item_type_name}" was ${isCreate ? 'created' : 'updated'}.`,
        onOk: () => setPendingPath(platformProjectPath(routeKey, 'configuration-item-types', saved.item_type_code || payload.item_type_code)),
      })
    } catch (err) {
      setError(err?.message || 'Could not save this item type.')
    } finally {
      setSaving(false)
    }
  }

  const goBack = () => {
    const listPath = routeKey ? platformProjectPath(routeKey, 'configuration-item-types') : null
    confirmDiscard(() => {
      const here = `${window.location.pathname}${window.location.search}`
      let settled = false
      const finish = () => {
        if (settled) return
        settled = true
        window.removeEventListener('popstate', onPop)
        const now = `${window.location.pathname}${window.location.search}`
        if (now === here && listPath) navigate(listPath)
      }
      const onPop = () => window.setTimeout(finish, 0)
      window.addEventListener('popstate', onPop)
      window.setTimeout(finish, 250)
      navigate(window.history.state?.nidusUnsavedGuard ? -2 : -1)
    })
  }

  if (loading) {
    return <div className="w-full px-3 sm:px-4 lg:px-5 xl:px-6 py-6 text-gray-700 dark:text-gray-200">Loading item type...</div>
  }

  return (
    <div className="w-full px-3 sm:px-4 lg:px-5 xl:px-6 py-6 space-y-4">
      <button type="button" onClick={goBack} className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white flex items-center gap-2">
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {isCreate ? 'New item type' : (readOnly ? name : `Edit ${name}`)}
        </h1>
        {readOnly && record?.id && (
          <RowActionButton
            variant="edit"
            label="Edit item type"
            onClick={() => navigate(platformProjectPath(routeKey, 'configuration-item-types', record.item_type_code || record.id, 'edit'))}
          />
        )}
      </div>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <DetailAuditTabList
        activeTab={activeTab}
        onChange={setActiveTab}
        ariaLabel="Item type sections"
      />
      {activeTab === 'audit' ? (
        !record?.id ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <p className="text-sm text-gray-700 dark:text-gray-200">Audit details appear after this item type is saved.</p>
          </div>
        ) : (
          <AuditDetailsPanel description="How this item type is classified.">
            <AuditCard title="Identity" description="The name used on configuration items.">
              <AuditField label="Name" value={record.item_type_name} />
              <AuditField label="Code" value={record.item_type_code} />
            </AuditCard>
            <AuditCard title="Classification" description="How tightly this type is controlled.">
              <AuditField label="Classification" value={record.classification_level} />
              <AuditField label="Control level" value={record.control_level} />
            </AuditCard>
            <AuditCard title="Record history" description="When this item type was created.">
              <AuditTimestampPair dateLabel="Created at" value={record.created_at} />
            </AuditCard>
          </AuditDetailsPanel>
        )
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Name <span className="text-red-500">*</span></label>
            <input disabled={readOnly} value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-70" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Code <span className="text-red-500">*</span></label>
            <input disabled={readOnly} value={code} onChange={(e) => setCode(e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-70" placeholder="MAJOR" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</label>
            <textarea disabled={readOnly} value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-70" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Classification</label>
            <SelectField forceNative disabled={readOnly} value={classification} onChange={setClassification} options={CLASSIFICATIONS} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Control level</label>
            <SelectField forceNative disabled={readOnly} value={control} onChange={setControl} options={CONTROLS} />
          </div>
          {!readOnly && (
            <div className="flex justify-end">
              <button type="button" onClick={handleSave} disabled={saving} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50">
                {saving ? 'Saving...' : 'Save item type'}
              </button>
            </div>
          )}
        </div>
      )}
      {successModal}
    </div>
  )
}

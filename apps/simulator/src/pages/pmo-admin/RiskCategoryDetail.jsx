/**
 * Add or rename an organisation risk category or sub-category (v1107).
 */
import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useUnsavedChangesGuard } from '@nidus/shared/context/UnsavedChangesContext'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import DetailAuditTabList from '@nidus/ui/DetailAuditTabList'
import AuditDetailsPanel from '@nidus/ui/AuditDetailsPanel'
import AuditCard from '@nidus/ui/AuditCard'
import AuditField from '@nidus/ui/AuditField'
import AuditTimestampPair from '@nidus/ui/AuditTimestampPair'
import { resolveAuditUserLabels } from '@nidus/shared/utils/auditDisplayUtils'
import { platformDb } from '@nidus/supabase'
import SimilarRiskPanel from '../../components/risks/SimilarRiskPanel'
import {
  addRiskCategory,
  addRiskSubcategory,
  findSimilarRisks,
  getRiskCatalogueAccess,
  listRiskCatalogue,
  updateRiskCategory,
  updateRiskSubcategory,
} from '../../services/riskCategoryCatalogService'
import { similarCatalogueNames } from '../../utils/riskCategoryMatch'
import { riskCategoryBasePath } from './riskCategoryPaths'

export default function RiskCategoryDetail() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { code, subCode } = useParams()
  const basePath = riskCategoryBasePath(pathname)
  const isSubcategory = pathname.includes('/subcategories/')
  const isCreate = pathname.endsWith('/create')
  const { showSuccess, modal } = useSuccessModal()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [accountId, setAccountId] = useState(null)
  const [canAdd, setCanAdd] = useState(false)
  const [canMaintain, setCanMaintain] = useState(false)
  const [catalogue, setCatalogue] = useState({ categories: [], subcategories: [] })
  const [name, setName] = useState('')
  const [baseline, setBaseline] = useState('')
  const [record, setRecord] = useState(null)
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState('details')
  const [auditLabels, setAuditLabels] = useState({})
  const [similarNames, setSimilarNames] = useState([])
  const [similarRisks, setSimilarRisks] = useState([])

  const parent = useMemo(
    () => catalogue.categories.find((row) => row.category_code === decodeURIComponent(code || '')),
    [catalogue.categories, code],
  )

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      const access = await getRiskCatalogueAccess()
      if (cancelled) return
      if (!access.success || !access.accountId) {
        setError(access.error || 'Could not resolve your organisation')
        setLoading(false)
        return
      }
      setAccountId(access.accountId)
      setCanAdd(access.canAdd)
      setCanMaintain(access.canMaintain)
      const listed = await listRiskCatalogue(access.accountId)
      if (cancelled) return
      if (!listed.success) {
        setError(listed.error)
        setLoading(false)
        return
      }
      setCatalogue({ categories: listed.categories, subcategories: listed.subcategories })
      if (!isCreate) {
        const decodedCode = decodeURIComponent(code || '')
        const decodedSub = decodeURIComponent(subCode || '')
        const found = isSubcategory
          ? listed.subcategories.find((row) => row.category_code === decodedCode && row.subcategory_code === decodedSub && row.organisation_id)
          : listed.categories.find((row) => row.category_code === decodedCode && row.organisation_id)
        if (!found) {
          setError(isSubcategory ? 'Sub-category not found' : 'Category not found')
        } else {
          const label = isSubcategory ? found.subcategory_name : found.category_name
          setRecord(found)
          setName(label)
          setBaseline(label)
        }
      }
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [code, subCode, isCreate, isSubcategory])

  const isDirty = name.trim() !== baseline
  const { confirmDiscard, requestNavigation } = useUnsavedChangesGuard(isDirty, 'Discard this name?')

  useEffect(() => {
    if (tab !== 'audit' || !record) return
    let cancelled = false
    resolveAuditUserLabels(platformDb, [record.created_by, record.updated_by]).then((labels) => {
      if (!cancelled) setAuditLabels(labels || {})
    })
    return () => { cancelled = true }
  }, [tab, record])

  useEffect(() => {
    const handle = setTimeout(async () => {
      const pool = isSubcategory
        ? catalogue.subcategories
          .filter((row) => row.category_code === parent?.category_code)
          .map((row) => ({ name: row.subcategory_name, value: row.subcategory_name }))
        : catalogue.categories.map((row) => ({ name: row.category_name, value: row.category_name }))
      setSimilarNames(similarCatalogueNames(name, pool))
      if (!accountId) return
      const risks = await findSimilarRisks(accountId, name, null)
      setSimilarRisks(risks.success ? risks.data : [])
    }, 400)
    return () => clearTimeout(handle)
  }, [name, accountId, catalogue, isSubcategory, parent])

  const allowed = isCreate ? canAdd : canMaintain

  async function handleSave(event) {
    event.preventDefault()
    if (!allowed || !accountId) return
    setSaving(true)
    setError('')
    const result = isCreate
      ? (isSubcategory
        ? await addRiskSubcategory(accountId, parent?.category_code, name)
        : await addRiskCategory(accountId, name))
      : (isSubcategory
        ? await updateRiskSubcategory(record.id, { name })
        : await updateRiskCategory(record.id, { name }))
    setSaving(false)
    if (!result.success) {
      setError(result.error)
      return
    }
    const savedName = result.data?.category_name || result.data?.subcategory_name || name.trim()
    setBaseline(savedName)
    showSuccess({
      recordId: savedName,
      operation: isCreate ? 'created' : 'updated',
      message: isSubcategory ? `Sub-category ${savedName}` : `Category ${savedName}`,
      onOk: () => requestNavigation(basePath),
    })
  }

  async function handleDeactivate() {
    if (!record || !canMaintain) return
    setSaving(true)
    const result = isSubcategory
      ? await updateRiskSubcategory(record.id, { isActive: false })
      : await updateRiskCategory(record.id, { isActive: false })
    setSaving(false)
    if (!result.success) {
      setError(result.error)
      return
    }
    showSuccess({
      recordId: name.trim(),
      operation: 'updated',
      message: 'Hidden from new risks. Existing risks keep this name.',
      onOk: () => requestNavigation(basePath),
    })
  }

  const title = isCreate
    ? (isSubcategory ? 'Add sub-category' : 'Add category')
    : (isSubcategory ? 'Edit sub-category' : 'Edit category')

  return (
    <div className="w-full px-3 sm:px-4 lg:px-5 xl:px-6 py-6">
      {modal}
      <button
        type="button"
        className="mb-4 text-sm text-blue-700 hover:underline dark:text-blue-300"
        onClick={() => confirmDiscard(() => navigate(basePath))}
      >
        Back to Risk Categories
      </button>
      <h1 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
      {isSubcategory && parent && (
        <p className="mb-4 text-sm text-gray-600 dark:text-gray-300">Under {parent.category_name}</p>
      )}
      <DetailAuditTabList
        tabs={[
          { value: 'details', label: 'Details' },
          { value: 'audit', label: 'Audit details' },
        ]}
        activeTab={tab}
        onChange={setTab}
      />
      {tab === 'audit' ? (
        <div className="mt-4">
          {record ? (
            <AuditDetailsPanel>
              <AuditCard title="Identity">
                <AuditField label="Name" value={isSubcategory ? record.subcategory_name : record.category_name} />
                <AuditField label="Code" value={isSubcategory ? record.subcategory_code : record.category_code} />
              </AuditCard>
              <AuditCard title="Classification">
                <AuditField label="Owner" value="Organisation" />
                <AuditField label="Status" value={record.is_active ? 'Active' : 'Inactive'} />
                {isSubcategory && <AuditField label="Category" value={parent?.category_name || record.category_code} />}
              </AuditCard>
              <AuditCard title="Record history">
                <AuditTimestampPair dateLabel="Created at" value={record.created_at} />
                <AuditField label="Created by" value={auditLabels[record.created_by] || 'Not recorded'} />
                <AuditTimestampPair dateLabel="Updated at" value={record.updated_at} />
                <AuditField label="Updated by" value={auditLabels[record.updated_by] || 'Not recorded'} />
              </AuditCard>
            </AuditDetailsPanel>
          ) : (
            <p className="text-gray-600 dark:text-gray-300">Audit details appear after this record is saved.</p>
          )}
        </div>
      ) : loading ? (
        <p className="mt-4 text-gray-600 dark:text-gray-300">Loading…</p>
      ) : (
        <form onSubmit={handleSave} className="mt-4 max-w-xl rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          {!allowed && <p className="mb-3 text-sm text-red-600">You cannot change this record.</p>}
          {isSubcategory && isCreate && !parent && <p className="mb-3 text-sm text-red-600">Choose a category first.</p>}
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="risk-catalogue-name">Name</label>
          <input
            id="risk-catalogue-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            disabled={!allowed}
            maxLength={100}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
          />
          <SimilarRiskPanel
            names={similarNames}
            risks={similarRisks}
            onPickName={(item) => setName(item.name)}
            onOpenRisk={(risk) => requestNavigation(
              pathname.startsWith('/simulator')
                ? `/simulator/practice-risk-register/${risk.id}`
                : `/platform/risks/${risk.id}`
            )}
          />
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={!allowed || saving || !name.trim()}
              className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
            {!isCreate && canMaintain && record?.is_active && (
              <button
                type="button"
                onClick={handleDeactivate}
                disabled={saving}
                className="rounded-lg border border-gray-300 px-4 py-2 text-gray-800 dark:border-gray-600 dark:text-gray-100"
              >
                Deactivate
              </button>
            )}
          </div>
        </form>
      )}
    </div>
  )
}

import { useEffect, useMemo, useState } from 'react'
import {
  applyTieredSchemaFieldOverrides,
  buildFieldOverrideMap,
  coalesceLength,
  mergeOverrideChain,
} from '@nidus/shared/utils/formTemplateFieldOverrides'
import { optionToLine, parseOptionLine } from '@nidus/shared/utils/formSelectOptions'
import {
  addFieldForOrg,
  deleteFieldAdditionForOrg,
  getFieldOverridesForOrg,
  getFormTemplate,
  getFormTemplates,
  listFieldAdditionsForOrg,
  resolveEntityPolicyChain,
  setFieldEnabledForOrg,
  setFieldLabelForOrg,
  setFieldLengthForOrg,
  setFieldRequiredForOrg,
  setFieldTypeForOrg,
  updateFieldAdditionDisplay,
  updateFieldAdditionLength,
  updateFieldAdditionOptions,
} from '../../services/formEngineService'
import CompletedExampleManager from './CompletedExampleManager'
import SelectOptionsEditor from './SelectOptionsEditor'
import RowActionButton from './RowActionButton'
import { DEFAULT_MAX_FILES_PER_FIELD, HARD_MAX_FILES_CEILING } from '../../services/formFieldAttachmentService'

const FIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'textarea', label: 'Textarea' },
  { value: 'date', label: 'Date' },
  { value: 'number', label: 'Number' },
  { value: 'money', label: 'Money' },
  { value: 'select', label: 'Select' },
  { value: 'attachment', label: 'Attachment (image/file)' },
]

const TIER_LABEL = { portfolio: 'Portfolio', programme: 'Programme', project: 'Project' }

const fieldViewTabBtn = (active) =>
  `px-3 py-1.5 rounded text-sm font-medium transition-colors ${
    active
      ? 'bg-blue-600 text-white'
      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
  }`

/**
 * Shared "customise a shared form template for this tier" panel — reused at Portfolio,
 * Programme, and Project level (decision 9/12), one component built once. Mounted alongside
 * TierFieldCustomisationPanel (the `fields` domain's tiered panel) on each tier's own detail
 * page, e.g. the existing "Field Templates" tab — no new sidebar entry needed.
 *
 * Resolves the ancestor chain via resolveEntityPolicyChain, fetches each ancestor's own
 * override/addition layer (read-only display, via the ratchet-aware merge), and writes are
 * always scoped to THIS entity's own tier only — never an ancestor's.
 */
export default function TierFormPolicyPanel({
  mode = 'platform',
  accountId,
  tier,
  entityType,
  entityId,
  entityName,
  initialTemplateCode = '',
  /**
   * When provided (array), dropdown is limited to these templates instead of the
   * full org catalog. Used by Project Form Templates to show only Project Templates copies.
   * Pass null/undefined to load all via getFormTemplates (Portfolio/Programme default).
   */
  availableTemplates = null,
}) {
  const [templates, setTemplates] = useState([])
  const [templateId, setTemplateId] = useState('')
  const [templateCode, setTemplateCode] = useState('')
  const [schema, setSchema] = useState({ sections: [] })
  const [chain, setChain] = useState([])
  const [overridesByTier, setOverridesByTier] = useState([])
  const [additionsByTier, setAdditionsByTier] = useState([])
  const [ownOverrideMap, setOwnOverrideMap] = useState(() => new Map())
  /** In-progress "Type → Select" option lines not yet saved — keyed by `${sectionKey}::${fieldKey}`. */
  const [typeOverrideDrafts, setTypeOverrideDrafts] = useState({})
  /**
   * Draft Display name / Input type for Customise rows — keyed by `${sectionKey}::${fieldKey}`.
   * Persisted only when the row's Save button is clicked (not on blur/change).
   */
  const [customiseDrafts, setCustomiseDrafts] = useState({})
  /** Brief per-row confirmation after a successful Save — keyed by mapKey. */
  const [customiseSavedFlash, setCustomiseSavedFlash] = useState({})
  /**
   * Draft Min/Max character lengths — keyed by `${sectionKey}::${fieldKey}`.
   * Saved via the row Save (length) button; avoids blur+remount losing in-progress edits.
   */
  const [lengthDrafts, setLengthDrafts] = useState({})
  const [lengthSavedFlash, setLengthSavedFlash] = useState({})
  /** In-progress "Edit options" edits for an existing local Select field — keyed by `${sectionKey}::${fieldKey}`, holds line-array until Apply. */
  const [editOptionsDrafts, setEditOptionsDrafts] = useState({})
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const [addFieldErr, setAddFieldErr] = useState(null)
  const [newField, setNewField] = useState({
    sectionKey: '', key: '', label: '', type: 'text', required: false, options: [], minLength: '', maxLength: '',
    accept: 'any', maxFiles: DEFAULT_MAX_FILES_PER_FIELD,
  })
  const [catalogReady, setCatalogReady] = useState(availableTemplates != null)
  /** 'standard' = Show/Required only; 'customise' = also edit labels & types. */
  const [fieldViewTab, setFieldViewTab] = useState('standard')
  const showDisplayOptions = fieldViewTab === 'customise'

  const firstSectionKey = (schema.sections || [])[0]?.key || ''

  const pickInitial = (list) => {
    const wanted = String(initialTemplateCode || '').trim()
    const match = wanted ? (list || []).find((t) => t.template_code === wanted) : null
    if (match) {
      setTemplateId(match.id)
      setTemplateCode(match.template_code)
      return
    }
    if ((list || []).length === 1) {
      setTemplateId(list[0].id)
      setTemplateCode(list[0].template_code)
      return
    }
    setTemplateId('')
    setTemplateCode('')
  }

  useEffect(() => {
    if (availableTemplates != null) {
      setTemplates(availableTemplates)
      pickInitial(availableTemplates)
      setCatalogReady(true)
      return
    }
    setCatalogReady(false)
    getFormTemplates(null, mode).then((r) => {
      if (!r.success) return
      setTemplates(r.data || [])
      pickInitial(r.data || [])
      setCatalogReady(true)
    })
    // availableTemplates identity: parent should pass a stable list (or null).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, initialTemplateCode, availableTemplates])

  useEffect(() => {
    if (!templateCode) return
    let cancelled = false
    setLoading(true)
    setErr(null)
    ;(async () => {
      try {
        const templateResult = await getFormTemplate(templateCode, mode)
        if (!templateResult.success) throw new Error(templateResult.message)
        if (cancelled) return
        const nextSchema = templateResult.data?.current_version?.schema || { sections: [] }
        setSchema(nextSchema)
        // Default section so "Add field" isn't blocked by the empty placeholder looking selected.
        const defaultSection = (nextSchema.sections || [])[0]?.key || ''
        if (defaultSection) {
          setNewField((prev) => (prev.sectionKey ? prev : { ...prev, sectionKey: defaultSection }))
        }

        const chainResult = await resolveEntityPolicyChain(entityType, entityId, mode)
        if (!chainResult.success) throw new Error(chainResult.message)
        const fullChain = [{ entityType: null, entityId: null }, ...chainResult.data]
        if (cancelled) return
        setChain(fullChain)

        const layers = await Promise.all(
          fullChain.map((node) =>
            Promise.all([
              getFieldOverridesForOrg(accountId, templateResult.data.id, mode, {
                scopeEntityType: node.entityType,
                scopeEntityId: node.entityId,
              }),
              listFieldAdditionsForOrg(accountId, templateResult.data.id, mode, {
                scopeEntityType: node.entityType,
                scopeEntityId: node.entityId,
              }),
            ]),
          ),
        )
        if (cancelled) return
        const overrideMaps = layers.map(([overrides]) => buildFieldOverrideMap(overrides.success ? overrides.data : []))
        const additions = layers.flatMap(([, add]) => (add.success ? add.data : []))
        setOverridesByTier(overrideMaps)
        setAdditionsByTier(additions)
        setOwnOverrideMap(overrideMaps[overrideMaps.length - 1] || new Map())
      } catch (e) {
        setErr(e.message || String(e))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [templateCode, accountId, entityType, entityId, mode])

  const template = templates.find((t) => t.id === templateId)

  const ancestorMergedMap = useMemo(
    () => mergeOverrideChain(overridesByTier.slice(0, -1)),
    [overridesByTier],
  )

  /** Raw master-schema fields by key — the ultimate fallback once every tier's own label/type override is absent. */
  const masterFieldsByKey = useMemo(() => {
    const map = new Map()
    for (const section of schema.sections || []) {
      for (const field of section.fields || []) {
        map.set(`${section.key}::${field.key}`, field)
      }
    }
    return map
  }, [schema])

  const effectiveSchema = useMemo(
    () => applyTieredSchemaFieldOverrides(schema, overridesByTier, additionsByTier),
    [schema, overridesByTier, additionsByTier],
  )

  const catalogFields = useMemo(() => {
    const out = []
    for (const section of effectiveSchema.sections || []) {
      for (const field of section.fields || []) {
        out.push({
          sectionKey: section.key,
          sectionTitle: section.title || section.key,
          fieldKey: field.key,
          fieldLabel: field.label || field.key,
          fieldType: field.type || 'text',
          minLength: coalesceLength(field.minLength),
          maxLength: coalesceLength(field.maxLength),
          isLocal: Boolean(field.is_local),
          ownerScopeEntityType: field.owner_scope_entity_type || null,
          ownerScopeEntityId: field.owner_scope_entity_id || null,
          baseRequired: Boolean(field.required),
        })
      }
    }
    return out
  }, [effectiveSchema])

  async function toggleEnabled(sectionKey, fieldKey, nextEnabled) {
    setBusy(true)
    setErr(null)
    const result = await setFieldEnabledForOrg(
      { organisationId: accountId, templateId, sectionKey, fieldKey, isEnabled: nextEnabled, scopeEntityType: entityType, scopeEntityId: entityId },
      mode,
    )
    setBusy(false)
    if (!result.success) { setErr(result.message); return }
    setOwnOverrideMap((prev) => {
      const next = new Map(prev)
      const existing = next.get(`${sectionKey}::${fieldKey}`) || { enabled: true, required: null }
      next.set(`${sectionKey}::${fieldKey}`, { ...existing, enabled: nextEnabled })
      return next
    })
    setOverridesByTier((prev) => {
      const next = [...prev]
      const last = new Map(next[next.length - 1])
      const existing = last.get(`${sectionKey}::${fieldKey}`) || { enabled: true, required: null }
      last.set(`${sectionKey}::${fieldKey}`, { ...existing, enabled: nextEnabled })
      next[next.length - 1] = last
      return next
    })
  }

  async function toggleRequired(sectionKey, fieldKey, nextRequired) {
    setBusy(true)
    setErr(null)
    const result = await setFieldRequiredForOrg(
      { organisationId: accountId, templateId, sectionKey, fieldKey, isRequired: nextRequired, scopeEntityType: entityType, scopeEntityId: entityId },
      mode,
    )
    setBusy(false)
    if (!result.success) { setErr(result.message); return }
    setOverridesByTier((prev) => {
      const next = [...prev]
      const last = new Map(next[next.length - 1])
      const existing = last.get(`${sectionKey}::${fieldKey}`) || { enabled: true, required: null }
      last.set(`${sectionKey}::${fieldKey}`, { ...existing, required: nextRequired })
      next[next.length - 1] = last
      return next
    })
  }

  /** @param {{ label?: string, type?: string, options?: string[] }|null} seed */
  function getCustomiseDraft(mapKey, seed) {
    return customiseDrafts[mapKey] ?? {
      label: seed?.label || '',
      type: seed?.type || '',
    }
  }

  function clearCustomiseDraft(mapKey) {
    setCustomiseDrafts((prev) => {
      const next = { ...prev }
      delete next[mapKey]
      return next
    })
    setTypeOverrideDrafts((prev) => {
      const next = { ...prev }
      delete next[mapKey]
      return next
    })
  }

  function flashCustomiseSaved(mapKey) {
    setCustomiseSavedFlash((prev) => ({ ...prev, [mapKey]: true }))
    window.setTimeout(() => {
      setCustomiseSavedFlash((prev) => {
        const next = { ...prev }
        delete next[mapKey]
        return next
      })
    }, 2000)
  }

  /**
   * Persist Display name + Input type for one field (Customise tab).
   * Master/shared fields → override rows; local additions → field_definition.
   */
  async function saveFieldDisplayCustomisation(sectionKey, fieldKey, { isLocalAddition = false } = {}) {
    const mapKey = `${sectionKey}::${fieldKey}`
    const ownEntry = ownOverrideMap.get(mapKey)
    const addition = isLocalAddition ? findAdditionRow(sectionKey, fieldKey) : null
    const seed = isLocalAddition
      ? {
        label: addition?.field_definition?.label || '',
        type: addition?.field_definition?.type || 'text',
        options: addition?.field_definition?.options || [],
      }
      : ownEntry
    const draft = getCustomiseDraft(mapKey, seed)
    const trimmed = draft.label.trim()
    const type = draft.type || null
    const savedOptions = seed?.options || []
    let options = null
    if (type === 'select') {
      const optionLines = typeOverrideDrafts[mapKey]?.options
        ?? (savedOptions || []).map(optionToLine)
      options = optionLines.map(parseOptionLine).filter(Boolean)
      if (!options.length) {
        setErr('At least one option is required when the field type is Select.')
        return
      }
    }

    if (isLocalAddition) {
      if (!trimmed) {
        setErr('Display name is required for a local field.')
        return
      }
      if (!type) {
        setErr('Input type is required for a local field.')
        return
      }
      const savedLabel = addition?.field_definition?.label || ''
      const savedType = addition?.field_definition?.type || 'text'
      const labelChanged = savedLabel !== trimmed
      const typeChanged = savedType !== type || (type === 'select' && Boolean(typeOverrideDrafts[mapKey]))
      if (!labelChanged && !typeChanged) return

      setBusy(true)
      setErr(null)
      const scopeType = addition?.scope_entity_type || entityType
      const scopeId = addition?.scope_entity_id || entityId
      const result = await updateFieldAdditionDisplay(
        {
          organisationId: accountId,
          templateId,
          sectionKey,
          fieldKey,
          label: trimmed,
          fieldType: type,
          options,
          scopeEntityType: scopeType === 'account' ? null : scopeType,
          scopeEntityId: scopeType === 'account' ? null : scopeId,
        },
        mode,
      )
      setBusy(false)
      if (!result.success) { setErr(result.message); return }
      setAdditionsByTier((prev) => prev.map((a) => (
        a.field_key === fieldKey && a.section_key === sectionKey ? result.data : a
      )))
      clearCustomiseDraft(mapKey)
      flashCustomiseSaved(mapKey)
      return
    }

    const trimmedOrNull = trimmed === '' ? null : trimmed
    const savedLabel = ownEntry?.label || null
    const savedType = ownEntry?.type || null
    const labelChanged = savedLabel !== trimmedOrNull
    const typeChanged = savedType !== type || (type === 'select' && Boolean(typeOverrideDrafts[mapKey]))
    if (!labelChanged && !typeChanged) return

    setBusy(true)
    setErr(null)

    if (labelChanged) {
      const result = await setFieldLabelForOrg(
        {
          organisationId: accountId,
          templateId,
          sectionKey,
          fieldKey,
          label: trimmedOrNull,
          scopeEntityType: entityType,
          scopeEntityId: entityId,
        },
        mode,
      )
      if (!result.success) {
        setBusy(false)
        setErr(result.message)
        return
      }
    }

    if (typeChanged) {
      const result = await setFieldTypeForOrg(
        {
          organisationId: accountId,
          templateId,
          sectionKey,
          fieldKey,
          fieldType: type,
          options,
          scopeEntityType: entityType,
          scopeEntityId: entityId,
        },
        mode,
      )
      if (!result.success) {
        setBusy(false)
        setErr(result.message)
        return
      }
    }

    const nextOptions = type === 'select' ? options : null
    setOwnOverrideMap((prev) => {
      const next = new Map(prev)
      const existing = next.get(mapKey) || {
        enabled: true, required: null, label: null, type: null, options: null, minLength: null, maxLength: null,
      }
      next.set(mapKey, {
        ...existing,
        ...(labelChanged ? { label: trimmedOrNull } : {}),
        ...(typeChanged ? { type, options: nextOptions } : {}),
      })
      return next
    })
    setOverridesByTier((prev) => {
      const next = [...prev]
      const last = new Map(next[next.length - 1])
      const existing = last.get(mapKey) || {
        enabled: true, required: null, label: null, type: null, options: null, minLength: null, maxLength: null,
      }
      last.set(mapKey, {
        ...existing,
        ...(labelChanged ? { label: trimmedOrNull } : {}),
        ...(typeChanged ? { type, options: nextOptions } : {}),
      })
      next[next.length - 1] = last
      return next
    })
    clearCustomiseDraft(mapKey)
    setBusy(false)
    flashCustomiseSaved(mapKey)
  }

  function getLengthDraft(mapKey, savedMin, savedMax) {
    return lengthDrafts[mapKey] ?? {
      min: savedMin != null ? String(savedMin) : '',
      max: savedMax != null ? String(savedMax) : '',
    }
  }

  function findAdditionRow(sectionKey, fieldKey) {
    // v816: field_key is unique per template — prefer this tier's row, else any match.
    return additionsByTier.find(
      (a) => a.field_key === fieldKey && a.section_key === sectionKey && a.scope_entity_type === entityType,
    ) || additionsByTier.find(
      (a) => a.field_key === fieldKey && a.section_key === sectionKey,
    ) || null
  }

  /**
   * Persist Min/Max for a row — local additions update field_definition; master fields use overrides.
   */
  async function saveFieldLength(sectionKey, fieldKey, {
    isLocalAddition,
    inheritedMin = null,
    inheritedMax = null,
    savedMin = null,
    savedMax = null,
  }) {
    const mapKey = `${sectionKey}::${fieldKey}`
    const draft = getLengthDraft(mapKey, savedMin, savedMax)
    let nextMin
    let nextMax
    try {
      nextMin = draft.min === '' || draft.min == null ? null : coalesceLength(draft.min)
      nextMax = draft.max === '' || draft.max == null ? null : coalesceLength(draft.max)
      if ((draft.min !== '' && draft.min != null && nextMin == null)
        || (draft.max !== '' && draft.max != null && nextMax == null)) {
        throw new Error('Min/max length must be a non-negative whole number')
      }
    } catch (e) {
      setErr(e.message || 'Invalid length')
      return
    }
    if (nextMin != null && nextMax != null && nextMax < nextMin) {
      setErr('Max length cannot be less than min length')
      return
    }
    if (!isLocalAddition) {
      if (inheritedMin != null && nextMin != null && nextMin < inheritedMin) {
        setErr(`Min length cannot be below ${inheritedMin} (set by an ancestor tier)`)
        return
      }
      if (inheritedMax != null && nextMax != null && nextMax > inheritedMax) {
        setErr(`Max length cannot exceed ${inheritedMax} (set by an ancestor tier)`)
        return
      }
    }
    if ((savedMin ?? null) === nextMin && (savedMax ?? null) === nextMax) {
      setLengthDrafts((prev) => {
        const next = { ...prev }
        delete next[mapKey]
        return next
      })
      return
    }

    setBusy(true)
    setErr(null)

    if (isLocalAddition) {
      const addition = findAdditionRow(sectionKey, fieldKey)
      const scopeType = addition?.scope_entity_type || entityType
      const scopeId = addition?.scope_entity_id || entityId
      const result = await updateFieldAdditionLength(
        {
          organisationId: accountId,
          templateId,
          sectionKey,
          fieldKey,
          minLength: nextMin,
          maxLength: nextMax,
          scopeEntityType: scopeType === 'account' ? null : scopeType,
          scopeEntityId: scopeType === 'account' ? null : scopeId,
        },
        mode,
      )
      setBusy(false)
      if (!result.success) { setErr(result.message); return }
      setAdditionsByTier((prev) => prev.map((a) => (
        a.field_key === fieldKey && a.section_key === sectionKey ? result.data : a
      )))
    } else {
      const result = await setFieldLengthForOrg(
        {
          organisationId: accountId,
          templateId,
          sectionKey,
          fieldKey,
          minLength: nextMin,
          maxLength: nextMax,
          scopeEntityType: entityType,
          scopeEntityId: entityId,
        },
        mode,
      )
      setBusy(false)
      if (!result.success) { setErr(result.message); return }
      setOwnOverrideMap((prev) => {
        const next = new Map(prev)
        const existing = next.get(mapKey) || {
          enabled: true, required: null, label: null, type: null, options: null, minLength: null, maxLength: null,
        }
        next.set(mapKey, { ...existing, minLength: nextMin, maxLength: nextMax })
        return next
      })
      setOverridesByTier((prev) => {
        const next = [...prev]
        const last = new Map(next[next.length - 1])
        const existing = last.get(mapKey) || {
          enabled: true, required: null, label: null, type: null, options: null, minLength: null, maxLength: null,
        }
        last.set(mapKey, { ...existing, minLength: nextMin, maxLength: nextMax })
        next[next.length - 1] = last
        return next
      })
    }

    setLengthDrafts((prev) => {
      const next = { ...prev }
      delete next[mapKey]
      return next
    })
    setLengthSavedFlash((prev) => ({ ...prev, [mapKey]: true }))
    window.setTimeout(() => {
      setLengthSavedFlash((prev) => {
        const next = { ...prev }
        delete next[mapKey]
        return next
      })
    }, 2000)
  }

  async function handleAddField() {
    const key = newField.key.trim()
    const label = newField.label.trim()
    const sectionKey = newField.sectionKey || firstSectionKey
    const missing = []
    if (!sectionKey) missing.push('section')
    if (!key) missing.push('field key')
    if (!label) missing.push('label')
    if (missing.length) {
      setAddFieldErr(
        missing.length === 1 && missing[0] === 'section'
          ? 'Choose a section for the new field (e.g. General).'
          : `Please complete: ${missing.join(', ')}.`,
      )
      return
    }
    const fieldDefinition = { key, label, type: newField.type, required: Boolean(newField.required) }
    if (newField.type === 'select') {
      fieldDefinition.options = (newField.options || []).map(parseOptionLine).filter(Boolean)
    }
    if (newField.type === 'text' || newField.type === 'textarea') {
      const minLength = coalesceLength(newField.minLength)
      const maxLength = coalesceLength(newField.maxLength)
      if (newField.minLength !== '' && newField.minLength != null && minLength == null) {
        setAddFieldErr('Min length must be a non-negative whole number')
        return
      }
      if (newField.maxLength !== '' && newField.maxLength != null && maxLength == null) {
        setAddFieldErr('Max length must be a non-negative whole number')
        return
      }
      if (minLength != null && maxLength != null && maxLength < minLength) {
        setAddFieldErr('Max length cannot be less than min length')
        return
      }
      if (minLength != null) fieldDefinition.minLength = minLength
      if (maxLength != null) fieldDefinition.maxLength = maxLength
    }
    if (newField.type === 'attachment') {
      fieldDefinition.accept = newField.accept === 'image' ? 'image' : 'any'
      fieldDefinition.maxFiles = Math.min(Number(newField.maxFiles) || DEFAULT_MAX_FILES_PER_FIELD, HARD_MAX_FILES_CEILING)
    }
    setBusy(true)
    setAddFieldErr(null)
    setErr(null)
    const result = await addFieldForOrg(
      {
        organisationId: accountId,
        templateId,
        sectionKey,
        fieldDefinition,
        scopeEntityType: entityType,
        scopeEntityId: entityId,
      },
      mode,
    )
    setBusy(false)
    if (!result.success) { setAddFieldErr(result.message); return }
    setAdditionsByTier((prev) => [...prev, result.data])
    setNewField({
      sectionKey: sectionKey || firstSectionKey,
      key: '',
      label: '',
      type: 'text',
      required: false,
      options: [],
      minLength: '',
      maxLength: '',
      accept: 'any',
      maxFiles: DEFAULT_MAX_FILES_PER_FIELD,
    })
  }

  async function handleDeleteField(fieldKey, sectionKey) {
    setBusy(true)
    setErr(null)
    const result = await deleteFieldAdditionForOrg(
      { organisationId: accountId, templateId, sectionKey, fieldKey, scopeEntityType: entityType, scopeEntityId: entityId },
      mode,
    )
    setBusy(false)
    if (!result.success) { setErr(result.message); return }
    setAdditionsByTier((prev) => prev.filter((a) => !(a.field_key === fieldKey && a.section_key === sectionKey && a.scope_entity_type === entityType)))
  }

  /** Options-only edit on an existing local Select field this tier created (decision, v816). */
  async function handleEditAdditionOptions(sectionKey, fieldKey, optionLines) {
    const options = (optionLines || []).map(parseOptionLine).filter(Boolean)
    if (options.length === 0) {
      setErr('At least one option is required.')
      return
    }
    setBusy(true)
    setErr(null)
    const result = await updateFieldAdditionOptions(
      { organisationId: accountId, templateId, sectionKey, fieldKey, options, scopeEntityType: entityType, scopeEntityId: entityId },
      mode,
    )
    setBusy(false)
    if (!result.success) { setErr(result.message); return }
    setAdditionsByTier((prev) => prev.map((a) => (
      a.field_key === fieldKey && a.section_key === sectionKey && a.scope_entity_type === entityType ? result.data : a
    )))
    setEditOptionsDrafts((prev) => {
      const next = { ...prev }
      delete next[`${sectionKey}::${fieldKey}`]
      return next
    })
  }

  if (!accountId) return <p className="text-sm text-gray-500 dark:text-gray-400">Organisation could not be resolved.</p>

  const selectedTemplate =
    templates.find((t) => t.id === templateId) ||
    templates.find((t) => t.template_code === templateCode) ||
    null
  const selectedTemplateLabel = selectedTemplate?.name || templateCode || 'selected form'

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Form template</label>
        {!catalogReady ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading templates…</p>
        ) : (
          <select
            className="w-full max-w-md rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
            value={templateId}
            onChange={(e) => {
              const t = templates.find((x) => x.id === e.target.value)
              setTemplateId(e.target.value)
              setTemplateCode(t?.template_code || '')
            }}
            disabled={templates.length === 0}
          >
            <option value="">
              {templates.length === 0 ? 'No project form templates available' : 'Select a form template…'}
            </option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        )}
        {catalogReady && availableTemplates != null && templates.length === 0 && (
          <p className="mt-2 text-sm text-amber-700 dark:text-amber-300">
            Copy a form template down under Project Templates first — only those copies can be parameterised here.
          </p>
        )}
      </div>

      {err && (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">{err}</p>
      )}

      {!templateCode ? null : loading ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
      ) : (
        <>
          <div>
            <div className="mb-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    Fields on {selectedTemplateLabel}
                  </h3>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 max-w-2xl">
                    {showDisplayOptions
                      ? 'Edit display names and input types, then click Save on that row. Show/required apply immediately; Min/Max need Save beside those columns.'
                      : 'Turn fields on or off for this ' + (TIER_LABEL[tier] || tier) + ', mark required, and set text min/max (click Save beside Min/Max).'}
                    {chain.length > 1
                      ? ` Settings from ${chain.slice(0, -1).map((n) => (n.entityType ? TIER_LABEL[n.entityType] : 'Organisation')).join(' → ')} still apply — you can only make rules stricter here.`
                      : ''}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 shrink-0" role="tablist" aria-label="Field editing mode">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={!showDisplayOptions}
                    className={fieldViewTabBtn(!showDisplayOptions)}
                    onClick={() => setFieldViewTab('standard')}
                  >
                    Non-customise
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={showDisplayOptions}
                    className={fieldViewTabBtn(showDisplayOptions)}
                    onClick={() => setFieldViewTab('customise')}
                  >
                    Customise
                  </button>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800/80">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300">Field</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300 w-28">Type</th>
                    <th className="px-3 py-2 text-center font-medium text-gray-700 dark:text-gray-300 w-32">Local Field</th>
                    <th className="px-3 py-2 text-center font-medium text-gray-700 dark:text-gray-300 w-24">Show</th>
                    <th className="px-3 py-2 text-center font-medium text-gray-700 dark:text-gray-300 w-28">Required</th>
                    <th className="px-3 py-2 text-center font-medium text-gray-700 dark:text-gray-300 w-20">Min</th>
                    <th className="px-3 py-2 text-center font-medium text-gray-700 dark:text-gray-300 w-20">Max</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-700 dark:text-gray-300 w-28"> </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-900">
                  {catalogFields.map((item) => {
                    const mapKey = `${item.sectionKey}::${item.fieldKey}`
                    const ancestorEntry = ancestorMergedMap.get(mapKey)
                    const ancestorRequired = ancestorEntry?.required === true
                    const ownEntry = ownOverrideMap.get(mapKey)
                    const ownEnabled = ownEntry?.enabled !== false
                    const ownRequired = ownEntry?.required ?? null
                    const effectiveRequired = ownRequired !== null ? ownRequired : (ancestorEntry?.required ?? item.baseRequired)
                    const isOwnAddition = item.isLocal
                      && String(item.ownerScopeEntityType || '') === String(entityType || '')
                      && String(item.ownerScopeEntityId || '') === String(entityId || '')
                    const ownAdditionRow = item.isLocal
                      ? findAdditionRow(item.sectionKey, item.fieldKey)
                      : null
                    // Editable when this tier owns the local row (Yes badge) OR we found the addition at this tier.
                    const canEditLocalAddition = Boolean(
                      isOwnAddition
                      || (item.isLocal && ownAdditionRow && String(ownAdditionRow.scope_entity_type || '') === String(entityType || '')),
                    )
                    const editOptionsDraft = editOptionsDrafts[mapKey]
                    const masterField = masterFieldsByKey.get(mapKey)
                    const inheritedLabel = ancestorEntry?.label || masterField?.label || item.fieldLabel
                    const inheritedType = ancestorEntry?.type || masterField?.type || 'text'
                    const inheritedMin = coalesceLength(ancestorEntry?.minLength ?? masterField?.minLength)
                    const inheritedMax = coalesceLength(ancestorEntry?.maxLength ?? masterField?.maxLength)
                    const localType = ownAdditionRow?.field_definition?.type || item.fieldType || 'text'
                    const localLabel = ownAdditionRow?.field_definition?.label || item.fieldLabel
                    const localOptions = ownAdditionRow?.field_definition?.options || []
                    const localMin = coalesceLength(ownAdditionRow?.field_definition?.minLength ?? item.minLength)
                    const localMax = coalesceLength(ownAdditionRow?.field_definition?.maxLength ?? item.maxLength)
                    const customiseSeed = canEditLocalAddition
                      ? { label: localLabel, type: localType, options: localOptions }
                      : ownEntry
                    const customiseDraft = getCustomiseDraft(mapKey, customiseSeed)
                    const typeDraft = typeOverrideDrafts[mapKey]
                    const draftType = customiseDraft.type || (canEditLocalAddition ? localType : '')
                    const resolvedType = item.isLocal
                      ? (draftType || localType)
                      : (ownEntry?.type || inheritedType)
                    const typeLabel =
                      FIELD_TYPES.find((t) => t.value === (item.isLocal ? localType : (ownEntry?.type || inheritedType)))?.label ||
                      String((item.isLocal ? localType : (ownEntry?.type || inheritedType)) || 'Text')
                    const displayName = item.isLocal
                      ? localLabel
                      : (ownEntry?.label || item.fieldLabel)
                    const lengthApplies = (item.isLocal ? localType : (ownEntry?.type || inheritedType)) === 'text'
                      || (item.isLocal ? localType : (ownEntry?.type || inheritedType)) === 'textarea'
                    const canEditLength = lengthApplies && (!item.isLocal || canEditLocalAddition)
                    const savedLengthMin = item.isLocal
                      ? localMin
                      : coalesceLength(ownEntry?.minLength)
                    const savedLengthMax = item.isLocal
                      ? localMax
                      : coalesceLength(ownEntry?.maxLength)
                    const effectiveMin = item.isLocal
                      ? localMin
                      : coalesceLength(ownEntry?.minLength ?? inheritedMin)
                    const effectiveMax = item.isLocal
                      ? localMax
                      : coalesceLength(ownEntry?.maxLength ?? inheritedMax)
                    const lengthDraft = getLengthDraft(mapKey, savedLengthMin, savedLengthMax)
                    const lengthDirty = lengthDraft.min !== (savedLengthMin != null ? String(savedLengthMin) : '')
                      || lengthDraft.max !== (savedLengthMax != null ? String(savedLengthMax) : '')
                    const lengthPlaceholderMin = item.isLocal ? '—' : (inheritedMin != null ? String(inheritedMin) : '—')
                    const lengthPlaceholderMax = item.isLocal ? '—' : (inheritedMax != null ? String(inheritedMax) : '—')
                    const showLocalYes = canEditLocalAddition
                    const savedLabel = canEditLocalAddition ? localLabel : (ownEntry?.label || '')
                    const savedType = canEditLocalAddition ? localType : (ownEntry?.type || '')
                    const customiseDirty = customiseDraft.label !== savedLabel
                      || customiseDraft.type !== savedType
                      || Boolean(typeDraft)
                    const showCustomiseEditors = showDisplayOptions && (!item.isLocal || canEditLocalAddition)
                    const showSelectOptions = showCustomiseEditors && draftType === 'select'
                    const selectOptionsSeed = canEditLocalAddition ? localOptions : (ownEntry?.options || [])

                    return (
                      <tr key={mapKey} className="align-top">
                        <td className="px-3 py-2.5 text-gray-900 dark:text-gray-100">
                          <div className="font-medium">{displayName}</div>
                          {showCustomiseEditors && (
                            <div className="mt-2 flex flex-wrap items-end gap-3">
                              <div>
                                <label className="mb-0.5 block text-xs text-gray-500 dark:text-gray-400" htmlFor={`${mapKey}-tier-label-override`}>
                                  Display name
                                </label>
                                <input
                                  id={`${mapKey}-tier-label-override`}
                                  className="rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-1 text-xs text-gray-900 dark:text-gray-100 w-44"
                                  value={customiseDraft.label}
                                  placeholder={canEditLocalAddition ? localLabel : inheritedLabel}
                                  disabled={busy}
                                  onChange={(e) => setCustomiseDrafts((prev) => ({
                                    ...prev,
                                    [mapKey]: { ...getCustomiseDraft(mapKey, customiseSeed), label: e.target.value },
                                  }))}
                                />
                              </div>
                              <div>
                                <label className="mb-0.5 block text-xs text-gray-500 dark:text-gray-400" htmlFor={`${mapKey}-tier-type-override`}>
                                  Input type
                                </label>
                                <select
                                  id={`${mapKey}-tier-type-override`}
                                  className="rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-1 text-xs text-gray-900 dark:text-gray-100"
                                  value={customiseDraft.type || (canEditLocalAddition ? localType : '')}
                                  disabled={busy}
                                  onChange={(e) => {
                                    const nextType = e.target.value
                                    setCustomiseDrafts((prev) => ({
                                      ...prev,
                                      [mapKey]: { ...getCustomiseDraft(mapKey, customiseSeed), type: nextType },
                                    }))
                                    if (nextType === 'select') {
                                      setTypeOverrideDrafts((prev) => ({
                                        ...prev,
                                        [mapKey]: {
                                          type: 'select',
                                          options: prev[mapKey]?.options || selectOptionsSeed.map(optionToLine),
                                        },
                                      }))
                                    } else {
                                      setTypeOverrideDrafts((prev) => {
                                        const next = { ...prev }
                                        delete next[mapKey]
                                        return next
                                      })
                                    }
                                  }}
                                >
                                  {!canEditLocalAddition && (
                                    <option value="">
                                      {`Same as default (${FIELD_TYPES.find((t) => t.value === inheritedType)?.label || 'Text'})`}
                                    </option>
                                  )}
                                  {FIELD_TYPES.map((t) => (
                                    <option key={t.value} value={t.value}>{t.label}</option>
                                  ))}
                                </select>
                              </div>
                              <div className="flex items-center gap-2 pb-0.5">
                                <button
                                  type="button"
                                  onClick={() => saveFieldDisplayCustomisation(item.sectionKey, item.fieldKey, {
                                    isLocalAddition: canEditLocalAddition,
                                  })}
                                  disabled={busy || !customiseDirty}
                                  className="rounded bg-blue-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-500 disabled:opacity-40"
                                >
                                  Save
                                </button>
                                <button
                                  type="button"
                                  onClick={() => clearCustomiseDraft(mapKey)}
                                  disabled={busy || !customiseDirty}
                                  className="text-xs text-gray-500 hover:text-gray-400 dark:text-gray-400 disabled:opacity-40"
                                >
                                  Cancel
                                </button>
                                {customiseSavedFlash[mapKey] && (
                                  <span className="text-xs text-emerald-600 dark:text-emerald-400">Saved</span>
                                )}
                              </div>
                            </div>
                          )}
                          {showSelectOptions && (
                            <div className="mt-2 rounded border border-dashed border-gray-300 dark:border-gray-700 p-2 max-w-md">
                              <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Dropdown options</label>
                              <SelectOptionsEditor
                                value={typeDraft?.options || selectOptionsSeed.map(optionToLine)}
                                onChange={(options) => setTypeOverrideDrafts((prev) => ({
                                  ...prev,
                                  [mapKey]: { type: 'select', options },
                                }))}
                              />
                              <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                                Click Save above to apply the display name, type, and options.
                              </p>
                            </div>
                          )}
                          {editOptionsDraft && (
                            <div className="mt-2 rounded border border-dashed border-gray-300 dark:border-gray-700 p-2 max-w-md">
                              <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Edit options for {displayName}</label>
                              <SelectOptionsEditor
                                value={editOptionsDraft}
                                onChange={(options) => setEditOptionsDrafts((prev) => ({ ...prev, [mapKey]: options }))}
                              />
                              <div className="mt-2 flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleEditAdditionOptions(item.sectionKey, item.fieldKey, editOptionsDraft)}
                                  disabled={busy}
                                  className="rounded bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-500 disabled:opacity-50"
                                >
                                  Apply
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditOptionsDrafts((prev) => {
                                    const next = { ...prev }
                                    delete next[mapKey]
                                    return next
                                  })}
                                  disabled={busy}
                                  className="text-xs text-gray-500 hover:text-gray-400"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                          {typeLabel}
                        </td>
                        <td className="px-3 py-2.5 text-center whitespace-nowrap">
                          {showLocalYes ? (
                            <span className="inline-flex rounded-full bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-700 dark:bg-sky-950/50 dark:text-sky-300">
                              Yes
                            </span>
                          ) : item.isLocal ? (
                            <span
                              className="inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                              title="Added at a higher tier"
                            >
                              Upstream
                            </span>
                          ) : (
                            <span className="text-xs text-gray-500 dark:text-gray-400">No</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <input
                            type="checkbox"
                            aria-label={`Show ${displayName}`}
                            checked={ownEnabled}
                            disabled={busy || ancestorRequired}
                            title={ancestorRequired ? 'Required higher up — cannot hide here' : 'Show this field on the form'}
                            onChange={(e) => toggleEnabled(item.sectionKey, item.fieldKey, e.target.checked)}
                            className="rounded border-gray-400 dark:border-gray-600"
                          />
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <input
                            type="checkbox"
                            aria-label={`Require ${displayName}`}
                            checked={effectiveRequired}
                            disabled={busy || !ownEnabled || ancestorRequired}
                            title={ancestorRequired ? 'Already required higher up' : 'User must fill this field'}
                            onChange={(e) => toggleRequired(item.sectionKey, item.fieldKey, e.target.checked)}
                            className="rounded border-gray-400 dark:border-gray-600"
                          />
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          {canEditLength ? (
                            <input
                              id={`${mapKey}-tier-min-length`}
                              type="number"
                              min={0}
                              max={!item.isLocal && inheritedMax != null ? inheritedMax : undefined}
                              aria-label={`Min characters for ${displayName}`}
                              className="mx-auto w-16 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-1.5 py-1 text-xs text-center text-gray-900 dark:text-gray-100"
                              value={lengthDraft.min}
                              placeholder={lengthPlaceholderMin}
                              disabled={busy}
                              title={item.isLocal
                                ? 'Minimum characters for this local field (blank = none). Click Save to apply.'
                                : (inheritedMin != null ? `Ancestor minimum: ${inheritedMin}` : 'Minimum characters (blank = inherit). Click Save to apply.')}
                              onChange={(e) => setLengthDrafts((prev) => ({
                                ...prev,
                                [mapKey]: { ...getLengthDraft(mapKey, savedLengthMin, savedLengthMax), min: e.target.value },
                              }))}
                            />
                          ) : (
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {lengthApplies && effectiveMin != null ? effectiveMin : '—'}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          {canEditLength ? (
                            <input
                              id={`${mapKey}-tier-max-length`}
                              type="number"
                              min={0}
                              max={!item.isLocal && inheritedMax != null ? inheritedMax : undefined}
                              aria-label={`Max characters for ${displayName}`}
                              className="mx-auto w-16 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-1.5 py-1 text-xs text-center text-gray-900 dark:text-gray-100"
                              value={lengthDraft.max}
                              placeholder={lengthPlaceholderMax}
                              disabled={busy}
                              title={item.isLocal
                                ? 'Maximum characters for this local field (blank = none). Click Save to apply.'
                                : (inheritedMax != null ? `Ancestor maximum: ${inheritedMax}` : 'Maximum characters (blank = inherit). Click Save to apply.')}
                              onChange={(e) => setLengthDrafts((prev) => ({
                                ...prev,
                                [mapKey]: { ...getLengthDraft(mapKey, savedLengthMin, savedLengthMax), max: e.target.value },
                              }))}
                            />
                          ) : (
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {lengthApplies && effectiveMax != null ? effectiveMax : '—'}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-right whitespace-nowrap">
                          {canEditLength && (
                            <>
                              <button
                                type="button"
                                onClick={() => saveFieldLength(item.sectionKey, item.fieldKey, {
                                  isLocalAddition: item.isLocal && canEditLocalAddition,
                                  inheritedMin,
                                  inheritedMax,
                                  savedMin: savedLengthMin,
                                  savedMax: savedLengthMax,
                                })}
                                disabled={busy || !lengthDirty}
                                className="rounded bg-blue-600 px-2 py-0.5 text-xs font-medium text-white hover:bg-blue-500 disabled:opacity-40 mr-2"
                                title="Save min/max character length"
                              >
                                Save
                              </button>
                              {lengthSavedFlash[mapKey] && (
                                <span className="text-xs text-emerald-600 dark:text-emerald-400 mr-2">Saved</span>
                              )}
                            </>
                          )}
                          {canEditLocalAddition && ownAdditionRow?.field_definition?.type === 'select' && (
                            <button
                              type="button"
                              onClick={() => setEditOptionsDrafts((prev) => ({
                                ...prev,
                                [mapKey]: (ownAdditionRow.field_definition.options || []).map(optionToLine),
                              }))}
                              disabled={busy}
                              className="text-xs text-blue-600 hover:text-blue-500 dark:text-blue-400 mr-2 disabled:opacity-40"
                            >
                              Options
                            </button>
                          )}
                          {canEditLocalAddition && (
                            <RowActionButton
                              variant="delete"
                              label={`Delete field ${displayName}`}
                              onClick={() => handleDeleteField(item.fieldKey, item.sectionKey)}
                              disabled={busy}
                            />
                          )}
                        </td>
                      </tr>
                    )
                  })}
                  {catalogFields.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-3 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                        No fields on this form yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded border border-dashed border-gray-300 dark:border-gray-700 p-3">
            <h3 className="mb-1 text-sm font-semibold text-gray-900 dark:text-gray-100">
              Add a field for this {tier}
            </h3>
            <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
              Extra questions that only apply here — not added to the shared organisation form.
            </p>
            <div className="grid gap-3 md:grid-cols-5">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Section</label>
                <select
                  className="w-full rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-1.5 text-sm text-gray-900 dark:text-gray-100"
                  value={newField.sectionKey || firstSectionKey}
                  onChange={(e) => {
                    setAddFieldErr(null)
                    setNewField((prev) => ({ ...prev, sectionKey: e.target.value }))
                  }}
                  aria-label="Section"
                >
                  <option value="">Select section…</option>
                  {(schema.sections || []).map((s) => (
                    <option key={s.key} value={s.key}>{s.title || s.key}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Field key</label>
                <input
                  className="w-full rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-1.5 text-sm text-gray-900 dark:text-gray-100"
                  placeholder="e.g. quality_metric"
                  value={newField.key}
                  onChange={(e) => {
                    setAddFieldErr(null)
                    setNewField((prev) => ({ ...prev, key: e.target.value }))
                  }}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Label</label>
                <input
                  className="w-full rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-1.5 text-sm text-gray-900 dark:text-gray-100"
                  placeholder="Display label"
                  value={newField.label}
                  onChange={(e) => {
                    setAddFieldErr(null)
                    setNewField((prev) => ({ ...prev, label: e.target.value }))
                  }}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Type</label>
                <select
                  className="w-full rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-1.5 text-sm text-gray-900 dark:text-gray-100"
                  value={newField.type}
                  onChange={(e) => setNewField((prev) => ({ ...prev, type: e.target.value }))}
                >
                  {FIELD_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <label className="inline-flex items-end gap-2 pb-2 text-xs text-gray-600 dark:text-gray-400">
                <input
                  type="checkbox"
                  checked={newField.required}
                  onChange={(e) => setNewField((prev) => ({ ...prev, required: e.target.checked }))}
                />
                Required
              </label>
            </div>
            {(newField.type === 'text' || newField.type === 'textarea') && (
              <div className="mt-3 grid gap-3 md:grid-cols-5">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Min chars</label>
                  <input
                    type="number"
                    min={0}
                    className="w-full rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-1.5 text-sm text-gray-900 dark:text-gray-100"
                    value={newField.minLength}
                    onChange={(e) => setNewField((prev) => ({ ...prev, minLength: e.target.value }))}
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Max chars</label>
                  <input
                    type="number"
                    min={0}
                    className="w-full rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-1.5 text-sm text-gray-900 dark:text-gray-100"
                    value={newField.maxLength}
                    onChange={(e) => setNewField((prev) => ({ ...prev, maxLength: e.target.value }))}
                    placeholder="Optional"
                  />
                </div>
              </div>
            )}
            {newField.type === 'select' && (
              <div className="mt-3">
                <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Options</label>
                <SelectOptionsEditor
                  value={newField.options}
                  onChange={(options) => setNewField((prev) => ({ ...prev, options }))}
                />
              </div>
            )}
            {newField.type === 'attachment' && (
              <div className="mt-3 grid gap-3 md:grid-cols-5">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Accepted files</label>
                  <select
                    className="w-full rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-1.5 text-sm text-gray-900 dark:text-gray-100"
                    value={newField.accept}
                    onChange={(e) => setNewField((prev) => ({ ...prev, accept: e.target.value }))}
                  >
                    <option value="any">Any file</option>
                    <option value="image">Images only</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Max files</label>
                  <input
                    type="number"
                    min={1}
                    max={HARD_MAX_FILES_CEILING}
                    className="w-full rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-1.5 text-sm text-gray-900 dark:text-gray-100"
                    value={newField.maxFiles}
                    onChange={(e) => setNewField((prev) => ({ ...prev, maxFiles: e.target.value }))}
                  />
                </div>
              </div>
            )}
            {addFieldErr && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400" role="alert">{addFieldErr}</p>
            )}
            <button
              type="button"
              onClick={handleAddField}
              disabled={busy || !(newField.sectionKey || firstSectionKey) || !newField.key.trim() || !newField.label.trim()}
              className="mt-3 rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500 disabled:opacity-50"
            >
              Add field
            </button>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
              Completed examples for this {tier}
            </h3>
            <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
              Author a fully filled-in reference example — this {tier}'s own descendants (if any) can
              start a new form from it instead of a blank one.
            </p>
            <CompletedExampleManager
              mode={mode}
              accountId={accountId}
              templateId={templateId}
              schema={effectiveSchema}
              scopeEntityType={entityType}
              scopeEntityId={entityId}
            />
          </div>
        </>
      )}
    </div>
  )
}

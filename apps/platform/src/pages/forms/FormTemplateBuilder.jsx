import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { platformDb, simDb } from '@nidus/supabase'
import { Plus, Trash2, GripVertical, FileSpreadsheet } from 'lucide-react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useUnsavedChangesGuard } from '@nidus/shared/context/UnsavedChangesContext'
import { useViewMode } from '@nidus/shared/hooks/useViewMode'
import {
  applySchemaFieldOverrides,
  buildFieldOverrideMap,
  coalesceLength,
  getFieldLabelForOrg,
  getFieldLengthForOrg,
  getFieldTypeForOrg,
  isFieldEnabledForOrg,
  isFieldRequiredForOrg,
  listCatalogFields,
} from '@nidus/shared/utils/formTemplateFieldOverrides'
import { getDisplayRowNumber } from '@nidus/shared/utils/tableRowNumberUtils'
import {
  buildDefaultValuesMap,
  buildGuidanceValuesMap,
  listDefaultContentEntries,
} from '@nidus/shared/utils/formTemplateFieldDefaults'
import { FormTemplateExportMenu } from '@nidus/ui'
import AuditField from '@nidus/ui/AuditField'
import AuditCard from '@nidus/ui/AuditCard'
import AuditTimestampPair from '@nidus/ui/AuditTimestampPair'
import AuditDetailsPanel from '@nidus/ui/AuditDetailsPanel'
import DetailAuditTabList from '@nidus/ui/DetailAuditTabList'
import {
  humanizeAuditToken,
  resolveScopeReferenceLabel,
} from '@nidus/shared/utils/auditDisplayUtils.js'
import ViewToggle from '@nidus/ui/ViewToggle'
import { TableRowNumberHeader, TableRowNumberCell } from '@nidus/ui/Table'
import FormFieldRenderer from '../../components/forms/FormFieldRenderer'
import FormSectionCard from '../../components/forms/FormSectionCard'
import {
  getCurrentUserInternalUserId,
  resolveAccountIdForAuthUser,
} from '@nidus/shared/utils/accountResolution'
import { getActiveLanguages } from '@nidus/shared/utils/languages'
import { getFieldTranslationCoverage, getTranslationTargetLanguages } from '@nidus/shared/utils/formTranslations'
import {
  optionToLine,
  parseOptionLine,
} from '@nidus/shared/utils/formSelectOptions'
import {
  resolveFormTemplateBuilderBasePath,
  resolveFormTemplateBuilderListPath,
} from '@nidus/shared/utils/organisationalTemplateRoutes'
import {
  summarizeFormTemplateDefaultsSave,
  summarizeFormTemplateSaveChanges,
} from '@nidus/shared/utils/formTemplateSaveSummary'
import SelectOptionsEditor from '../../components/ui/SelectOptionsEditor'
import CompletedExampleManager from '../../components/ui/CompletedExampleManager'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import FormTranslationBulkImport from '../../components/forms/FormTranslationBulkImport'
import FormExcelSchemaImportModal from '../../components/forms/FormExcelSchemaImportModal'
import { getSessionPMOAdminStatus } from '../../services/pmoAdminService'
import { DEFAULT_MAX_FILES_PER_FIELD, HARD_MAX_FILES_CEILING } from '../../services/formFieldAttachmentService'
import {
  addFieldForOrg,
  clearFieldDefaultForOrg,
  deleteFieldAdditionForOrg,
  getFieldDefaultsForOrg,
  getFieldOverridesForOrg,
  getFieldTranslations,
  getFormTemplate,
  getFormTemplateFieldUsage,
  listFieldAdditionsForOrg,
  saveFormTemplate,
  setFieldDefaultForOrg,
  setFieldEnabledForOrg,
  setFieldLabelForOrg,
  setFieldLengthForOrg,
  setFieldRequiredForOrg,
  setFieldTypeForOrg,
  suggestNextTemplateCode,
  updateFieldAdditionOptions,
} from '../../services/formEngineService'

const PROCESS_GROUPS = [
  { value: 'initiating', label: 'Initiating' },
  { value: 'planning', label: 'Planning' },
  { value: 'executing', label: 'Executing' },
  { value: 'monitoring_controlling', label: 'Monitoring & Controlling' },
  { value: 'closing', label: 'Closing' },
  { value: 'agile', label: 'Agile (legacy)' },
  { value: 'starting_up', label: 'Starting Up (Structured)' },
  { value: 'directing', label: 'Directing (Structured)' },
  { value: 'controlling_a_stage', label: 'Controlling a Stage (Structured)' },
  { value: 'managing_product_delivery', label: 'Managing Product Delivery (Structured)' },
  { value: 'managing_a_stage_boundary', label: 'Managing a Stage Boundary (Structured)' },
  { value: 'backlog', label: 'Backlog (Agile)' },
  { value: 'sprint_planning', label: 'Sprint Planning (Agile)' },
  { value: 'sprint_execution', label: 'Sprint Execution (Agile)' },
  { value: 'review_retrospective', label: 'Review & Retrospective (Agile)' },
  { value: 'release', label: 'Release (Agile)' },
]

const FIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'textarea', label: 'Textarea' },
  { value: 'date', label: 'Date' },
  { value: 'number', label: 'Number' },
  { value: 'money', label: 'Money' },
  { value: 'select', label: 'Select' },
  { value: 'attachment', label: 'Attachment (image/file)' },
]

/** requiresEdit tabs need a persisted template — hidden while creating a brand-new one. */
const BUILDER_TABS = [
  { id: 'fields', label: 'Fields', requiresEdit: false },
  { id: 'availability', label: 'Field Behaviour', requiresEdit: true },
  { id: 'translations', label: 'Translations', requiresEdit: true },
  { id: 'defaults', label: 'Default Content', requiresEdit: true },
  { id: 'examples', label: 'Completed Examples', requiresEdit: true },
]

/** isNew marks fields/sections added in this editing session (not yet part of the shared catalog) — local UI state only, stripped by schemaFromForm before saving. */
function emptyField(index = 0) {
  return {
    key: `field_${index + 1}`,
    label: `Field ${index + 1}`,
    type: 'text',
    options: [],
    minLength: '',
    maxLength: '',
    accept: 'any',
    maxFiles: DEFAULT_MAX_FILES_PER_FIELD,
    isNew: true,
  }
}

function emptySection(index = 0) {
  return { key: `section_${index + 1}`, title: `Section ${index + 1}`, fields: [emptyField()], isNew: true }
}

function defaultFormState(suggestedCode = '') {
  return {
    template_code: suggestedCode,
    name: '',
    process_group: 'planning',
    is_active: false,
    sections: [emptySection()],
  }
}

function snapshotForm(form) {
  return JSON.stringify(form)
}
function schemaFromForm(form) {
  return {
    title: form.name,
    sections: form.sections.map((section) => ({
      key: section.key,
      title: section.title,
      fields: section.fields.map((field) => {
        const out = {
          key: field.key,
          label: field.label,
          type: field.type,
        }
        if (field.required) out.required = true
        if (field.type === 'select') {
          out.options = (field.options || []).map(parseOptionLine).filter(Boolean)
        }
        if (field.type === 'text' || field.type === 'textarea') {
          const minLength = coalesceLength(field.minLength)
          const maxLength = coalesceLength(field.maxLength)
          if (minLength != null) out.minLength = minLength
          if (maxLength != null) out.maxLength = maxLength
        }
        if (field.type === 'attachment') {
          out.accept = field.accept === 'image' ? 'image' : 'any'
          out.maxFiles = Math.min(Number(field.maxFiles) || DEFAULT_MAX_FILES_PER_FIELD, HARD_MAX_FILES_CEILING)
        }
        return out
      }),
    })),
  }
}

function formFromTemplate(template) {
  const schema = template?.current_version?.schema || {}
  const sections = (schema.sections || []).length
    ? schema.sections.map((section) => ({
        key: section.key || '',
        title: section.title || '',
        fields: (section.fields || []).map((field) => ({
          key: field.key || '',
          label: field.label || '',
          type: field.type || 'text',
          required: Boolean(field.required),
          options: Array.isArray(field.options) ? field.options.map(optionToLine).filter(Boolean) : [],
          minLength: field.minLength != null && field.minLength !== '' ? String(field.minLength) : '',
          maxLength: field.maxLength != null && field.maxLength !== '' ? String(field.maxLength) : '',
          accept: field.accept === 'image' ? 'image' : 'any',
          maxFiles: field.maxFiles != null ? Number(field.maxFiles) : DEFAULT_MAX_FILES_PER_FIELD,
        })),
      }))
    : [emptySection()]

  return {
    template_code: template.template_code || '',
    name: template.name || '',
    process_group: template.process_group || 'planning',
    is_active: Boolean(template.is_active),
    sections,
  }
}

const inputClass =
  'w-full rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100'
const tableInputClass =
  'w-full min-w-[6rem] rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-1 text-xs text-gray-900 dark:text-gray-100'
const labelClass = 'block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1'

/** One draggable field card within a section's field list — drag the grip handle to reorder (rule 34.1 parity with Admin's field-row reordering). */
function SortableFieldCard({
  field,
  section,
  sectionIndex,
  fieldIndex,
  updateField,
  removeField,
  activeLanguages,
  translations,
  translationTargetLanguages,
  isFieldKeyInUse,
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: field.key })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="rounded border border-gray-100 dark:border-gray-800 p-3 space-y-3"
    >
      <div className="grid gap-3 md:grid-cols-4">
        <div className="flex items-start gap-2 md:col-span-4 md:order-first">
          <button
            type="button"
            {...attributes}
            {...listeners}
            title="Drag to reorder field"
            className="mt-1 cursor-move touch-none text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            aria-label="Drag to reorder field"
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <div className="grid flex-1 gap-3 md:grid-cols-4">
            <div>
              <label className={labelClass}>Field key</label>
              <input
                className={`${inputClass} disabled:cursor-not-allowed disabled:opacity-60`}
                value={field.key}
                onChange={(e) => updateField(sectionIndex, fieldIndex, { key: e.target.value })}
                disabled={!field.isNew}
                title={!field.isNew ? 'Standard field — the key is fixed once published (it links overrides, translations, and submitted data). Only Label and Type can be changed.' : undefined}
                required
              />
            </div>
            <div>
              <label className={labelClass}>Label</label>
              <input
                className={inputClass}
                value={field.label}
                onChange={(e) => updateField(sectionIndex, fieldIndex, { label: e.target.value })}
                required
              />
            </div>
            <div>
              <label className={labelClass}>Type</label>
              <select
                className={inputClass}
                value={field.type}
                onChange={(e) => {
                  const nextType = e.target.value
                  const patch = { type: nextType }
                  if (nextType !== 'text' && nextType !== 'textarea') {
                    patch.minLength = ''
                    patch.maxLength = ''
                  }
                  updateField(sectionIndex, fieldIndex, patch)
                }}
              >
                {FIELD_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end gap-2">
              <label className="inline-flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 pb-2">
                <input
                  type="checkbox"
                  checked={Boolean(field.required)}
                  onChange={(e) => updateField(sectionIndex, fieldIndex, { required: e.target.checked })}
                />
                Required (stored)
              </label>
              {activeLanguages.length > 0 && (() => {
                const coverage = getFieldTranslationCoverage(field, section.key, translations, translationTargetLanguages)
                return (
                  <span
                    className="pb-2 text-xs text-gray-500 dark:text-gray-400"
                    title={`Translated into ${coverage.translated} of ${coverage.total} active language(s)`}
                  >
                    {coverage.translated}/{coverage.total} languages
                  </span>
                )
              })()}
              {(() => {
                const isStandard = !field.isNew
                const fieldLocked = isFieldKeyInUse(field.key)
                const disabled = isStandard || fieldLocked
                const title = isStandard
                  ? 'Standard field — cannot be deleted. Use Field Availability below to show or hide it for your organisation.'
                  : fieldLocked
                    ? 'Cannot delete — this field has recorded data in one or more forms.'
                    : 'Remove this field'
                return (
                  <button
                    type="button"
                    onClick={() => removeField(sectionIndex, fieldIndex)}
                    disabled={disabled}
                    title={title}
                    className="pb-2 text-red-500 hover:text-red-400 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-red-500"
                    aria-label="Remove field"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )
              })()}
            </div>
          </div>
        </div>
      </div>
      {(field.type === 'text' || field.type === 'textarea') && (
        <div className="grid gap-3 md:grid-cols-4 pl-6">
          <div>
            <label className={labelClass} htmlFor={`field-min-${sectionIndex}-${fieldIndex}`}>Min chars</label>
            <input
              id={`field-min-${sectionIndex}-${fieldIndex}`}
              type="number"
              min={0}
              className={inputClass}
              value={field.minLength ?? ''}
              placeholder="Optional"
              onChange={(e) => updateField(sectionIndex, fieldIndex, { minLength: e.target.value })}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor={`field-max-${sectionIndex}-${fieldIndex}`}>Max chars</label>
            <input
              id={`field-max-${sectionIndex}-${fieldIndex}`}
              type="number"
              min={0}
              className={inputClass}
              value={field.maxLength ?? ''}
              placeholder="Optional"
              onChange={(e) => updateField(sectionIndex, fieldIndex, { maxLength: e.target.value })}
            />
          </div>
          <p className="md:col-span-2 self-end pb-2 text-xs text-gray-500 dark:text-gray-400">
            Character limits for Text / Textarea. Saved with the template; lower tiers can only tighten them.
          </p>
        </div>
      )}
      {field.type === 'select' && (
        <div>
          <label className={labelClass}>Options</label>
          <SelectOptionsEditor
            value={field.options || []}
            onChange={(options) => updateField(sectionIndex, fieldIndex, { options })}
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
            Add each choice project managers will see in the dropdown. Use a custom stored value only when the saved code must differ from the label.
          </p>
        </div>
      )}
      {field.type === 'attachment' && (
        <div className="grid gap-3 md:grid-cols-4 pl-6">
          <div>
            <label className={labelClass}>Accepted files</label>
            <select
              className={inputClass}
              value={field.accept === 'image' ? 'image' : 'any'}
              onChange={(e) => updateField(sectionIndex, fieldIndex, { accept: e.target.value })}
            >
              <option value="any">Any file (images + documents)</option>
              <option value="image">Images only</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Max files</label>
            <input
              type="number"
              min={1}
              max={HARD_MAX_FILES_CEILING}
              className={inputClass}
              value={field.maxFiles ?? DEFAULT_MAX_FILES_PER_FIELD}
              onChange={(e) => updateField(sectionIndex, fieldIndex, { maxFiles: e.target.value })}
            />
          </div>
          <p className="md:col-span-2 self-end pb-2 text-xs text-gray-500 dark:text-gray-400">
            Each attachment is capped at 10MB. Max files per field cannot exceed {HARD_MAX_FILES_CEILING}.
          </p>
        </div>
      )}
    </div>
  )
}

/** Compact editable table row for Field catalog list view (rule 41). */
function SortableFieldTableRow({
  field,
  section,
  sectionIndex,
  fieldIndex,
  updateField,
  removeField,
  activeLanguages,
  translations,
  translationTargetLanguages,
  isFieldKeyInUse,
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: field.key })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }
  const isTextLike = field.type === 'text' || field.type === 'textarea'
  const isStandard = !field.isNew
  const fieldLocked = isFieldKeyInUse(field.key)
  const deleteDisabled = isStandard || fieldLocked
  const deleteTitle = isStandard
    ? 'Standard field — cannot be deleted. Use Field Behaviour to show or hide it for your organisation.'
    : fieldLocked
      ? 'Cannot delete — this field has recorded data in one or more forms.'
      : 'Remove this field'
  const coverage = activeLanguages.length > 0
    ? getFieldTranslationCoverage(field, section.key, translations, translationTargetLanguages)
    : null

  return (
    <>
      <tr
        ref={setNodeRef}
        style={style}
        className="align-middle border-t border-gray-100 dark:border-gray-800"
      >
        <TableRowNumberCell number={getDisplayRowNumber(fieldIndex)} />
        <td className="px-1 py-1.5 w-8">
          <button
            type="button"
            {...attributes}
            {...listeners}
            title="Drag to reorder field"
            className="cursor-move touch-none text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            aria-label="Drag to reorder field"
          >
            <GripVertical className="h-4 w-4" />
          </button>
        </td>
        <td className="px-1.5 py-1.5">
          <input
            className={`${tableInputClass} disabled:cursor-not-allowed disabled:opacity-60`}
            value={field.key}
            onChange={(e) => updateField(sectionIndex, fieldIndex, { key: e.target.value })}
            disabled={!field.isNew}
            title={!field.isNew ? 'Standard field — the key is fixed once published.' : undefined}
            required
            aria-label="Field key"
          />
        </td>
        <td className="px-1.5 py-1.5">
          <input
            className={tableInputClass}
            value={field.label}
            onChange={(e) => updateField(sectionIndex, fieldIndex, { label: e.target.value })}
            required
            aria-label="Label"
          />
        </td>
        <td className="px-1.5 py-1.5">
          <select
            className={tableInputClass}
            value={field.type}
            aria-label="Type"
            onChange={(e) => {
              const nextType = e.target.value
              const patch = { type: nextType }
              if (nextType !== 'text' && nextType !== 'textarea') {
                patch.minLength = ''
                patch.maxLength = ''
              }
              updateField(sectionIndex, fieldIndex, patch)
            }}
          >
            {FIELD_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </td>
        <td className="px-1.5 py-1.5 text-center">
          <input
            type="checkbox"
            checked={Boolean(field.required)}
            onChange={(e) => updateField(sectionIndex, fieldIndex, { required: e.target.checked })}
            aria-label="Required"
            className="rounded border-gray-400 dark:border-gray-600"
          />
        </td>
        <td className="px-1.5 py-1.5">
          {isTextLike ? (
            <input
              type="number"
              min={0}
              className={tableInputClass}
              value={field.minLength ?? ''}
              placeholder="—"
              onChange={(e) => updateField(sectionIndex, fieldIndex, { minLength: e.target.value })}
              aria-label="Min chars"
            />
          ) : (
            <span className="text-xs text-gray-400 dark:text-gray-500">—</span>
          )}
        </td>
        <td className="px-1.5 py-1.5">
          {isTextLike ? (
            <input
              type="number"
              min={0}
              className={tableInputClass}
              value={field.maxLength ?? ''}
              placeholder="—"
              onChange={(e) => updateField(sectionIndex, fieldIndex, { maxLength: e.target.value })}
              aria-label="Max chars"
            />
          ) : (
            <span className="text-xs text-gray-400 dark:text-gray-500">—</span>
          )}
        </td>
        <td className="px-1.5 py-1.5 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
          {coverage ? `${coverage.translated}/${coverage.total}` : '—'}
        </td>
        <td className="px-1.5 py-1.5 text-right">
          <button
            type="button"
            onClick={() => removeField(sectionIndex, fieldIndex)}
            disabled={deleteDisabled}
            title={deleteTitle}
            className="text-red-500 hover:text-red-400 disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Remove field"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </td>
      </tr>
      {field.type === 'select' && (
        <tr className="border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
          <td colSpan={10} className="px-3 py-2">
            <label className={labelClass}>Options for {field.label || field.key}</label>
            <SelectOptionsEditor
              value={field.options || []}
              onChange={(options) => updateField(sectionIndex, fieldIndex, { options })}
            />
          </td>
        </tr>
      )}
      {field.type === 'attachment' && (
        <tr className="border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
          <td colSpan={10} className="px-3 py-2">
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className={labelClass}>Accepted files</label>
                <select
                  className={tableInputClass}
                  value={field.accept === 'image' ? 'image' : 'any'}
                  onChange={(e) => updateField(sectionIndex, fieldIndex, { accept: e.target.value })}
                >
                  <option value="any">Any file (images + documents)</option>
                  <option value="image">Images only</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Max files</label>
                <input
                  type="number"
                  min={1}
                  max={HARD_MAX_FILES_CEILING}
                  className={tableInputClass}
                  value={field.maxFiles ?? DEFAULT_MAX_FILES_PER_FIELD}
                  onChange={(e) => updateField(sectionIndex, fieldIndex, { maxFiles: e.target.value })}
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Each attachment is capped at 10MB. Max files per field cannot exceed {HARD_MAX_FILES_CEILING}.
              </p>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

export default function FormTemplateBuilder({ mode = 'platform' }) {
  const { templateCode: editCode } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const isEdit = Boolean(editCode)
  const editBasePath = resolveFormTemplateBuilderBasePath(location.pathname, mode)
  const onPmTemplatesSurface =
    location.pathname.includes('/platform/templates/') ||
    location.pathname.includes('/simulator/pm/templates/')

  const [returnContext, setReturnContext] = useState(() => ({
    tier: searchParams.get('tier') || '',
    entityType: searchParams.get('entityType') || '',
    entityId: searchParams.get('entityId') || '',
  }))
  // Tier-aware Back: PMO → Organisational; portfolio/programme → entity-scoped org list; project → Project Templates.
  const adminListPath = resolveFormTemplateBuilderListPath(location.pathname, mode, returnContext)

  const [loading, setLoading] = useState(true)
  const [accessDenied, setAccessDenied] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const { showSuccess, modal: successModal } = useSuccessModal()
  const [form, setForm] = useState(defaultFormState())
  const baselineRef = useRef(snapshotForm(defaultFormState()))
  const [templateId, setTemplateId] = useState(null)
  const [auditMeta, setAuditMeta] = useState(null)
  const [detailTab, setDetailTab] = useState('details')
  const [scopeReferenceLabel, setScopeReferenceLabel] = useState(null)
  const [auditUserLabels, setAuditUserLabels] = useState({})
  const [organisationId, setOrganisationId] = useState(null)
  const [fieldsViewMode, setFieldsViewMode] = useViewMode(
    mode === 'sim' ? 'sim-form-template-builder-fields' : 'form-template-builder-fields',
    'list',
  )
  const [internalUserId, setInternalUserId] = useState(null)
  const [overrideMap, setOverrideMap] = useState(() => new Map())
  const [overrideSavingKey, setOverrideSavingKey] = useState(null)
  /** In-progress "Type → Select" edits not yet saved — keyed by `${sectionKey}::${fieldKey}`, holds { type: 'select', options } until Apply is clicked. */
  const [typeOverrideDrafts, setTypeOverrideDrafts] = useState({})
  const [fieldAdditions, setFieldAdditions] = useState([])
  const [newLocalField, setNewLocalField] = useState({
    sectionKey: '', key: '', label: '', type: 'text', required: false, options: [], minLength: '', maxLength: '',
    accept: 'any', maxFiles: DEFAULT_MAX_FILES_PER_FIELD,
  })
  const [addingLocalField, setAddingLocalField] = useState(false)
  const [deletingAdditionKey, setDeletingAdditionKey] = useState(null)
  /** In-progress "Edit options" edits for an existing local Select field — keyed by `${sectionKey}::${fieldKey}`, holds line-array until Apply. */
  const [editOptionsDrafts, setEditOptionsDrafts] = useState({})
  const [defaultValues, setDefaultValues] = useState({})
  const [guidanceValues, setGuidanceValues] = useState({})
  const [defaultsSaving, setDefaultsSaving] = useState(false)
  const [templatePersisted, setTemplatePersisted] = useState(false)
  const [fieldUsage, setFieldUsage] = useState({ fieldKeysInUse: new Set(), sectionKeysWithRows: new Set() })
  const [activeLanguages, setActiveLanguages] = useState([])
  const [translations, setTranslations] = useState([])
  const [activeTab, setActiveTab] = useState('fields')
  const [excelSchemaModalOpen, setExcelSchemaModalOpen] = useState(false)

  const translationTargetLanguages = useMemo(
    () => getTranslationTargetLanguages(activeLanguages),
    [activeLanguages],
  )

  const isFieldKeyInUse = (fieldKey) => fieldUsage.fieldKeysInUse.has(fieldKey)
  const isSectionInUse = (section) => (
    fieldUsage.sectionKeysWithRows.has(section.key)
    || section.fields.some((f) => fieldUsage.fieldKeysInUse.has(f.key))
  )

  // Compare every render — baselineRef is updated on save/load without changing `form`,
  // so a useMemo([form]) would keep a stale isDirty=true after a successful save.
  const isDirty = snapshotForm(form) !== baselineRef.current
  const { confirmDiscard } = useUnsavedChangesGuard(
    isDirty,
    'You have unsaved template changes.',
  )

  useEffect(() => {
    let cancelled = false
    const scopeType = auditMeta?.scope_entity_type
    const scopeId = auditMeta?.scope_entity_id
    if (!scopeId) {
      setScopeReferenceLabel(null)
      return
    }
    const db = mode === 'sim' ? simDb : platformDb
    resolveScopeReferenceLabel(db, { scopeType, scopeId }).then((label) => {
      if (!cancelled) setScopeReferenceLabel(label)
    })
    return () => { cancelled = true }
  }, [auditMeta?.scope_entity_type, auditMeta?.scope_entity_id, mode])

  useEffect(() => {
    const id = String(auditMeta?.created_by || '').trim()
    if (!id) {
      setAuditUserLabels({})
      return
    }
    let cancelled = false
    platformDb
      .from('users')
      .select('id, full_name, email')
      .eq('id', id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled || !data) return
        setAuditUserLabels({ [data.id]: data.full_name || data.email || data.id })
      })
    return () => { cancelled = true }
  }, [auditMeta?.created_by])

  const loadPage = useCallback(async () => {
    setLoading(true)
    setError(null)
    setAccessDenied(false)

    try {
      const { user, isPMOAdmin, authError } = await getSessionPMOAdminStatus()
      if (authError || !user) {
        console.error('[FormTemplateBuilder] getSessionPMOAdminStatus failed', authError)
        navigate('/login')
        return
      }

      const internalId = await getCurrentUserInternalUserId()
      setInternalUserId(internalId)

      const accountId = user?.id
        ? await resolveAccountIdForAuthUser(user.id, internalId)
        : null
      setOrganisationId(accountId)

      if (isEdit) {
        const result = await getFormTemplate(editCode, mode)
        if (!result.success) throw new Error(result.message || 'Template not found')
        // v852: local-form creators (created_by) may edit their own account-scoped
        // templates; creating brand-new masters stays PMO-admin-only.
        const canEditAsCreator =
          Boolean(result.data?.account_id)
          && result.data?.created_by === user.id
        if (!isPMOAdmin && !canEditAsCreator) {
          setAccessDenied(true)
          setLoading(false)
          return
        }
        const next = formFromTemplate(result.data)
        setForm(next)
        baselineRef.current = snapshotForm(next)
        setTemplateId(result.data.id)
        setTemplatePersisted(true)
        setAuditMeta({
          template_code: result.data.template_code,
          name: result.data.name,
          process_group: result.data.process_group,
          is_active: result.data.is_active,
          account_id: result.data.account_id,
          created_by: result.data.created_by,
          created_at: result.data.created_at,
          updated_at: result.data.updated_at,
          version_number: result.data.current_version?.version_number,
          tier: null,
          scope_entity_type: null,
          scope_entity_id: null,
        })

        if (result.data.id) {
          const [usage, langs, fieldTranslations, nodeResult] = await Promise.all([
            getFormTemplateFieldUsage(result.data.id, mode),
            getActiveLanguages(mode),
            getFieldTranslations(result.data.id, mode),
            (mode === 'sim' ? simDb : platformDb)
              .from('pm_template_nodes')
              .select('tier, scope_entity_type, scope_entity_id')
              .eq('domain', 'form_template')
              .eq('domain_ref_id', result.data.id)
              .maybeSingle(),
          ])
          if (usage.success) {
            setFieldUsage({
              fieldKeysInUse: new Set(usage.data.fieldKeysInUse),
              sectionKeysWithRows: new Set(usage.data.sectionKeysWithRows),
            })
          }
          if (langs.success) setActiveLanguages(langs.data)
          if (fieldTranslations.success) setTranslations(fieldTranslations.data)
          const node = nodeResult?.data
          if (node?.tier) {
            setReturnContext((prev) => ({
              tier: prev.tier || node.tier || '',
              entityType: prev.entityType || node.scope_entity_type || '',
              entityId: prev.entityId || node.scope_entity_id || '',
            }))
          }
          if (node) {
            setAuditMeta((prev) => ({
              ...(prev || {}),
              tier: node.tier || null,
              scope_entity_type: node.scope_entity_type || null,
              scope_entity_id: node.scope_entity_id || null,
            }))
          }
        }

        if (accountId && result.data.id) {
          const [overrides, defaults, additions] = await Promise.all([
            getFieldOverridesForOrg(accountId, result.data.id, mode),
            getFieldDefaultsForOrg(accountId, result.data.id, mode),
            listFieldAdditionsForOrg(accountId, result.data.id, mode),
          ])
          let nextOverrideMap = new Map()
          if (overrides.success) {
            nextOverrideMap = buildFieldOverrideMap(overrides.data)
            setOverrideMap(nextOverrideMap)
          }
          const nextAdditions = additions.success ? (additions.data || []) : []
          setFieldAdditions(nextAdditions)
          if (defaults.success) {
            const enabledSchema = applySchemaFieldOverrides(schemaFromForm(next), nextOverrideMap, nextAdditions)
            setDefaultValues(buildDefaultValuesMap(defaults.data, enabledSchema))
            setGuidanceValues(buildGuidanceValuesMap(defaults.data, enabledSchema))
          }
        }
      } else {
        if (!isPMOAdmin) {
          setAccessDenied(true)
          setLoading(false)
          return
        }
        const suggested = await suggestNextTemplateCode(mode)
        const next = defaultFormState(suggested.success ? suggested.data : 'F069')
        setForm(next)
        baselineRef.current = snapshotForm(next)
      }
    } catch (err) {
      console.error('[FormTemplateBuilder] loadPage failed', err)
      setError(err.message || 'Failed to load template builder')
    } finally {
      setLoading(false)
    }
  }, [editCode, isEdit, mode, navigate])

  useEffect(() => {
    loadPage()
  }, [loadPage])

  const updateForm = (patch) => setForm((prev) => ({ ...prev, ...patch }))

  const updateSection = (index, patch) => {
    setForm((prev) => {
      const sections = [...prev.sections]
      sections[index] = { ...sections[index], ...patch }
      return { ...prev, sections }
    })
  }

  const updateField = (sectionIndex, fieldIndex, patch) => {
    setForm((prev) => {
      const sections = [...prev.sections]
      const fields = [...sections[sectionIndex].fields]
      fields[fieldIndex] = { ...fields[fieldIndex], ...patch }
      sections[sectionIndex] = { ...sections[sectionIndex], fields }
      return { ...prev, sections }
    })
  }

  const addSection = () => {
    setForm((prev) => ({
      ...prev,
      sections: [...prev.sections, emptySection(prev.sections.length)],
    }))
  }

  const removeSection = (index) => {
    const section = form.sections[index]
    if (form.sections.length <= 1 || !section.isNew || isSectionInUse(section)) return
    setForm((prev) => ({
      ...prev,
      sections: prev.sections.filter((_, i) => i !== index),
    }))
  }

  const addField = (sectionIndex) => {
    setForm((prev) => {
      const sections = [...prev.sections]
      const currentFields = sections[sectionIndex].fields
      const fields = [...currentFields, emptyField(currentFields.length)]
      sections[sectionIndex] = { ...sections[sectionIndex], fields }
      return { ...prev, sections }
    })
  }

  const removeField = (sectionIndex, fieldIndex) => {
    const field = form.sections[sectionIndex].fields[fieldIndex]
    if (!field.isNew || isFieldKeyInUse(field.key)) return
    setForm((prev) => {
      const sections = [...prev.sections]
      const fields = sections[sectionIndex].fields.filter((_, i) => i !== fieldIndex)
      sections[sectionIndex] = {
        ...sections[sectionIndex],
        fields: fields.length ? fields : [emptyField()],
      }
      return { ...prev, sections }
    })
  }

  const dndSensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const handleFieldDragEnd = (sectionIndex) => (event) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setForm((prev) => {
      const sections = [...prev.sections]
      const fields = sections[sectionIndex].fields
      const fromIndex = fields.findIndex((f) => f.key === active.id)
      const toIndex = fields.findIndex((f) => f.key === over.id)
      if (fromIndex === -1 || toIndex === -1) return prev
      sections[sectionIndex] = { ...sections[sectionIndex], fields: arrayMove(fields, fromIndex, toIndex) }
      return { ...prev, sections }
    })
  }

  const handleSave = async (event) => {
    event.preventDefault()
    setError(null)

    for (const section of form.sections || []) {
      for (const field of section.fields || []) {
        if (field.type !== 'text' && field.type !== 'textarea') continue
        const minLength = field.minLength === '' || field.minLength == null
          ? null
          : coalesceLength(field.minLength)
        const maxLength = field.maxLength === '' || field.maxLength == null
          ? null
          : coalesceLength(field.maxLength)
        if ((field.minLength !== '' && field.minLength != null && minLength == null)
          || (field.maxLength !== '' && field.maxLength != null && maxLength == null)) {
          setError(`Min/max length for "${field.label || field.key}" must be a non-negative whole number.`)
          return
        }
        if (minLength != null && maxLength != null && maxLength < minLength) {
          setError(`Max length cannot be less than min length for "${field.label || field.key}".`)
          return
        }
      }
    }

    setSaving(true)
    const result = await saveFormTemplate(
      {
        templateCode: form.template_code,
        name: form.name,
        processGroup: form.process_group,
        isActive: form.is_active,
        schema: schemaFromForm(form),
      },
      mode,
    )

    setSaving(false)
    if (!result.success) {
      setError(result.message || 'Failed to save template')
      return
    }

    let previousForm = null
    try {
      previousForm = JSON.parse(baselineRef.current)
    } catch {
      previousForm = null
    }
    const changeSummary = summarizeFormTemplateSaveChanges(previousForm, form, {
      isCreate: !isEdit,
      templateCode: result.data.template_code,
      versionNumber: result.data.version_number,
    })

    baselineRef.current = snapshotForm(form)
    setTemplatePersisted(true)
    showSuccess({
      recordId: result.data.template_code,
      operation: isEdit ? 'updated' : 'created',
      message: changeSummary,
    })

    if (!isEdit) {
      navigate(`${editBasePath}/${result.data.template_code}/edit`, { replace: true })
    }
  }

  const catalogFields = useMemo(
    () => listCatalogFields(schemaFromForm(form)),
    [form],
  )

  const enabledDefaultSchema = useMemo(
    () => applySchemaFieldOverrides(schemaFromForm(form), overrideMap, fieldAdditions),
    [form, overrideMap, fieldAdditions],
  )

  /** Org guidance/sample rows for offline export merge (includes unsaved UI edits). */
  const exportDefaultRows = useMemo(
    () => listDefaultContentEntries(defaultValues, guidanceValues, enabledDefaultSchema)
      .filter((entry) => !entry.clear)
      .map((entry) => ({
        section_key: entry.sectionKey,
        field_key: entry.fieldKey,
        default_value: entry.value,
        guidance_text: entry.guidanceText,
      })),
    [defaultValues, guidanceValues, enabledDefaultSchema],
  )

  const handleFieldAvailabilityToggle = async (sectionKey, fieldKey, nextEnabled) => {
    if (!templateId || !organisationId) {
      setError('Could not resolve your organisation — field availability cannot be saved.')
      return
    }
    const savingKey = `${sectionKey}::${fieldKey}`
    setOverrideSavingKey(savingKey)
    setError(null)
    const result = await setFieldEnabledForOrg(
      {
        organisationId,
        templateId,
        sectionKey,
        fieldKey,
        isEnabled: nextEnabled,
        updatedByUserId: internalUserId,
      },
      mode,
    )
    setOverrideSavingKey(null)
    if (!result.success) {
      setError(result.message || 'Failed to update field availability')
      return
    }
    setOverrideMap((prev) => {
      const next = new Map(prev)
      const existing = next.get(savingKey) || { enabled: true, required: null }
      next.set(savingKey, { ...existing, enabled: nextEnabled })
      return next
    })
  }

  const handleFieldRequiredToggle = async (sectionKey, fieldKey, nextRequired) => {
    if (!templateId || !organisationId) {
      setError('Could not resolve your organisation — required flag cannot be saved.')
      return
    }
    const savingKey = `${sectionKey}::${fieldKey}`
    setOverrideSavingKey(savingKey)
    setError(null)
    const result = await setFieldRequiredForOrg(
      {
        organisationId,
        templateId,
        sectionKey,
        fieldKey,
        isRequired: nextRequired,
        updatedByUserId: internalUserId,
      },
      mode,
    )
    setOverrideSavingKey(null)
    if (!result.success) {
      setError(result.message || 'Failed to update required flag')
      return
    }
    setOverrideMap((prev) => {
      const next = new Map(prev)
      const existing = next.get(savingKey) || { enabled: true, required: null }
      next.set(savingKey, { ...existing, required: nextRequired })
      return next
    })
  }

  /** `label = ''` clears the override (reverts to the master schema's own label). */
  const handleFieldLabelSave = async (sectionKey, fieldKey, label) => {
    if (!templateId || !organisationId) {
      setError('Could not resolve your organisation — label override cannot be saved.')
      return
    }
    const savingKey = `${sectionKey}::${fieldKey}`
    const nextLabel = label.trim() === '' ? null : label.trim()
    if ((overrideMap.get(savingKey)?.label || null) === nextLabel) return
    setOverrideSavingKey(savingKey)
    setError(null)
    const result = await setFieldLabelForOrg(
      { organisationId, templateId, sectionKey, fieldKey, label: nextLabel, updatedByUserId: internalUserId },
      mode,
    )
    setOverrideSavingKey(null)
    if (!result.success) {
      setError(result.message || 'Failed to update label override')
      return
    }
    setOverrideMap((prev) => {
      const next = new Map(prev)
      const existing = next.get(savingKey) || { enabled: true, required: null, label: null, type: null, options: null }
      next.set(savingKey, { ...existing, label: nextLabel })
      return next
    })
  }

  /** Save min/max length overrides. Empty string clears that bound (inherit master). */
  const handleFieldLengthSave = async (sectionKey, fieldKey, minRaw, maxRaw) => {
    if (!templateId || !organisationId) {
      setError('Could not resolve your organisation — length override cannot be saved.')
      return
    }
    const savingKey = `${sectionKey}::${fieldKey}`
    let nextMin
    let nextMax
    try {
      nextMin = minRaw === '' || minRaw == null ? null : coalesceLength(minRaw)
      nextMax = maxRaw === '' || maxRaw == null ? null : coalesceLength(maxRaw)
      if ((minRaw !== '' && minRaw != null && nextMin == null)
        || (maxRaw !== '' && maxRaw != null && nextMax == null)) {
        throw new Error('Min/max length must be a non-negative whole number')
      }
    } catch (e) {
      setError(e.message || 'Invalid length')
      return
    }
    const own = overrideMap.get(savingKey)
    if ((own?.minLength ?? null) === nextMin && (own?.maxLength ?? null) === nextMax) return
    if (nextMin != null && nextMax != null && nextMax < nextMin) {
      setError('Max length cannot be less than min length')
      return
    }
    setOverrideSavingKey(savingKey)
    setError(null)
    const result = await setFieldLengthForOrg(
      {
        organisationId,
        templateId,
        sectionKey,
        fieldKey,
        minLength: nextMin,
        maxLength: nextMax,
        updatedByUserId: internalUserId,
      },
      mode,
    )
    setOverrideSavingKey(null)
    if (!result.success) {
      setError(result.message || 'Failed to update length override')
      return
    }
    setOverrideMap((prev) => {
      const next = new Map(prev)
      const existing = next.get(savingKey) || {
        enabled: true, required: null, label: null, type: null, options: null, minLength: null, maxLength: null,
      }
      next.set(savingKey, { ...existing, minLength: nextMin, maxLength: nextMax })
      return next
    })
  }

  /** `fieldType = ''` clears both the type and options overrides (reverts to master). */
  const handleFieldTypeSave = async (sectionKey, fieldKey, fieldType, options = null) => {
    if (!templateId || !organisationId) {
      setError('Could not resolve your organisation — type override cannot be saved.')
      return
    }
    const savingKey = `${sectionKey}::${fieldKey}`
    const nextType = fieldType || null
    if (nextType === 'select' && !(Array.isArray(options) && options.filter(Boolean).length > 0)) {
      setError('At least one option is required when overriding a field to Select.')
      return
    }
    setOverrideSavingKey(savingKey)
    setError(null)
    const result = await setFieldTypeForOrg(
      { organisationId, templateId, sectionKey, fieldKey, fieldType: nextType, options, updatedByUserId: internalUserId },
      mode,
    )
    setOverrideSavingKey(null)
    if (!result.success) {
      setError(result.message || 'Failed to update type override')
      return
    }
    setOverrideMap((prev) => {
      const next = new Map(prev)
      const existing = next.get(savingKey) || { enabled: true, required: null, label: null, type: null, options: null }
      next.set(savingKey, { ...existing, type: nextType, options: nextType === 'select' ? options.filter(Boolean) : null })
      return next
    })
    setTypeOverrideDrafts((prev) => {
      const next = { ...prev }
      delete next[savingKey]
      return next
    })
  }

  const handleAddLocalField = async () => {
    if (!templateId || !organisationId) {
      setError('Could not resolve your organisation — field cannot be added.')
      return
    }
    const key = newLocalField.key.trim()
    const label = newLocalField.label.trim()
    if (!newLocalField.sectionKey || !key || !label) {
      setError('Section, field key, and label are required to add a local field.')
      return
    }
    setAddingLocalField(true)
    setError(null)
    const fieldDefinition = {
      key,
      label,
      type: newLocalField.type,
      required: Boolean(newLocalField.required),
    }
    if (newLocalField.type === 'select') {
      fieldDefinition.options = (newLocalField.options || []).map(parseOptionLine).filter(Boolean)
    }
    if (newLocalField.type === 'text' || newLocalField.type === 'textarea') {
      const minLength = coalesceLength(newLocalField.minLength)
      const maxLength = coalesceLength(newLocalField.maxLength)
      if (newLocalField.minLength !== '' && newLocalField.minLength != null && minLength == null) {
        setError('Min length must be a non-negative whole number')
        setAddingLocalField(false)
        return
      }
      if (newLocalField.maxLength !== '' && newLocalField.maxLength != null && maxLength == null) {
        setError('Max length must be a non-negative whole number')
        setAddingLocalField(false)
        return
      }
      if (minLength != null && maxLength != null && maxLength < minLength) {
        setError('Max length cannot be less than min length')
        setAddingLocalField(false)
        return
      }
      if (minLength != null) fieldDefinition.minLength = minLength
      if (maxLength != null) fieldDefinition.maxLength = maxLength
    }
    if (newLocalField.type === 'attachment') {
      fieldDefinition.accept = newLocalField.accept === 'image' ? 'image' : 'any'
      fieldDefinition.maxFiles = Math.min(Number(newLocalField.maxFiles) || DEFAULT_MAX_FILES_PER_FIELD, HARD_MAX_FILES_CEILING)
    }
    const result = await addFieldForOrg(
      {
        organisationId,
        templateId,
        sectionKey: newLocalField.sectionKey,
        fieldDefinition,
        createdByUserId: internalUserId,
      },
      mode,
    )
    setAddingLocalField(false)
    if (!result.success) {
      setError(result.message || 'Failed to add field')
      return
    }
    setFieldAdditions((prev) => [...prev, result.data])
    setNewLocalField({
      sectionKey: '', key: '', label: '', type: 'text', required: false, options: [], minLength: '', maxLength: '',
    })
  }

  const handleDeleteLocalField = async (addition) => {
    const savingKey = `${addition.section_key}::${addition.field_key}`
    setDeletingAdditionKey(savingKey)
    setError(null)
    const result = await deleteFieldAdditionForOrg(
      {
        organisationId,
        templateId,
        sectionKey: addition.section_key,
        fieldKey: addition.field_key,
      },
      mode,
    )
    setDeletingAdditionKey(null)
    if (!result.success) {
      setError(result.message || 'Failed to delete field')
      return
    }
    setFieldAdditions((prev) => prev.filter((a) => a.id !== addition.id))
  }

  /** Options-only edit on an existing local Select field (organisation-wide layer) — key/label/type/required stay locked. */
  const handleEditAdditionOptions = async (addition, optionLines) => {
    const options = (optionLines || []).map(parseOptionLine).filter(Boolean)
    if (options.length === 0) {
      setError('At least one option is required.')
      return
    }
    const savingKey = `${addition.section_key}::${addition.field_key}`
    setDeletingAdditionKey(savingKey)
    setError(null)
    const result = await updateFieldAdditionOptions(
      { organisationId, templateId, sectionKey: addition.section_key, fieldKey: addition.field_key, options },
      mode,
    )
    setDeletingAdditionKey(null)
    if (!result.success) {
      setError(result.message || 'Failed to update options')
      return
    }
    setFieldAdditions((prev) => prev.map((a) => (a.id === addition.id ? result.data : a)))
    setEditOptionsDrafts((prev) => {
      const next = { ...prev }
      delete next[savingKey]
      return next
    })
  }

  const refreshTranslations = async () => {
    if (!templateId) return
    const result = await getFieldTranslations(templateId, mode)
    if (result.success) setTranslations(result.data)
  }

  const handleDefaultValueChange = (fieldKey, value) => {
    setDefaultValues((prev) => ({ ...prev, [fieldKey]: value }))
  }

  const handleGuidanceValueChange = (fieldKey, value) => {
    setGuidanceValues((prev) => ({ ...prev, [fieldKey]: value }))
  }

  const handleSaveDefaults = async () => {
    if (!templateId || !organisationId) {
      setError('Could not resolve your organisation — default content cannot be saved.')
      return
    }

    setDefaultsSaving(true)
    setError(null)

    const entries = listDefaultContentEntries(defaultValues, guidanceValues, enabledDefaultSchema)
    const operations = entries.map((entry) => {
      if (entry.clear) {
        return clearFieldDefaultForOrg({
          organisationId,
          templateId,
          sectionKey: entry.sectionKey,
          fieldKey: entry.fieldKey,
        }, mode)
      }
      return setFieldDefaultForOrg({
        organisationId,
        templateId,
        sectionKey: entry.sectionKey,
        fieldKey: entry.fieldKey,
        defaultValue: entry.value,
        guidanceText: entry.guidanceText,
        updatedByUserId: internalUserId,
      }, mode)
    })

    const results = await Promise.all(operations)
    setDefaultsSaving(false)

    const failed = results.find((result) => !result.success)
    if (failed) {
      setError(failed.message || 'Failed to save default content')
      return
    }

    showSuccess({
      recordId: form.template_code,
      operation: 'updated',
      message: summarizeFormTemplateDefaultsSave({
        templateCode: form.template_code,
        entries,
      }),
    })
  }

  const handleCancel = () => {
    confirmDiscard(() => navigate(adminListPath))
  }

  if (loading) {
    return (
      <div className="p-4 text-sm text-gray-500 dark:text-gray-400">Loading template builder…</div>
    )
  }

  if (accessDenied) {
    return (
      <div className="p-4 space-y-2 text-gray-900 dark:text-gray-100">
        <p className="text-sm text-red-500">
          You can only open the form template builder as a PMO Admin, or when editing a local form you created.
        </p>
        <Link to={adminListPath} className="text-sm text-blue-500 hover:underline">Back to templates</Link>
      </div>
    )
  }

  return (
    <div className="space-y-4 p-4 text-gray-900 dark:text-gray-100 max-w-5xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">{isEdit ? 'Edit Form Template' : 'New Form Template'}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Define sections and fields. Saving creates a new version without overwriting history.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <FormTemplateExportMenu
            schema={enabledDefaultSchema}
            defaultRows={exportDefaultRows}
            templateName={form.name}
            templateCode={form.template_code}
            disabled={!isEdit || !templateId}
          />
          <Link to={adminListPath} className="text-sm text-blue-500 hover:underline">← Back to templates</Link>
        </div>
      </div>

      {successModal}

      {error && (
        <div className="rounded border border-red-500/40 bg-red-950/30 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      )}

      <DetailAuditTabList
        activeTab={detailTab}
        onChange={setDetailTab}
        detailsLabel="Form details"
        ariaLabel="Form template sections"
      />

      {detailTab === 'audit' && (
        <AuditDetailsPanel description="Who created or changed this form template, and how it is classified.">
          <AuditCard title="Identity" description="How this record is labelled and versioned.">
            <AuditField label="Template code" value={form.template_code || auditMeta?.template_code} />
            <AuditField label="Name" value={form.name || auditMeta?.name} />
            <AuditField
              label="Status"
              value={form.is_active ? 'Active' : 'Draft'}
            />
            <AuditField
              label="Version"
              value={auditMeta?.version_number != null ? String(auditMeta.version_number) : null}
            />
          </AuditCard>
          <AuditCard title="Classification" description="Where this template sits.">
            <AuditField label="Process group" value={humanizeAuditToken(form.process_group || auditMeta?.process_group)} />
            <AuditField label="Tier" value={humanizeAuditToken(auditMeta?.tier || returnContext.tier)} />
            <AuditField
              label="Scope type"
              value={humanizeAuditToken(auditMeta?.scope_entity_type || returnContext.entityType)}
            />
            <AuditField
              label="Scope reference"
              value={
                scopeReferenceLabel
                || auditMeta?.scope_entity_id
                || returnContext.entityId
                || null
              }
            />
          </AuditCard>
          <AuditCard title="Record history" description="When this template was created and last changed.">
            <AuditField
              label="Created by"
              value={
                auditMeta?.created_by
                  ? (auditUserLabels[auditMeta.created_by] || auditMeta.created_by)
                  : null
              }
            />
            <AuditTimestampPair dateLabel="Created at" value={auditMeta?.created_at} />
            <AuditTimestampPair dateLabel="Last updated" value={auditMeta?.updated_at} />
          </AuditCard>
        </AuditDetailsPanel>
      )}

      {detailTab === 'details' && (
      <form onSubmit={handleSave} className="space-y-6">
        <section className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 space-y-4">
          <h2 className="text-sm font-semibold">Template details</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="template_code">Template code</label>
              <input
                id="template_code"
                className={inputClass}
                value={form.template_code}
                onChange={(e) => updateForm({ template_code: e.target.value.toUpperCase() })}
                disabled={isEdit}
                required
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="template_name">Name</label>
              <input
                id="template_name"
                className={inputClass}
                value={form.name}
                onChange={(e) => updateForm({ name: e.target.value })}
                required
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="process_group">Process group</label>
              <select
                id="process_group"
                className={inputClass}
                value={form.process_group}
                onChange={(e) => updateForm({ process_group: e.target.value })}
              >
                {PROCESS_GROUPS.map((g) => (
                  <option key={g.value} value={g.value}>{g.label}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => updateForm({ is_active: e.target.checked })}
                  className="rounded border-gray-600"
                />
                Active (published to project managers)
              </label>
              {!form.is_active && (
                <span className="ml-3 text-xs text-amber-500">Draft — hidden from non-PMO users</span>
              )}
            </div>
          </div>
        </section>

        <div className="flex flex-wrap gap-1 border-b border-gray-200 dark:border-gray-700">
          {BUILDER_TABS.map((tab) => {
            const disabled = tab.requiresEdit && !(isEdit && templateId)
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => !disabled && setActiveTab(tab.id)}
                disabled={disabled}
                title={disabled ? 'Save the template first to unlock this tab' : undefined}
                className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                }`}
              >
                {tab.label}
              </button>
            )
          })}
        </div>

        <section className={`space-y-4 ${activeTab === 'fields' ? '' : 'hidden'}`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">Field catalog</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Add or edit fields shared by every organisation. Standard fields/sections already in the
                catalog can't be deleted — use Field Availability below to show or hide them for your
                organisation instead. Only fields/sections you've just added here (and that no record uses
                yet) can be deleted.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <ViewToggle
                value={fieldsViewMode}
                onChange={setFieldsViewMode}
                ariaLabel="Field catalog layout"
              />
              <button
                type="button"
                onClick={() => setExcelSchemaModalOpen(true)}
                className="inline-flex items-center gap-1 rounded border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-xs hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" /> Import from Excel
              </button>
              <button
                type="button"
                onClick={addSection}
                className="inline-flex items-center gap-1 rounded border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-xs hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <Plus className="h-3.5 w-3.5" /> Add section
              </button>
            </div>
          </div>

          {form.sections.map((section, sectionIndex) => (
            <div
              key={`section-${sectionIndex}`}
              className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 space-y-3"
            >
              <div className="flex flex-wrap items-end gap-3 justify-between">
                <div className="grid flex-1 gap-3 md:grid-cols-2">
                  <div>
                    <label className={labelClass}>Section key</label>
                    <input
                      className={inputClass}
                      value={section.key}
                      onChange={(e) => updateSection(sectionIndex, { key: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Section title</label>
                    <input
                      className={inputClass}
                      value={section.title}
                      onChange={(e) => updateSection(sectionIndex, { title: e.target.value })}
                      required
                    />
                  </div>
                </div>
                {(() => {
                  const lastSection = form.sections.length <= 1
                  const isStandard = !section.isNew
                  const sectionLocked = isSectionInUse(section)
                  const disabled = lastSection || isStandard || sectionLocked
                  const title = lastSection
                    ? 'A form must have at least one section.'
                    : isStandard
                      ? 'Standard section — cannot be deleted. Use Field Availability below to show or hide it for your organisation.'
                      : sectionLocked
                        ? 'Cannot delete — one or more fields in this section have recorded data.'
                        : 'Remove this section'
                  return (
                    <button
                      type="button"
                      onClick={() => removeSection(sectionIndex)}
                      disabled={disabled}
                      title={title}
                      className="inline-flex items-center gap-1 text-xs text-red-500 hover:text-red-400 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-red-500"
                      aria-label="Remove section"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Remove
                    </button>
                  )
                })()}
              </div>

              <DndContext
                sensors={dndSensors}
                collisionDetection={closestCenter}
                onDragEnd={handleFieldDragEnd(sectionIndex)}
              >
                <SortableContext
                  items={section.fields.map((f) => f.key)}
                  strategy={verticalListSortingStrategy}
                >
                  {fieldsViewMode === 'list' ? (
                    <div className="overflow-x-auto rounded border border-gray-200 dark:border-gray-700">
                      <table className="min-w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-800/80">
                          <tr>
                            <TableRowNumberHeader className="!normal-case" />
                            <th className="px-1 py-2 w-8" aria-label="Reorder" />
                            <th className="px-1.5 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300">Key</th>
                            <th className="px-1.5 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300">Label</th>
                            <th className="px-1.5 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300">Type</th>
                            <th className="px-1.5 py-2 text-center text-xs font-medium text-gray-700 dark:text-gray-300">Req</th>
                            <th className="px-1.5 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300">Min</th>
                            <th className="px-1.5 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300">Max</th>
                            <th className="px-1.5 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300">Lang</th>
                            <th className="px-1.5 py-2 text-right text-xs font-medium text-gray-700 dark:text-gray-300" aria-label="Actions" />
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-900">
                          {section.fields.map((field, fieldIndex) => (
                            <SortableFieldTableRow
                              key={field.key || `field-${sectionIndex}-${fieldIndex}`}
                              field={field}
                              section={section}
                              sectionIndex={sectionIndex}
                              fieldIndex={fieldIndex}
                              updateField={updateField}
                              removeField={removeField}
                              activeLanguages={activeLanguages}
                              translations={translations}
                              translationTargetLanguages={translationTargetLanguages}
                              isFieldKeyInUse={isFieldKeyInUse}
                            />
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {section.fields.map((field, fieldIndex) => (
                        <SortableFieldCard
                          key={field.key || `field-${sectionIndex}-${fieldIndex}`}
                          field={field}
                          section={section}
                          sectionIndex={sectionIndex}
                          fieldIndex={fieldIndex}
                          updateField={updateField}
                          removeField={removeField}
                          activeLanguages={activeLanguages}
                          translations={translations}
                          translationTargetLanguages={translationTargetLanguages}
                          isFieldKeyInUse={isFieldKeyInUse}
                        />
                      ))}
                    </div>
                  )}
                </SortableContext>
              </DndContext>

              <button
                type="button"
                onClick={() => addField(sectionIndex)}
                className="inline-flex items-center gap-1 text-xs text-blue-500 hover:text-blue-400"
              >
                <Plus className="h-3.5 w-3.5" /> Add field
              </button>
            </div>
          ))}
        </section>

        {isEdit && templateId && activeTab === 'availability' && (
          <section className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 space-y-4">
            <div>
              <h2 className="text-sm font-semibold">Field behaviour for your organisation</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Enable/disable, require, relabel, retype, or set text min/max length for your organisation
                only. Other organisations are unaffected. Disabled fields are hidden when project managers
                create new form instances; a disabled field&apos;s required setting is ignored while it stays
                disabled. Leave Label blank, Type on &quot;(inherit)&quot;, or Min/Max empty to keep the
                shared catalog&apos;s own value.
              </p>
            </div>
            {!organisationId ? (
              <p className="text-sm text-amber-500">Organisation could not be resolved for your account.</p>
            ) : catalogFields.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">No fields in the catalog yet.</p>
            ) : (
              <ul className="divide-y divide-gray-100 dark:divide-gray-800 rounded border border-gray-100 dark:border-gray-800">
                {catalogFields.map((item) => {
                  const mapKey = `${item.sectionKey}::${item.fieldKey}`
                  const enabled = isFieldEnabledForOrg(overrideMap, item.sectionKey, item.fieldKey)
                  const required = isFieldRequiredForOrg(overrideMap, item.sectionKey, item.fieldKey, item.baseRequired)
                  const saving = overrideSavingKey === mapKey
                  const ownLabelOverride = overrideMap.get(mapKey)?.label || ''
                  const ownLength = overrideMap.get(mapKey)
                  const { type: effectiveType } = getFieldTypeForOrg(overrideMap, item.sectionKey, item.fieldKey, item.baseType, item.baseOptions)
                  const { minLength: effectiveMin, maxLength: effectiveMax } = getFieldLengthForOrg(
                    overrideMap,
                    item.sectionKey,
                    item.fieldKey,
                    item.baseMinLength,
                    item.baseMaxLength,
                  )
                  const typeDraft = typeOverrideDrafts[mapKey]
                  const typeSelectValue = typeDraft?.type || overrideMap.get(mapKey)?.type || ''
                  const usageWarning = isFieldKeyInUse(item.fieldKey)
                  const showLengthControls = effectiveType === 'text' || effectiveType === 'textarea'
                  return (
                    <li
                      key={mapKey}
                      className="flex flex-col gap-2 px-3 py-2 text-sm"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <span className="font-medium text-gray-900 dark:text-gray-100">{item.fieldLabel}</span>
                          <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                            {item.sectionTitle} · {item.fieldKey}
                          </span>
                        </div>
                        <div className="flex items-center gap-4">
                          <label className="inline-flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                            <input
                              type="checkbox"
                              checked={enabled}
                              disabled={saving}
                              onChange={(e) => handleFieldAvailabilityToggle(
                                item.sectionKey,
                                item.fieldKey,
                                e.target.checked,
                              )}
                              className="rounded border-gray-600"
                            />
                            {saving ? 'Saving…' : enabled ? 'Enabled' : 'Disabled'}
                          </label>
                          <label
                            className="inline-flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400"
                            title={!enabled ? 'Required is ignored while this field is disabled' : undefined}
                          >
                            <input
                              type="checkbox"
                              checked={required}
                              disabled={saving || !enabled}
                              onChange={(e) => handleFieldRequiredToggle(
                                item.sectionKey,
                                item.fieldKey,
                                e.target.checked,
                              )}
                              className="rounded border-gray-600"
                            />
                            Required
                          </label>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-1.5">
                          <label className="text-xs text-gray-500 dark:text-gray-400" htmlFor={`${mapKey}-label-override`}>Label</label>
                          <input
                            id={`${mapKey}-label-override`}
                            className="rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-1 text-xs text-gray-900 dark:text-gray-100 w-40"
                            defaultValue={ownLabelOverride}
                            placeholder={item.fieldLabel}
                            disabled={saving}
                            onBlur={(e) => handleFieldLabelSave(item.sectionKey, item.fieldKey, e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
                          />
                        </div>
                        <div className="flex items-center gap-1.5">
                          <label className="text-xs text-gray-500 dark:text-gray-400" htmlFor={`${mapKey}-type-override`}>Type</label>
                          <select
                            id={`${mapKey}-type-override`}
                            className="rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-1 text-xs text-gray-900 dark:text-gray-100"
                            value={typeSelectValue}
                            disabled={saving}
                            onChange={(e) => {
                              const nextType = e.target.value
                              if (nextType === 'select') {
                                setTypeOverrideDrafts((prev) => ({
                                  ...prev,
                                  [mapKey]: { type: 'select', options: (overrideMap.get(mapKey)?.options || []).map(optionToLine) },
                                }))
                                return
                              }
                              setTypeOverrideDrafts((prev) => {
                                const next = { ...prev }
                                delete next[mapKey]
                                return next
                              })
                              handleFieldTypeSave(item.sectionKey, item.fieldKey, nextType || null)
                            }}
                          >
                            <option value="">
                              {`(inherit — ${FIELD_TYPES.find((t) => t.value === item.baseType)?.label || 'Text'})`}
                            </option>
                            {FIELD_TYPES.map((t) => (
                              <option key={t.value} value={t.value}>{t.label}</option>
                            ))}
                          </select>
                        </div>
                        {showLengthControls && (
                          <>
                            <div className="flex items-center gap-1.5">
                              <label className="text-xs text-gray-500 dark:text-gray-400" htmlFor={`${mapKey}-min-length`}>Min</label>
                              <input
                                id={`${mapKey}-min-length`}
                                type="number"
                                min={0}
                                className="rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-1 text-xs text-gray-900 dark:text-gray-100 w-20"
                                defaultValue={ownLength?.minLength ?? ''}
                                placeholder={item.baseMinLength != null ? String(item.baseMinLength) : (effectiveMin != null ? String(effectiveMin) : '')}
                                disabled={saving}
                                onBlur={(e) => {
                                  const maxEl = document.getElementById(`${mapKey}-max-length`)
                                  handleFieldLengthSave(item.sectionKey, item.fieldKey, e.target.value, maxEl?.value ?? '')
                                }}
                                onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
                              />
                            </div>
                            <div className="flex items-center gap-1.5">
                              <label className="text-xs text-gray-500 dark:text-gray-400" htmlFor={`${mapKey}-max-length`}>Max</label>
                              <input
                                id={`${mapKey}-max-length`}
                                type="number"
                                min={0}
                                className="rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-1 text-xs text-gray-900 dark:text-gray-100 w-20"
                                defaultValue={ownLength?.maxLength ?? ''}
                                placeholder={item.baseMaxLength != null ? String(item.baseMaxLength) : (effectiveMax != null ? String(effectiveMax) : '')}
                                disabled={saving}
                                onBlur={(e) => {
                                  const minEl = document.getElementById(`${mapKey}-min-length`)
                                  handleFieldLengthSave(item.sectionKey, item.fieldKey, minEl?.value ?? '', e.target.value)
                                }}
                                onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
                              />
                            </div>
                          </>
                        )}
                        {usageWarning && (effectiveType !== item.baseType || typeDraft) && (
                          <span className="text-xs text-amber-500">
                            Existing submissions have data in this field — changing its type only affects how it's edited going forward.
                          </span>
                        )}
                      </div>
                      {typeDraft?.type === 'select' && (
                        <div className="rounded border border-dashed border-gray-300 dark:border-gray-700 p-2">
                          <label className={labelClass}>Options for this override</label>
                          <SelectOptionsEditor
                            value={typeDraft.options}
                            onChange={(options) => setTypeOverrideDrafts((prev) => ({ ...prev, [mapKey]: { ...prev[mapKey], options } }))}
                          />
                          <div className="mt-2 flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleFieldTypeSave(item.sectionKey, item.fieldKey, 'select', (typeDraft.options || []).map(parseOptionLine).filter(Boolean))}
                              disabled={saving}
                              className="rounded bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-500 disabled:opacity-50"
                            >
                              Apply
                            </button>
                            <button
                              type="button"
                              onClick={() => setTypeOverrideDrafts((prev) => {
                                const next = { ...prev }
                                delete next[mapKey]
                                return next
                              })}
                              disabled={saving}
                              className="text-xs text-gray-500 hover:text-gray-400"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}

            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <h3 className="text-sm font-semibold">Your organisation's local fields</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Fields added here only exist for your organisation — not the shared catalog. They appear
                appended to their section, after the standard fields, for your project managers.
              </p>

              {fieldAdditions.length > 0 && (
                <ul className="mt-3 divide-y divide-gray-100 dark:divide-gray-800 rounded border border-gray-100 dark:border-gray-800">
                  {fieldAdditions.map((addition) => {
                    const mapKey = `${addition.section_key}::${addition.field_key}`
                    const locked = isFieldKeyInUse(addition.field_key)
                    const deleting = deletingAdditionKey === mapKey
                    const editOptionsDraft = editOptionsDrafts[mapKey]
                    return (
                      <li key={addition.id} className="flex flex-col gap-2 px-3 py-2 text-sm">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <span className="font-medium text-gray-900 dark:text-gray-100">
                              {addition.field_definition?.label || addition.field_key}
                            </span>
                            <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                              {addition.section_key} · {addition.field_key} · {addition.field_definition?.type}
                              {addition.field_definition?.required ? ' · required' : ''}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            {addition.field_definition?.type === 'select' && (
                              <button
                                type="button"
                                onClick={() => setEditOptionsDrafts((prev) => ({
                                  ...prev,
                                  [mapKey]: (addition.field_definition.options || []).map(optionToLine),
                                }))}
                                disabled={deleting}
                                className="text-xs text-blue-500 hover:text-blue-400 disabled:opacity-40"
                              >
                                Edit options
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDeleteLocalField(addition)}
                              disabled={locked || deleting}
                              title={locked ? 'Cannot delete — this field has recorded data in one or more forms.' : 'Delete this local field'}
                              className="text-xs text-red-500 hover:text-red-400 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              {deleting ? 'Deleting…' : 'Delete'}
                            </button>
                          </div>
                        </div>
                        {editOptionsDraft && (
                          <div className="rounded border border-dashed border-gray-300 dark:border-gray-700 p-2">
                            <label className={labelClass}>Edit options for {addition.field_definition?.label || addition.field_key}</label>
                            <SelectOptionsEditor
                              value={editOptionsDraft}
                              onChange={(options) => setEditOptionsDrafts((prev) => ({ ...prev, [mapKey]: options }))}
                            />
                            <div className="mt-2 flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleEditAdditionOptions(addition, editOptionsDraft)}
                                disabled={deleting}
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
                                disabled={deleting}
                                className="text-xs text-gray-500 hover:text-gray-400"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}

              <div className="mt-3 grid gap-3 rounded border border-dashed border-gray-300 dark:border-gray-700 p-3 md:grid-cols-5">
                <div>
                  <label className={labelClass}>Section</label>
                  <select
                    className={inputClass}
                    value={newLocalField.sectionKey}
                    onChange={(e) => setNewLocalField((prev) => ({ ...prev, sectionKey: e.target.value }))}
                  >
                    <option value="">Select section</option>
                    {form.sections.map((section) => (
                      <option key={section.key} value={section.key}>{section.title || section.key}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Field key</label>
                  <input
                    className={inputClass}
                    value={newLocalField.key}
                    onChange={(e) => setNewLocalField((prev) => ({ ...prev, key: e.target.value }))}
                  />
                </div>
                <div>
                  <label className={labelClass}>Label</label>
                  <input
                    className={inputClass}
                    value={newLocalField.label}
                    onChange={(e) => setNewLocalField((prev) => ({ ...prev, label: e.target.value }))}
                  />
                </div>
                <div>
                  <label className={labelClass}>Type</label>
                  <select
                    className={inputClass}
                    value={newLocalField.type}
                    onChange={(e) => setNewLocalField((prev) => ({ ...prev, type: e.target.value }))}
                  >
                    {FIELD_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end gap-2">
                  <label className="inline-flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 pb-2">
                    <input
                      type="checkbox"
                      checked={newLocalField.required}
                      onChange={(e) => setNewLocalField((prev) => ({ ...prev, required: e.target.checked }))}
                    />
                    Required
                  </label>
                </div>
                {(newLocalField.type === 'text' || newLocalField.type === 'textarea') && (
                  <>
                    <div>
                      <label className={labelClass}>Min chars</label>
                      <input
                        type="number"
                        min={0}
                        className={inputClass}
                        value={newLocalField.minLength}
                        onChange={(e) => setNewLocalField((prev) => ({ ...prev, minLength: e.target.value }))}
                        placeholder="Optional"
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Max chars</label>
                      <input
                        type="number"
                        min={0}
                        className={inputClass}
                        value={newLocalField.maxLength}
                        onChange={(e) => setNewLocalField((prev) => ({ ...prev, maxLength: e.target.value }))}
                        placeholder="Optional"
                      />
                    </div>
                  </>
                )}
                {newLocalField.type === 'select' && (
                  <div className="md:col-span-5">
                    <label className={labelClass}>Options</label>
                    <SelectOptionsEditor
                      value={newLocalField.options}
                      onChange={(options) => setNewLocalField((prev) => ({ ...prev, options }))}
                    />
                  </div>
                )}
                {newLocalField.type === 'attachment' && (
                  <>
                    <div>
                      <label className={labelClass}>Accepted files</label>
                      <select
                        className={inputClass}
                        value={newLocalField.accept}
                        onChange={(e) => setNewLocalField((prev) => ({ ...prev, accept: e.target.value }))}
                      >
                        <option value="any">Any file</option>
                        <option value="image">Images only</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>Max files</label>
                      <input
                        type="number"
                        min={1}
                        max={HARD_MAX_FILES_CEILING}
                        className={inputClass}
                        value={newLocalField.maxFiles}
                        onChange={(e) => setNewLocalField((prev) => ({ ...prev, maxFiles: e.target.value }))}
                      />
                    </div>
                  </>
                )}
                <div className="md:col-span-5">
                  <button
                    type="button"
                    onClick={handleAddLocalField}
                    disabled={addingLocalField}
                    className="inline-flex items-center gap-1 rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500 disabled:opacity-50"
                  >
                    <Plus className="h-3.5 w-3.5" /> {addingLocalField ? 'Adding…' : 'Add field'}
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {isEdit && templateId && activeTab === 'translations' && (
          <section className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 space-y-4">
            <div>
              <h2 className="text-sm font-semibold">Translations</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Translate field labels and select-option labels via a bulk Excel upload. Translations are
                shared by every organisation, like the field catalog itself — end users pick their display
                language from the header; untranslated fields fall back to the labels above.
              </p>
            </div>
            {activeLanguages.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">No active languages configured.</p>
            ) : (
              <FormTranslationBulkImport
                template={{ id: templateId, template_code: form.template_code }}
                schema={schemaFromForm(form)}
                activeLanguages={activeLanguages}
                mode={mode}
                onImportComplete={refreshTranslations}
              />
            )}
          </section>
        )}

        {isEdit && templateId && activeTab === 'defaults' && (
          <section className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold">Default content for your organisation</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Guidance appears as on-screen help and in offline template exports (Plain /
                  Sample). Sample defaults pre-fill new form instances and supply Example lines
                  on Plain exports. Disabled fields are skipped.
                </p>
              </div>
              <button
                type="button"
                onClick={handleSaveDefaults}
                disabled={defaultsSaving || !organisationId}
                className="rounded bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
              >
                {defaultsSaving ? 'Saving defaults…' : 'Save defaults'}
              </button>
            </div>

            {!organisationId ? (
              <p className="text-sm text-amber-500">Organisation could not be resolved for your account.</p>
            ) : (enabledDefaultSchema.sections || []).length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">No enabled fields are available for defaults.</p>
            ) : (
              <div className="space-y-4">
                {(enabledDefaultSchema.sections || []).map((section) => (
                  <FormSectionCard key={section.key} title={section.title || section.key}>
                    {(section.fields || []).map((field) => (
                      <div key={field.key} className="space-y-3 border-b border-gray-100 dark:border-gray-800 pb-4 last:border-0 last:pb-0">
                        <p className="text-xs font-medium text-gray-700 dark:text-gray-200">
                          {field.label || field.key}
                        </p>
                        <div className="space-y-1">
                          <label className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
                            Guidance (offline / on-screen help)
                          </label>
                          <textarea
                            rows={3}
                            value={guidanceValues[field.key] ?? ''}
                            onChange={(e) => handleGuidanceValueChange(field.key, e.target.value)}
                            className="w-full rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 resize-y"
                            placeholder="How should users complete this field?"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
                            Sample / example (pre-fill + Plain export)
                          </label>
                          <FormFieldRenderer
                            field={field}
                            value={defaultValues[field.key]}
                            onChange={handleDefaultValueChange}
                          />
                        </div>
                      </div>
                    ))}
                  </FormSectionCard>
                ))}
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Clear both guidance and sample, then save, to remove the field default row.
                  Clear only the sample to stop pre-filling while keeping instructions.
                </p>
              </div>
            )}
          </section>
        )}

        {isEdit && templateId && activeTab === 'examples' && (
          <section className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 space-y-4">
            <div>
              <h2 className="text-sm font-semibold">Completed examples for your organisation</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Author a fully filled-in reference example — Portfolio, Programme, and Project
                managers under your organisation can start a new form from it instead of a blank one.
              </p>
            </div>
            {!organisationId ? (
              <p className="text-sm text-amber-500">Organisation could not be resolved for your account.</p>
            ) : (
              <CompletedExampleManager
                mode={mode}
                accountId={organisationId}
                templateId={templateId}
                schema={enabledDefaultSchema}
              />
            )}
          </section>
        )}

        <FormExcelSchemaImportModal
          isOpen={excelSchemaModalOpen}
          onClose={() => setExcelSchemaModalOpen(false)}
          sections={form.sections}
          onApply={(nextSections) => updateForm({ sections: nextSections })}
        />

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save template'}
          </button>
          <button
            type="button"
            onClick={handleCancel}
            className="rounded border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            Cancel
          </button>
          {isEdit && (
            <Link
              to={
                onPmTemplatesSurface
                  ? adminListPath
                  : `${adminListPath}?group=${encodeURIComponent(
                    PROCESS_GROUPS.find((g) => g.value === form.process_group)?.label?.replace(' & Controlling', '') || 'Planning',
                  )}`
              }
              className="rounded border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              View in gallery
            </Link>
          )}
        </div>
      </form>
      )}
    </div>
  )
}

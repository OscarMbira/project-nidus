/**
 * Project Mandate edit form — content tabs (v1344, slice 2). Shared by the Platform and Simulator
 * edit pages so both show the same fields in the same tabs. Audit details stays on the page
 * (it needs the record's history), so this component renders the content tabs only.
 *
 * Tabs (MANDATE_TABS): Purpose · Scope · People · Objectives & Constraints · Quality & Case ·
 * Deliverables & Dependencies. List fields are stored as JSON arrays (one item per line), the
 * mandate's existing convention; plain-text legacy values are read as one item per line.
 *
 * @param {{
 *   activeTab: string,
 *   formData: Record<string, any>,
 *   errors?: Record<string, string>,
 *   onChange: (e: { target: { name: string, value: any } }) => void,
 *   onListChange: (name: string, multilineValue: string) => void,
 *   showPeople?: boolean,               Simulator mandates have no proposed Executive / PM columns
 *   deliverables?: React.ReactNode,     the page's MandateDeliverablesSection
 *   dependencies?: React.ReactNode,     the page's MandateDependenciesSection
 *   viewModePrefix: string,
 *   helpSchema?: 'public'|'sim',        v1345: field help keys <schema>.project_mandates.<column>
 * }} props
 */
import MultiLineListInput from './MultiLineListInput'
import FieldLabelWithHelp from './FieldLabelWithHelp'
import { FieldHelpScope } from '@nidus/shared/context/FieldHelpContext'

// v1345 slice 3: help keys for the mandate fields and the deliverable / dependency rows on the last tab.
const MANDATE_HELP_COLUMNS = [
  'mandate_reference', 'mandate_title', 'project_code', 'project_name', 'purpose', 'background', 'authority_responsible',
  'scope', 'scope_exclusions', 'interfaces', 'proposed_executive_name', 'proposed_pm_name', 'project_objectives',
  'constraints', 'assumptions', 'outline_risks', 'quality_expectations', 'quality_priority', 'outline_business_case',
  'key_deliverables', 'dependencies',
]
const DELIVERABLE_HELP_COLUMNS = ['deliverable_name', 'deliverable_description', 'estimated_completion', 'is_in_scope', 'is_major_deliverable']
const DEPENDENCY_HELP_COLUMNS = ['dependency_description', 'dependency_type', 'dependency_status', 'impact_during_project', 'impact_after_implementation']

/** All help keys used by the mandate edit / create forms for one schema. */
export function mandateHelpKeys(schema = 'public') {
  return [
    ...MANDATE_HELP_COLUMNS.map((c) => `${schema}.project_mandates.${c}`),
    ...DELIVERABLE_HELP_COLUMNS.map((c) => `${schema}.mandate_deliverables.${c}`),
    ...DEPENDENCY_HELP_COLUMNS.map((c) => `${schema}.mandate_dependencies.${c}`),
  ]
}

export const MANDATE_TABS = [
  { value: 'purpose', label: 'Purpose' },
  { value: 'scope', label: 'Scope' },
  { value: 'people', label: 'People' },
  { value: 'objectives', label: 'Objectives & Constraints' },
  { value: 'case', label: 'Quality & Case' },
  { value: 'deliverables', label: 'Deliverables & Dependencies' },
]

/** JSON array / legacy text → one item per line. */
export function mandateListToMultiline(value) {
  if (!value) return ''
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean).join('\n')
  const raw = String(value).trim()
  if (!raw) return ''
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed.map((v) => String(v).trim()).filter(Boolean).join('\n')
  } catch {
    /* plain text */
  }
  return raw
}

/** One item per line → JSON array text (empty list → '[]'). */
export function multilineToMandateList(value) {
  const lines = String(value || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  return JSON.stringify(lines)
}

const QUALITY_PRIORITIES = [
  { value: 'balanced', label: 'Balanced' },
  { value: 'time', label: 'Time first' },
  { value: 'cost', label: 'Cost first' },
  { value: 'quality', label: 'Quality first' },
]

const card = 'bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6'
const input = 'w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600'
const labelCls = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'
const hint = 'text-sm text-gray-600 dark:text-gray-400 mb-4'
const err = (msg) => (msg ? <p className="mt-1 text-sm text-red-600 dark:text-red-400">{msg}</p> : null)

function ListCard({ title, help, name, formData, onListChange, errors, viewModePrefix, placeholder, itemLabel, helpSchema }) {
  return (
    <div className={card}>
      <FieldLabelWithHelp as="h2" helpKey={`${helpSchema}.project_mandates.${name}`} className="text-lg font-semibold mb-1 text-gray-900 dark:text-white">{title}</FieldLabelWithHelp>
      <p className={hint}>{help}</p>
      <MultiLineListInput
        viewModeId={`${viewModePrefix}-${name}`}
        id={`mandate_${name}_edit`}
        value={mandateListToMultiline(formData[name])}
        onChange={(v) => onListChange(name, v)}
        placeholder={placeholder}
        ariaLabelPrefix={itemLabel.toLowerCase()}
        itemColumnLabel={itemLabel}
      />
      {err(errors?.[name])}
    </div>
  )
}

function TextCard({ title, help, name, formData, onChange, rows = 4, placeholder, helpSchema }) {
  return (
    <div className={card}>
      <FieldLabelWithHelp helpKey={`${helpSchema}.project_mandates.${name}`} htmlFor={`mandate_${name}`} className="text-lg font-semibold mb-1 text-gray-900 dark:text-white block">{title}</FieldLabelWithHelp>
      <p className={hint}>{help}</p>
      <textarea id={`mandate_${name}`} name={name} rows={rows} className={input} value={formData[name] || ''}
        onChange={onChange} placeholder={placeholder} />
    </div>
  )
}

export default function MandateFieldTabs(props) {
  const schema = props.helpSchema || 'public'
  return (
    <FieldHelpScope helpKeys={mandateHelpKeys(schema)}>
      <MandateTabBody {...props} helpSchema={schema} />
    </FieldHelpScope>
  )
}

function MandateTabBody({
  activeTab, formData, errors = {}, onChange, onListChange, showPeople = true, deliverables = null, dependencies = null, viewModePrefix, helpSchema,
}) {
  const shared = { formData, onChange, onListChange, errors, viewModePrefix, helpSchema }
  const L = (column, htmlFor, children, extra = {}) => (
    <FieldLabelWithHelp helpKey={`${helpSchema}.project_mandates.${column}`} htmlFor={htmlFor} className={labelCls} {...extra}>{children}</FieldLabelWithHelp>
  )

  if (activeTab === 'purpose') {
    return (
      <div className="space-y-6">
        <div className={card}>
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              {L('mandate_reference', 'mandate_reference', 'Mandate Code')}
              <input id="mandate_reference" name="mandate_reference" className={input} value={formData.mandate_reference || ''}
                onChange={onChange} maxLength={50} placeholder="e.g., MAN-2026-001" />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Optional: auto-generated if not provided</p>
            </div>
            <div>
              {L('mandate_title', 'mandate_title', <>Mandate Title <span className="text-red-500">*</span></>, { required: true })}
              <input id="mandate_title" name="mandate_title" className={input} value={formData.mandate_title || ''} onChange={onChange} required />
              {err(errors.mandate_title)}
            </div>
            <div>
              {L('project_code', 'project_code', 'Project Code')}
              <input id="project_code" name="project_code" className={input} value={formData.project_code || ''} onChange={onChange}
                placeholder="Enter project code if known..." />
            </div>
            <div>
              {L('project_name', 'project_name', 'Project Name')}
              <input id="project_name" name="project_name" className={input} value={formData.project_name || ''} onChange={onChange}
                placeholder="Enter project name if known..." />
            </div>
          </div>
        </div>
        <TextCard {...shared} title="Purpose" name="purpose" rows={3} help="Why the project is being proposed, in a sentence or two." />
        <TextCard {...shared} title="Background" name="background" rows={5} help="The situation that led to this mandate." />
        <ListCard {...shared} title="Authority responsible" name="authority_responsible" itemLabel="Authority"
          help="Who is commissioning the project (e.g. the corporate board or programme)." placeholder="e.g. Executive Committee" />
      </div>
    )
  }

  if (activeTab === 'scope') {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ListCard {...shared} title="Scope" name="scope" itemLabel="Scope point"
          help="What the project is about and what it will deliver." placeholder="e.g. Replace the legacy core platform" />
        <ListCard {...shared} title="Out of scope" name="scope_exclusions" itemLabel="Exclusion"
          help="What the project will deliberately not cover." placeholder="e.g. Card processing" />
        <ListCard {...shared} title="Interfaces" name="interfaces" itemLabel="Interface"
          help="Other projects, systems or teams this work must connect with." placeholder="e.g. Payments switch" />
      </div>
    )
  }

  if (activeTab === 'people') {
    return (
      <div className={card}>
        <h2 className="text-lg font-semibold mb-1 text-gray-900 dark:text-white">Responsibilities</h2>
        <p className={hint}>Who is in overall charge (Executive), and who the Project Manager is if already decided.</p>
        {showPeople ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              {L('proposed_executive_name', 'proposed_executive_name', 'Executive')}
              <input id="proposed_executive_name" name="proposed_executive_name" className={input}
                value={formData.proposed_executive_name || ''} onChange={onChange} placeholder="Name of the Executive" />
            </div>
            <div>
              {L('proposed_pm_name', 'proposed_pm_name', 'Project Manager')}
              <input id="proposed_pm_name" name="proposed_pm_name" className={input}
                value={formData.proposed_pm_name || ''} onChange={onChange} placeholder="Name of the Project Manager (if known)" />
            </div>
            <div className="md:col-span-2">{err(errors.proposed_executive_name)}</div>
          </div>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">Practice mandates name the people on the practice project itself.</p>
        )}
      </div>
    )
  }

  if (activeTab === 'objectives') {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ListCard {...shared} title="Objectives" name="project_objectives" itemLabel="Objective"
          help="What the project is expected to achieve." placeholder="e.g. Cut account-opening time to same-day" />
        <ListCard {...shared} title="Key constraints" name="constraints" itemLabel="Constraint"
          help="Limits such as delivery date, maximum budget or required integrations." placeholder="e.g. Must go live before year end" />
        <ListCard {...shared} title="Assumptions" name="assumptions" itemLabel="Assumption"
          help="What is being taken as true for planning." placeholder="e.g. The vendor contract is signed by March" />
        <ListCard {...shared} title="Known risks and issues" name="outline_risks" itemLabel="Risk or issue"
          help="Risks or issues already known at mandate stage." placeholder="e.g. Key SMEs also on year-end close" />
      </div>
    )
  }

  if (activeTab === 'case') {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ListCard {...shared} title="Quality expectations" name="quality_expectations" itemLabel="Expectation"
          help="What the customer expects the result to be like." placeholder="e.g. 99.9% availability" />
        <div className={card}>
          <FieldLabelWithHelp helpKey={`${helpSchema}.project_mandates.quality_priority`} htmlFor="quality_priority" className="text-lg font-semibold mb-1 text-gray-900 dark:text-white block" options={QUALITY_PRIORITIES}>Quality priority</FieldLabelWithHelp>
          <p className={hint}>Which matters most if trade-offs are needed.</p>
          {/* Values match the CHECK constraint on project_mandates.quality_priority (v160 / sim v80). */}
          <select id="quality_priority" name="quality_priority" className={input} value={formData.quality_priority || 'balanced'} onChange={onChange}>
            {QUALITY_PRIORITIES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="lg:col-span-2">
          <TextCard {...shared} title="Outline business case" name="outline_business_case" rows={5}
            help="Why the project is worth doing: expected benefits, rough cost and funding." />
        </div>
      </div>
    )
  }

  if (activeTab === 'deliverables') {
    return (
      <div className="space-y-6">
        {deliverables}
        {dependencies}
      </div>
    )
  }

  return null
}

/** Read-only Assumptions and Known risks cards for the mandate view pages (v1344). */
export function MandateAssumptionsRisksView({ mandate, helpSchema = 'public' }) {
  const lists = [
    { title: 'Assumptions', column: 'assumptions', items: mandateListToMultiline(mandate?.assumptions) },
    { title: 'Known risks and issues', column: 'outline_risks', items: mandateListToMultiline(mandate?.outline_risks) },
  ].filter((l) => l.items.trim())
  if (!lists.length) return null
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {lists.map((l) => (
        <div key={l.title} className={card}>
          <FieldLabelWithHelp as="h2" helpKey={`${helpSchema}.project_mandates.${l.column}`} className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">{l.title}</FieldLabelWithHelp>
          <ul className="list-disc pl-5 space-y-1 text-gray-700 dark:text-gray-300">
            {l.items.split('\n').filter(Boolean).map((it, i) => <li key={i}>{it}</li>)}
          </ul>
        </div>
      ))}
    </div>
  )
}

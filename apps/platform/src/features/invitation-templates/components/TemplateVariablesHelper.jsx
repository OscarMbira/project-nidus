import { useState } from 'react'
import { ChevronDown, ChevronRight, Copy, Info } from 'lucide-react'

const VARS = [
  { key: '{{invitee_name}}', desc: 'Invitee full name in the “Dear …,” line (falls back to “colleague”)' },
  { key: '{{invitee_first_name}}', desc: 'Invitee given name' },
  { key: '{{invitee_last_name}}', desc: 'Invitee surname' },
  { key: '{{project_name}}', desc: 'The project the invite applies to' },
  { key: '{{role_name}}', desc: 'Human-readable role label' },
  { key: '{{inviter_name}}', desc: 'Name of the person sending the invite' },
  { key: '{{organisation_name}}', desc: 'Organisation / account display name' },
  { key: '{{sender_name}}', desc: 'Alias for {{inviter_name}} — name of the sender (used in body sign-offs)' },
  { key: '{{sender_organisation}}', desc: 'Alias for {{organisation_name}} — sender\'s organisation (used in body sign-offs)' },
  {
    key: '{{invitation_expiry_days}}',
    desc: 'Numeric days until the invitation expires (matches account default or chosen period)',
  },
  {
    key: '{{invitation_expiry_period}}',
    desc: 'Human-readable period, e.g. “14 calendar days”, for inline wording',
  },
  {
    key: '{{invitation_expiry_note}}',
    desc: 'Full sentence about accepting before expiry (recommended footer)',
  },
  { key: '{{project_code}}', desc: 'Project code (e.g. SEED334-PRJ-03)' },
  { key: '{{project_description}}', desc: 'Project description (omitted in email if empty)' },
  { key: '{{project_type}}', desc: 'Project type label' },
  { key: '{{project_methodology}}', desc: 'Delivery methodology' },
  { key: '{{project_start_date}}', desc: 'Planned start date (formatted)' },
  { key: '{{project_end_date}}', desc: 'Planned end date (formatted)' },
  { key: '{{project_timeline}}', desc: 'Start–end range or “Dates not set”' },
  { key: '{{portfolio_context_line}}', desc: 'Portfolio line or not-assigned message' },
  { key: '{{programme_context_line}}', desc: 'Programme line or not-assigned message' },
  { key: '{{hierarchy_block}}', desc: 'All hierarchy lines (plain text)' },
  {
    key: '{{project_context_block}}',
    desc: 'Optional in template text; every invite email still includes the Project context card automatically',
  },
]

const EMAIL_LAYOUT_NOTE =
  'Every invitation email also includes: Project Nidus header, invite summary, project context (description, type, methodology, timeline, hierarchy), Accept/Decline buttons, accept link, expiry reminder, and Invitation sent by details.'

export default function TemplateVariablesHelper() {
  const [open, setOpen] = useState(false)

  const copy = (text) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(() => {})
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm font-medium text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/80"
      >
        {open ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
        <Info className="h-4 w-4 shrink-0 text-blue-500" aria-hidden />
        Template variables
      </button>
      {open && (
        <div className="px-3 pb-3 border-t border-gray-200 dark:border-gray-700 pt-2 space-y-3">
          <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">{EMAIL_LAYOUT_NOTE}</p>
          <ul className="space-y-2">
          {VARS.map((v) => (
            <li key={v.key} className="flex flex-wrap items-start gap-2 text-xs text-gray-600 dark:text-gray-400">
              <code className="shrink-0 font-mono text-blue-700 dark:text-blue-300 bg-white dark:bg-gray-900 px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-600">
                {v.key}
              </code>
              <span className="flex-1 min-w-0">{v.desc}</span>
              <button
                type="button"
                onClick={() => copy(v.key)}
                className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <Copy className="h-3 w-3" />
                Copy
              </button>
            </li>
          ))}
          </ul>
        </div>
      )}
    </div>
  )
}

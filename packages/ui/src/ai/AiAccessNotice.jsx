/**
 * v1272 — explains why AI can't be used right now, or warns when credits run low
 * (PRD stories 9, 10, 11; D6, D7, D16a). Theme-aware.
 *
 * status: public.ai_org_status() result.
 */
import { Link } from 'react-router-dom'
import { AlertTriangle, Lock, Sparkles } from 'lucide-react'

function fill(text, values) {
  return String(text).replace(/\{(\w+)\}/g, (_, k) => values[k] ?? `{${k}}`)
}

/**
 * @param {object} status  ai_org_status()
 * @param {Record<string, string>} [texts]  translated fixed messages (ai_ui_messages) keyed by message_key
 */
export function accessMessage(status, texts = null) {
  if (!status) return null
  const owner = status.owner_name || 'your Account Owner'
  const renews = status.period_end ? new Date(status.period_end).toLocaleDateString() : ''
  if (texts && texts[status.reason] && !(status.reason === 'not_enabled' && status.can_manage)) {
    return fill(texts[status.reason], { owner, renews, percent: Math.round(Number(status.percent) || 0) })
  }
  switch (status.reason) {
    case 'kill_switch':
      return 'AI features are temporarily unavailable. Please try again later.'
    case 'admin_disabled':
      return 'AI has been switched off for your organisation by the system administrator.'
    case 'not_enabled':
      return status.can_manage
        ? 'AI isn\'t switched on for your organisation yet. Review the AI notice and turn it on in AI Settings.'
        : `AI isn't enabled for your organisation yet. Ask ${owner} to turn it on in AI Settings.`
    case 'read_only':
      return 'Your trial has ended, so Ask Nidus is read-only. Upgrade to keep asking questions.'
    case 'quota_blocked':
      return `Your organisation has used all of this period's AI credits. They renew on ${status.period_end ? new Date(status.period_end).toLocaleDateString() : 'the next billing date'}.${status.can_manage ? '' : ` Contact ${owner} to upgrade or add credits.`}`
    case 'no_account':
      return 'Ask Nidus needs an organisation. Finish setting up your organisation first.'
    default:
      return null
  }
}

export default function AiAccessNotice({ status, settingsPath = null, compact = false, texts = null }) {
  if (!status) return null
  const blockedText = status.allowed ? null : accessMessage(status, texts)

  if (blockedText) {
    const Icon = status.reason === 'not_enabled' ? Sparkles : Lock
    return (
      <div className={`rounded-lg border border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-100 ${compact ? 'p-2 text-xs' : 'p-3 text-sm'}`}>
        <div className="flex items-start gap-2">
          <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <div>
            <p>{blockedText}</p>
            {status.can_manage && settingsPath && ['not_enabled', 'quota_blocked'].includes(status.reason) && (
              <Link to={settingsPath} className="mt-1 inline-block font-medium text-blue-700 hover:underline dark:text-blue-300">
                Open AI Settings
              </Link>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (status.warning_level === 'warn') {
    return (
      <div className="flex items-start gap-2 rounded-lg border border-yellow-200 bg-yellow-50 p-2 text-xs text-yellow-900 dark:border-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-100">
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>
          {texts?.quota_warning
            ? fill(texts.quota_warning, { percent: Math.round(Number(status.percent) || 0) })
            : `Your organisation has used ${Math.round(Number(status.percent) || 0)}% of this period's AI credits.`}
        </span>
      </div>
    )
  }
  return null
}

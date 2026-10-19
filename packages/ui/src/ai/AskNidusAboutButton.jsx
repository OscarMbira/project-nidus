/**
 * v1272 — "Ask Nidus about this" (PRD D19): opens the floating Ask Nidus widget pre-filled for a
 * register. The widget is already aware of the current project, so the question is scoped to the
 * register and project. Hidden in the Planner (no RAID registers there).
 */
import { Bot } from 'lucide-react'
import { useAppConfig } from '@nidus/shared/context/AppConfigContext'

export function askNidusAboutText(registerLabel) {
  return `About the ${String(registerLabel || 'register').toLowerCase()}: `
}

export default function AskNidusAboutButton({ registerLabel, className = '' }) {
  const { app } = useAppConfig()
  if (app === 'planner') return null
  const open = () => {
    window.dispatchEvent(new CustomEvent('ai-widget-prefill', { detail: { question: askNidusAboutText(registerLabel) } }))
  }
  return (
    <button
      type="button"
      onClick={open}
      title={`Ask Nidus about the ${String(registerLabel || 'register').toLowerCase()}`}
      className={`inline-flex items-center gap-1.5 rounded-lg border border-blue-200 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-300 dark:hover:bg-blue-900/30 ${className}`}
    >
      <Bot className="h-4 w-4" aria-hidden="true" />
      Ask Nidus about this
    </button>
  )
}

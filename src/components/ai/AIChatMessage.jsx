import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ThumbsUp, ThumbsDown, Copy, Shield, Globe, ExternalLink, BookOpen } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { saveMessageFeedback } from '../../services/aiAssistantService'
import { supabase } from '../../services/supabaseClient'

const WIDGET_SOURCES_MAX = 2

/** Flatten structured_data.modules into list of { module, row } for display */
function getSourceItems(structuredData) {
  const modules = structuredData?.modules ?? structuredData
  if (!modules || typeof modules !== 'object') return []
  const items = []
  for (const [moduleName, rows] of Object.entries(modules)) {
    if (!Array.isArray(rows)) continue
    for (const row of rows) {
      items.push({ module: moduleName, row })
    }
  }
  return items
}

/** One-line label for a source row (data) or doc title (docs) */
function sourceLabel(moduleName, row) {
  if (moduleName === 'docs') return row.doc_title ?? row.doc_filename ?? 'Document'
  const id = row.risk_reference ?? row.issue_reference ?? row.mandate_reference ?? row.project_code ?? row.benefit_reference ?? row.quality_item_id ?? row.id?.slice(0, 8) ?? ''
  const title = row.risk_title ?? row.issue_title ?? row.project_name ?? row.portfolio_name ?? row.benefit_title ?? row.quality_title ?? row.stakeholder_name ?? row.task_name ?? String(id)
  const extra = row.status_enum ?? row.priority ?? row.approval_status ?? row.risk_score ?? ''
  return extra ? `${title} · ${extra}` : title
}

export default function AIChatMessage({ message, surface = 'widget', conversationId = null }) {
  const { id, role, content, processed_by, created_at, structured_data } = message
  const navigate = useNavigate()
  const [feedback, setFeedback]   = useState(null)
  const [copied,   setCopied]     = useState(false)
  const isUser = role === 'user'

  const handleFeedback = async (rating) => {
    setFeedback(rating)
    const { data: { user } } = await supabase.auth.getUser()
    if (user && id) await saveMessageFeedback(id, user.id, rating)
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const timeStr = created_at
    ? new Date(created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : ''

  if (isUser) {
    return (
      <div className="flex justify-end mb-3">
        <div className="max-w-[80%]">
          <div className="bg-blue-600 text-white rounded-2xl rounded-tr-sm px-4 py-2 text-sm">
            {content}
          </div>
          {timeStr && (
            <p className="text-xs text-gray-400 dark:text-gray-500 text-right mt-1">{timeStr}</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex justify-start mb-3">
      <div className="max-w-[85%] w-full">
        {/* AI bubble */}
        <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-gray-800 dark:text-gray-100">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              p:    ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
              ul:   ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
              ol:   ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
              li:   ({ children }) => <li className="text-sm">{children}</li>,
              code: ({ children }) => <code className="bg-gray-200 dark:bg-gray-600 px-1 rounded text-xs font-mono">{children}</code>,
              strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
            }}
          >
            {content}
          </ReactMarkdown>
        </div>

        {/* Sources block (data or docs): widget = max 2 cards + "N more" link; workspace = all */}
        {(processed_by === 'data' || processed_by === 'local' || processed_by === 'docs') && structured_data && (() => {
          const items = getSourceItems(structured_data)
          if (items.length === 0) return null
          // Sum _total overrides stored when DB total > 100-row fetch limit
          const mods = structured_data?.modules ?? structured_data
          const extraTotal = Object.entries(mods || {})
            .filter(([k]) => k.endsWith('_total'))
            .reduce((sum, [, v]) => sum + (typeof v === 'number' ? v : 0), 0)
          const displayTotal = extraTotal > 0 ? items.length + extraTotal : items.length
          const showCount = surface === 'widget' ? Math.min(WIDGET_SOURCES_MAX, items.length) : items.length
          const moreCount = displayTotal - showCount
          const isDocs = processed_by === 'docs'
          return (
            <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">{isDocs ? 'Documentation' : 'Sources'} ({displayTotal})</p>
              <ul className="space-y-1">
                {items.slice(0, showCount).map(({ module: mod, row }, i) => (
                  <li key={i} className="text-xs bg-gray-50 dark:bg-gray-800 rounded px-2 py-1.5">
                    {mod === 'docs' && row.doc_route ? (
                      <button type="button" onClick={() => navigate(row.doc_route)} className="text-blue-600 dark:text-blue-400 hover:underline truncate block w-full text-left">
                        {sourceLabel(mod, row)} <ExternalLink className="w-3 h-3 inline ml-0.5" />
                      </button>
                    ) : (
                      <span className="truncate block">{sourceLabel(mod, row)}</span>
                    )}
                  </li>
                ))}
              </ul>
              {surface === 'widget' && moreCount > 0 && (
                <button
                  type="button"
                  onClick={() => navigate(conversationId ? `/platform/ai?conversation=${encodeURIComponent(conversationId)}` : '/platform/ai')}
                  className="mt-1.5 flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                >
                  +{moreCount} more — Open in workspace <ExternalLink className="w-3 h-3" />
                </button>
              )}
            </div>
          )
        })()}

        {/* Footer: engine badge + time + actions */}
        <div className="flex items-center justify-between mt-1 px-1">
          <div className="flex items-center gap-2">
            {/* Engine badge */}
            {(processed_by === 'data' || processed_by === 'local') && (
              <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                <Shield className="w-3 h-3" /> Answered from your data
              </span>
            )}
            {processed_by === 'docs' && (
              <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                <BookOpen className="w-3 h-3" /> Answered from system docs
              </span>
            )}
            {processed_by === 'external' && (
              <span className="flex items-center gap-1 text-xs text-blue-500 dark:text-blue-400">
                <Globe className="w-3 h-3" /> General knowledge
              </span>
            )}
            {timeStr && (
              <span className="text-xs text-gray-400 dark:text-gray-500">{timeStr}</span>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleCopy}
              className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              title="Copy response"
            >
              <Copy className="w-3 h-3" />
            </button>
            {copied && <span className="text-xs text-green-500">Copied!</span>}
            <button
              onClick={() => handleFeedback(1)}
              className={`p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors ${feedback === 1 ? 'text-green-500' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'}`}
              title="Good response"
            >
              <ThumbsUp className="w-3 h-3" />
            </button>
            <button
              onClick={() => handleFeedback(-1)}
              className={`p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors ${feedback === -1 ? 'text-red-400' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'}`}
              title="Poor response"
            >
              <ThumbsDown className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

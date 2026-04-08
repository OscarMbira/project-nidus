/**
 * BrandingHistory
 * Audit trail of branding changes with revert capability.
 */
import { useState, useEffect } from 'react'
import { History, RotateCcw, ChevronDown, ChevronRight, Loader2 } from 'lucide-react'
import { useBranding } from '../../../context/BrandingContext'
import { getBrandingHistory, revertBranding } from '../../../services/brandingService'

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function DiffRow({ label, prev, next }) {
  if (prev === next) return null
  return (
    <div className="flex items-start gap-4 py-1 text-xs">
      <span className="w-40 text-gray-500 dark:text-gray-400 flex-shrink-0 font-medium">{label}</span>
      <span className="line-through text-red-500 dark:text-red-400 truncate max-w-[120px]">{String(prev ?? '—')}</span>
      <span className="text-green-600 dark:text-green-400 truncate max-w-[120px]">{String(next ?? '—')}</span>
    </div>
  )
}

const DISPLAY_KEYS = [
  ['app_display_name',    'App Name'],
  ['app_tagline',         'Tagline'],
  ['primary_color',       'Primary Colour'],
  ['secondary_color',     'Secondary Colour'],
  ['accent_color',        'Accent Colour'],
  ['header_bg_color',     'Header BG'],
  ['sidebar_bg_color',    'Sidebar BG'],
  ['sidebar_active_color','Sidebar Active'],
  ['sidebar_text_color',  'Sidebar Text'],
  ['button_color',        'Button Colour'],
  ['link_color',          'Link Colour'],
  ['font_family',         'Font Family'],
  ['primary_logo_url',    'Header Logo'],
  ['sidebar_logo_url',    'Sidebar Logo'],
  ['favicon_url',         'Favicon'],
]

function HistoryRow({ record, onRevert }) {
  const [expanded, setExpanded] = useState(false)
  const [reverting, setReverting] = useState(false)

  const handleRevert = async () => {
    if (!window.confirm('Revert branding to this earlier configuration?')) return
    setReverting(true)
    try {
      await onRevert(record)
    } finally {
      setReverting(false)
    }
  }

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
      {/* Header row */}
      <div
        className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20">
            <History className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {record.change_description || 'Branding updated'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {formatDate(record.changed_at)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); handleRevert() }}
            disabled={reverting}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors disabled:opacity-50"
          >
            {reverting
              ? <><Loader2 className="h-3 w-3 animate-spin" />Reverting…</>
              : <><RotateCcw className="h-3 w-3" />Revert to this</>
            }
          </button>
          {expanded ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
        </div>
      </div>

      {/* Expanded diff */}
      {expanded && (
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
          <div className="flex gap-8 text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">
            <span className="w-40">Field</span>
            <span>Before</span>
            <span>After</span>
          </div>
          {DISPLAY_KEYS.map(([key, label]) => (
            <DiffRow
              key={key}
              label={label}
              prev={record.previous_values?.[key]}
              next={record.new_values?.[key]}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function BrandingHistory() {
  const { accountId, refreshBranding } = useBranding()
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!accountId) return
    getBrandingHistory(accountId, 30).then((data) => {
      setHistory(data)
      setLoading(false)
    })
  }, [accountId])

  const handleRevert = async (record) => {
    await revertBranding(accountId, record)
    refreshBranding()
    // Reload history
    const data = await getBrandingHistory(accountId, 30)
    setHistory(data)
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <History className="h-6 w-6 text-blue-500" />
          Branding History
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Review previous branding configurations. Click "Revert to this" to restore an earlier state.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      ) : history.length === 0 ? (
        <div className="text-center py-16 text-gray-500 dark:text-gray-400">
          <History className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p>No branding history yet. Changes will appear here after the first save.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {history.map((record) => (
            <HistoryRow
              key={record.id}
              record={record}
              onRevert={handleRevert}
            />
          ))}
        </div>
      )}
    </div>
  )
}

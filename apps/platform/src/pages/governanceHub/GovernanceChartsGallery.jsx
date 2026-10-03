/**
 * Governance chart gallery — browse / drag / paste upload, preview, caption, hard delete.
 * Used on Governance Structure Overview (v1098).
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { ClipboardPaste, ExternalLink, FileText, Upload } from 'lucide-react'
import ZoomableImage from '@nidus/ui/ZoomableImage'
import { RowActionButton } from '@nidus/ui'
import { platformDb } from '@nidus/supabase'
import { normalizeImageFile, fileFromClipboardData } from '@nidus/shared/utils/imageFileUtils'
import { withTimeout } from '@nidus/shared/utils/asyncUtils'
import {
  listGovernanceCharts,
  uploadGovernanceChart,
  updateGovernanceChartCaption,
  removeGovernanceChart,
  getGovernanceChartSignedUrl,
  peekGovernanceChartDisplayUrl,
  validateGovernanceChartFile,
  isGovernanceChartImage,
  isGovernanceChartPdf,
  MAX_GOVERNANCE_CHARTS,
  MAX_GOVERNANCE_CHART_FILE_SIZE_BYTES,
} from '@nidus/shared/services/governanceChartService'

const UPLOAD_TIMEOUT_MS = 20000
const ACCEPT = 'image/png,image/jpeg,image/gif,image/webp,image/svg+xml,application/pdf,.pdf'

function ChartThumb({ chart, url, busy, disabled, onCaptionSave, onRemove, onOpenPdf }) {
  const [caption, setCaption] = useState(chart.caption || '')
  useEffect(() => {
    setCaption(chart.caption || '')
  }, [chart.id, chart.caption])

  const isPdf = isGovernanceChartPdf(chart.mime_type)
  const isImage = isGovernanceChartImage(chart.mime_type)

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1 flex justify-center items-center min-h-[7rem] rounded border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/40 p-2 overflow-hidden">
          {isImage && url ? (
            <ZoomableImage
              src={url}
              alt={chart.caption || chart.file_name || 'Governance chart'}
              imgClassName="max-h-28 max-w-full object-contain"
              hoverPreviewClassName="max-h-96 max-w-lg object-contain"
            />
          ) : isPdf ? (
            <button
              type="button"
              onClick={() => onOpenPdf(chart, url)}
              disabled={!url || busy}
              className="flex flex-col items-center gap-1 text-sm text-gray-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400 disabled:opacity-50"
            >
              <FileText className="h-10 w-10" />
              <span className="inline-flex items-center gap-1 text-xs">
                Open PDF <ExternalLink className="h-3 w-3" />
              </span>
            </button>
          ) : (
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-full">{chart.file_name}</p>
          )}
        </div>
        <RowActionButton
          variant="delete"
          label={`Remove ${chart.file_name || 'chart'}`}
          onClick={() => onRemove(chart)}
          disabled={disabled || busy}
        />
      </div>
      <p className="text-[11px] text-gray-600 dark:text-gray-300 truncate" title={chart.file_name}>
        {chart.file_name}
      </p>
      <input
        type="text"
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        onBlur={() => {
          if ((caption || '') !== (chart.caption || '')) onCaptionSave(chart, caption)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.currentTarget.blur()
          }
        }}
        placeholder="Caption (optional)…"
        disabled={disabled || busy}
        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1.5 text-sm text-gray-900 dark:text-gray-100"
        aria-label={`Caption for ${chart.file_name || 'chart'}`}
      />
    </div>
  )
}

export default function GovernanceChartsGallery({ projectId, disabled = false }) {
  const [charts, setCharts] = useState([])
  const [urls, setUrls] = useState({})
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [showPasteHint, setShowPasteHint] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const pasteBoxRef = useRef(null)
  const fileInputRef = useRef(null)

  const refresh = useCallback(async () => {
    if (!projectId) {
      setCharts([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const result = await listGovernanceCharts(platformDb, projectId)
      if (!result.success) {
        toast.error(result.message || 'Failed to load governance charts')
        setCharts([])
        return
      }
      setCharts(result.data || [])
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    let cancelled = false
    const loadUrls = async () => {
      const next = {}
      await Promise.all(
        (charts || []).map(async (c) => {
          if (!c.storage_path) return
          const cached = peekGovernanceChartDisplayUrl(c.storage_path)
          if (cached) {
            next[c.id] = cached
            return
          }
          const result = await getGovernanceChartSignedUrl(platformDb, c.storage_path)
          if (result.success) next[c.id] = result.data
        }),
      )
      if (!cancelled) setUrls((prev) => ({ ...prev, ...next }))
    }
    if (charts.length) loadUrls()
    return () => {
      cancelled = true
    }
  }, [charts])

  const applyFile = async (file) => {
    if (!projectId) {
      toast.error('Open a project before uploading a governance chart.')
      return
    }
    if (charts.length >= MAX_GOVERNANCE_CHARTS) {
      toast.error(`You can add up to ${MAX_GOVERNANCE_CHARTS} governance charts.`)
      return
    }

    let toUpload = file
    if (String(file?.type || '').startsWith('image/') || !file?.type) {
      toUpload = normalizeImageFile(file, 'governance-chart.png') || file
    }

    const validationError = validateGovernanceChartFile(toUpload)
    if (validationError) {
      toast.error(validationError)
      return
    }

    setBusy(true)
    try {
      const result = await withTimeout(
        uploadGovernanceChart(platformDb, toUpload, projectId),
        UPLOAD_TIMEOUT_MS,
        'Upload timed out. Check your connection and try again.',
      )
      if (!result.success) {
        toast.error(result.message || 'Failed to upload chart')
        return
      }
      setShowPasteHint(false)
      toast.success('Governance chart uploaded')
      await refresh()
    } catch (error) {
      toast.error(error?.message || 'Failed to upload chart')
    } finally {
      setBusy(false)
    }
  }

  const handleRemove = async (chart) => {
    if (!window.confirm(`Remove “${chart.file_name || 'this chart'}”? This deletes the file permanently.`)) {
      return
    }
    setBusy(true)
    try {
      const result = await withTimeout(
        removeGovernanceChart(platformDb, chart),
        UPLOAD_TIMEOUT_MS,
        'Remove timed out. Check your connection and try again.',
      )
      if (!result.success) {
        toast.error(result.message || 'Failed to remove chart')
        return
      }
      setUrls((prev) => {
        const next = { ...prev }
        delete next[chart.id]
        return next
      })
      toast.success('Governance chart removed')
      await refresh()
    } catch (error) {
      toast.error(error?.message || 'Failed to remove chart')
    } finally {
      setBusy(false)
    }
  }

  const handleCaptionSave = async (chart, caption) => {
    const result = await updateGovernanceChartCaption(platformDb, chart.id, caption)
    if (!result.success) {
      toast.error(result.message || 'Failed to save caption')
      return
    }
    setCharts((prev) => prev.map((c) => (c.id === chart.id ? { ...c, caption: result.data.caption } : c)))
  }

  const handleOpenPdf = async (chart, url) => {
    let href = url
    if (!href && chart.storage_path) {
      const result = await getGovernanceChartSignedUrl(platformDb, chart.storage_path)
      if (result.success) href = result.data
    }
    if (!href) {
      toast.error('Could not open PDF')
      return
    }
    window.open(href, '_blank', 'noopener,noreferrer')
  }

  useEffect(() => {
    if (!showPasteHint) return undefined
    const applyPaste = async (event) => {
      event.preventDefault()
      event.stopPropagation()
      const file = await fileFromClipboardData(event.clipboardData, 'governance-chart')
      if (!file) {
        toast.error('Clipboard does not contain an image. Copy a chart image, then paste again (PDF: use Browse).')
        return
      }
      applyFile(file)
    }
    document.addEventListener('paste', applyPaste, true)
    const focusTimer = window.setTimeout(() => pasteBoxRef.current?.focus(), 0)
    return () => {
      window.clearTimeout(focusTimer)
      document.removeEventListener('paste', applyPaste, true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showPasteHint, projectId, charts.length])

  const atCap = charts.length >= MAX_GOVERNANCE_CHARTS
  const maxMb = (MAX_GOVERNANCE_CHART_FILE_SIZE_BYTES / (1024 * 1024)).toFixed(0)

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Governance charts</label>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Upload or paste org/governance diagrams (images or PDF). Up to {MAX_GOVERNANCE_CHARTS} files, {maxMb}MB each.
          Delete removes the file from storage.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-gray-600 dark:text-gray-300">Loading charts…</p>
      ) : (
        <>
          {charts.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {charts.map((chart) => (
                <ChartThumb
                  key={chart.id}
                  chart={chart}
                  url={urls[chart.id]}
                  busy={busy}
                  disabled={disabled}
                  onCaptionSave={handleCaptionSave}
                  onRemove={handleRemove}
                  onOpenPdf={handleOpenPdf}
                />
              ))}
            </div>
          )}

          {!disabled && (
            <div
              onDragOver={(e) => {
                e.preventDefault()
                if (!atCap) setDragOver(true)
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault()
                setDragOver(false)
                if (atCap || busy) return
                const file = e.dataTransfer.files?.[0]
                if (file) applyFile(file)
              }}
              className={`rounded-xl border border-dashed px-3 py-4 ${
                dragOver
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
                  : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/30'
              }`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <label
                  className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm font-medium text-gray-800 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 ${
                    busy || atCap ? 'pointer-events-none opacity-50' : ''
                  }`}
                >
                  <Upload className="h-4 w-4" />
                  {busy ? 'Uploading…' : 'Browse'}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={ACCEPT}
                    className="hidden"
                    disabled={busy || atCap}
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      e.target.value = ''
                      if (file) applyFile(file)
                    }}
                  />
                </label>
                <button
                  type="button"
                  disabled={busy || atCap}
                  onClick={() => setShowPasteHint(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm font-medium text-gray-800 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
                >
                  <ClipboardPaste className="h-4 w-4" />
                  Paste
                </button>
                {atCap && (
                  <span className="text-xs text-amber-700 dark:text-amber-300">
                    Limit of {MAX_GOVERNANCE_CHARTS} reached — remove one to add another.
                  </span>
                )}
              </div>
              {showPasteHint && !atCap && (
                <div
                  ref={pasteBoxRef}
                  tabIndex={0}
                  role="textbox"
                  aria-label="Paste governance chart image"
                  className="mt-3 rounded-md border border-dashed border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-xs text-gray-800 dark:text-gray-100 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  Copy a chart image, click this box, then press Ctrl+V (or Cmd+V). For PDF, use Browse or drag-and-drop.
                </div>
              )}
              <p className="mt-2 text-[11px] text-gray-500 dark:text-gray-400">
                PNG, JPEG, GIF, SVG, WEBP, or PDF — drag a file here or use Browse / Paste.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}

/**
 * v1265 — View / Export ▾ for the Plan Sheet's Gantt chart: task names + bars only (owner request
 * 2026-10-13; same look as the shared record View / Export buttons).
 *   View    a preview of exactly what will be exported
 *   Export  PDF · PNG image · PowerPoint · SVG · Print, with "Only expanded rows"
 * props: getRows(onlyExpanded) → export rows, options ({ zoom, title, subtitle, today, showOutline }), name
 */
import { useEffect, useRef, useState } from 'react'
import { Eye, Download, ChevronDown, FileDown, Image as ImageIcon, Presentation, Printer, Code, X, Maximize2, Minimize2, ExternalLink } from 'lucide-react'
import { buildGanttSvg, exportGanttPdf, exportGanttPng, exportGanttPptx, exportGanttSvg, openGanttWindow, printGantt } from '../services/ganttExport.js'

const btn = 'inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700'
const item = 'w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50'

export default function GanttExportMenu({ getRows, options, name }) {
  const [open, setOpen] = useState(false)
  const [preview, setPreview] = useState(null)
  const [previewFull, setPreviewFull] = useState(false)
  const [onlyExpanded, setOnlyExpanded] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const ref = useRef(null)

  useEffect(() => {
    if (!open && !preview) return undefined
    const onKey = (e) => { if (e.key === 'Escape') { setOpen(false); setPreview(null) } }
    const onDown = (e) => { if (open && ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onDown)
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onDown) }
  }, [open, preview])

  const chart = () => buildGanttSvg(getRows(onlyExpanded), options)

  const run = async (fn) => {
    setOpen(false)
    setBusy(true)
    setError(null)
    try {
      await fn()
    } catch (err) {
      setError(err?.message || 'The export did not work. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="inline-flex items-center gap-2" ref={ref}>
      <button type="button" className={btn} onClick={() => setPreview(buildGanttSvg(getRows(onlyExpanded), { ...options, heading: false }))} title="Preview the Gantt chart export">
        <Eye className="h-4 w-4" aria-hidden="true" /> View
      </button>
      <div className="relative">
        <button type="button" className={btn} aria-haspopup="true" aria-expanded={open} onClick={() => setOpen(!open)} disabled={busy}>
          <Download className="h-4 w-4" aria-hidden="true" /> {busy ? 'Exporting…' : 'Export'} <ChevronDown className="h-4 w-4" aria-hidden="true" />
        </button>
        {open && (
          <div role="menu" aria-label="Export Gantt chart" className="absolute right-0 z-40 mt-1 w-60 rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800">
            <p className="px-3 pt-1 pb-2 text-xs text-gray-500 dark:text-gray-400">Task names and Gantt bars</p>
            <button type="button" role="menuitem" className={item} onClick={() => run(() => exportGanttPdf(chart(), name))}><FileDown className="h-4 w-4" /> PDF</button>
            <button type="button" role="menuitem" className={item} onClick={() => run(() => exportGanttPng(chart(), name))}><ImageIcon className="h-4 w-4" /> PNG image</button>
            <button type="button" role="menuitem" className={item} onClick={() => run(() => exportGanttPptx(getRows(onlyExpanded), options, name))}><Presentation className="h-4 w-4" /> PowerPoint</button>
            <button type="button" role="menuitem" className={item} onClick={() => run(() => exportGanttSvg(chart(), name))}><Code className="h-4 w-4" /> SVG (editable drawing)</button>
            <button type="button" role="menuitem" className={item} onClick={() => run(() => printGantt(chart(), options.title))}><Printer className="h-4 w-4" /> Print</button>
            <label className="mt-1 flex items-center gap-2 border-t border-gray-200 px-3 pt-2 pb-1 text-xs text-gray-700 dark:border-gray-700 dark:text-gray-300">
              <input type="checkbox" checked={onlyExpanded} onChange={(e) => setOnlyExpanded(e.target.checked)} />
              Only expanded rows (as shown)
            </label>
          </div>
        )}
      </div>
      {error && <span role="alert" className="text-xs text-red-600 dark:text-red-400">{error}</span>}

      {preview && (
        <div className={`fixed inset-0 z-[75] flex items-start justify-center overflow-auto bg-black/50 ${previewFull ? 'p-0' : 'p-4'}`} role="dialog" aria-modal="true" aria-label="Gantt chart preview"
          onMouseDown={(e) => { if (e.target === e.currentTarget) setPreview(null) }}>
          <div className={`w-full border border-gray-200 bg-white p-4 shadow-2xl dark:border-gray-700 dark:bg-gray-900 ${previewFull ? 'h-full max-w-none rounded-none flex flex-col' : 'max-w-[95vw] rounded-xl'}`}>
            <div className="mb-3 flex items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{options.title || 'Gantt chart'}</h2>
                {options.subtitle && <p className="text-xs text-gray-500 dark:text-gray-400">{options.subtitle}</p>}
                {error && <p role="alert" className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
              </div>
              <span className="flex items-center gap-1">
                <button type="button" onClick={() => setPreviewFull((v) => !v)} aria-pressed={previewFull}
                  aria-label={previewFull ? 'Exit full screen' : 'Full screen'} title={previewFull ? 'Exit full screen' : 'Full screen'}
                  className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800">
                  {previewFull ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
                </button>
                <button type="button" onClick={() => run(async () => openGanttWindow(preview, options.title || 'Gantt chart', options.subtitle))}
                  aria-label="Open in a new window" title="Open in a new window"
                  className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800">
                  <ExternalLink className="h-5 w-5" />
                </button>
              </span>
              <button type="button" onClick={() => setPreview(null)} aria-label="Close preview" className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"><X className="h-5 w-5" /></button>
            </div>
            {/* Built by buildGanttSvg from plan data; every text value is escaped there. */}
            {/* Task names stay frozen on the left while the timeline scrolls (owner request 2026-10-13). */}
            <div className={`${previewFull ? 'min-h-0 flex-1' : 'max-h-[75vh]'} overflow-auto rounded border border-gray-200 bg-white dark:border-gray-700`} data-testid="gantt-preview">
              <div className="flex w-max">
                <div className="sticky left-0 z-10 shrink-0 bg-white shadow-[2px_0_4px_rgba(0,0,0,0.08)]" data-testid="gantt-preview-names" dangerouslySetInnerHTML={{ __html: preview.names }} />
                <div className="shrink-0" data-testid="gantt-preview-timeline" dangerouslySetInnerHTML={{ __html: preview.timeline }} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

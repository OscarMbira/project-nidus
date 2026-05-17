import { useState } from 'react'
import { Download, ChevronDown, FileText, Presentation, Table2, FileSpreadsheet } from 'lucide-react'
import toast from 'react-hot-toast'
import {
  exportIndustryPlanToWord,
  exportIndustryPlanWordByPhase,
  exportIndustryPlanToExcel,
  exportIndustryPlanActivitiesExcel,
  exportIndustryPlanActivitiesCsv,
  exportIndustryPlanToPpt,
} from '../../utils/industryPlanExport'

const btn =
  'inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50'

export default function IndustryPlanExportMenu({ data, disabled = false, label = 'Export' }) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  const run = async (fn) => {
    if (!data || disabled) return
    setBusy(true)
    try {
      await fn()
      setOpen(false)
    } catch (e) {
      toast.error(e?.message || 'Export failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="relative inline-block">
      <button type="button" className={btn} disabled={disabled || busy} onClick={() => setOpen((o) => !o)}>
        <Download className="h-4 w-4" />
        {label}
        <ChevronDown className="h-3 w-3" />
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-1 min-w-[220px] rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-600 dark:bg-slate-800">
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-700"
            onClick={() => run(() => exportIndustryPlanToWord(data))}
          >
            <FileText className="h-4 w-4" /> Word (full plan)
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-700"
            onClick={() => run(() => exportIndustryPlanWordByPhase(data))}
          >
            <FileText className="h-4 w-4" /> Word (by phase)
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-700"
            onClick={() => run(async () => exportIndustryPlanToExcel(data))}
          >
            <Table2 className="h-4 w-4" /> Excel (summary)
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-700"
            onClick={() => run(async () => exportIndustryPlanActivitiesExcel(data))}
          >
            <FileSpreadsheet className="h-4 w-4" /> Excel (activities)
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-700"
            onClick={() => run(async () => exportIndustryPlanActivitiesCsv(data))}
          >
            <FileSpreadsheet className="h-4 w-4" /> CSV (activities)
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-700"
            onClick={() => run(async () => exportIndustryPlanToPpt(data))}
          >
            <Presentation className="h-4 w-4" /> PowerPoint (activities)
          </button>
        </div>
      )}
    </div>
  )
}

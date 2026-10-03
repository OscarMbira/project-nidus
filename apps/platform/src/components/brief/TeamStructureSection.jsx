/**
 * Team Structure Section
 * Team organization — multi-line description list (rule 67) + diagram upload/paste.
 */

import { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { ClipboardPaste, Trash2, Upload } from 'lucide-react'
import MultiLineListInput from '@nidus/ui/MultiLineListInput'
import ZoomableImage from '@nidus/ui/ZoomableImage'
import { platformDb } from '@nidus/supabase'
import { normalizeImageFile, fileFromClipboardData } from '@nidus/shared/utils/imageFileUtils'
import { withTimeout } from '@nidus/shared/utils/asyncUtils'
import {
  saveBriefTeamStructureDiagram,
  removeBriefTeamStructureDiagram,
  getBriefDiagramSignedUrl,
  peekBriefDiagramDisplayUrl,
  validateBriefDiagramFile,
  isBriefDiagramStoragePath,
} from '@nidus/shared/services/briefTeamStructureDiagramService'
import TeamStructureChart from './TeamStructureChart'

const UPLOAD_TIMEOUT_MS = 20000

export default function TeamStructureSection({ formData, onChange, errors = {}, readOnly = false }) {
  const [showPasteHint, setShowPasteHint] = useState(false)
  const [busy, setBusy] = useState(false)
  const [displayUrl, setDisplayUrl] = useState(null)
  const pasteBoxRef = useRef(null)

  const diagramValue = formData.team_structure_diagram_url || ''
  const projectId = formData.project_id
  const briefId = formData.id || null

  const setField = (name, value) => {
    onChange({ target: { name, value } })
  }

  useEffect(() => {
    let cancelled = false
    if (!diagramValue) {
      setDisplayUrl(null)
      return undefined
    }
    if (!isBriefDiagramStoragePath(diagramValue)) {
      setDisplayUrl(diagramValue)
      return undefined
    }
    const cached = peekBriefDiagramDisplayUrl(diagramValue)
    if (cached) setDisplayUrl(cached)
    getBriefDiagramSignedUrl(platformDb, diagramValue).then((result) => {
      if (!cancelled && result.success) setDisplayUrl(result.data)
    })
    return () => { cancelled = true }
  }, [diagramValue])

  const applyFile = async (file) => {
    if (!projectId) {
      toast.error('Save or open this brief in a project before uploading a diagram.')
      return
    }
    const normalized = normalizeImageFile(file, 'team-structure-diagram.png')
    const validationError = validateBriefDiagramFile(normalized)
    if (validationError) {
      toast.error(validationError)
      return
    }
    setBusy(true)
    try {
      const result = await withTimeout(
        saveBriefTeamStructureDiagram(platformDb, normalized, projectId, briefId),
        UPLOAD_TIMEOUT_MS,
        'Saving the diagram timed out. Check your connection and try again.',
      )
      if (!result.success) {
        toast.error(result.message || 'Failed to save diagram')
        return
      }
      setField('team_structure_diagram_url', result.data)
      setShowPasteHint(false)
      toast.success('Team structure diagram updated')
    } catch (error) {
      toast.error(error?.message || 'Failed to save diagram')
    } finally {
      setBusy(false)
    }
  }

  const handleRemove = async () => {
    setBusy(true)
    try {
      const result = await withTimeout(
        removeBriefTeamStructureDiagram(platformDb, diagramValue, briefId),
        UPLOAD_TIMEOUT_MS,
        'Removing the diagram timed out. Check your connection and try again.',
      )
      if (!result.success) {
        toast.error(result.message || 'Failed to remove diagram')
        return
      }
      setField('team_structure_diagram_url', '')
      setDisplayUrl(null)
      toast.success('Team structure diagram removed')
    } catch (error) {
      toast.error(error?.message || 'Failed to remove diagram')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    if (!showPasteHint) return undefined
    const applyPaste = async (event) => {
      event.preventDefault()
      event.stopPropagation()
      const file = await fileFromClipboardData(event.clipboardData, 'team-structure-diagram')
      if (!file) {
        toast.error('Clipboard does not contain an image. Copy a diagram image, then paste again.')
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
  }, [showPasteHint])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
          Team structure
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Overview of team organisation and structure. Add one point per line.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Team structure description <span className="text-red-500">*</span>
        </label>
        <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
          Organisation, reporting lines, and structure. One point per line.
        </p>
        <MultiLineListInput
          viewModeId="brief-team-structure-description"
          id="brief_team_structure_description"
          value={formData.team_structure_description || ''}
          onChange={(v) => setField('team_structure_description', v)}
          placeholder="e.g. Project Manager reports to Project Board via Executive"
          ariaLabelPrefix="structure point"
          itemColumnLabel="Structure point"
          disabled={readOnly}
        />
        {errors.team_structure_description && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.team_structure_description}</p>
        )}
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
        <h3 className="mb-1 text-sm font-semibold text-gray-900 dark:text-gray-100">
          Team structure diagram
        </h3>
        <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
          Org chart or team diagram for this brief. Upload a file or paste an image from the clipboard.
        </p>
        {displayUrl ? (
          <div className="mb-3 flex justify-center overflow-visible rounded border border-gray-200 bg-white p-3 dark:border-gray-600 dark:bg-gray-800">
            <ZoomableImage
              src={displayUrl}
              alt="Team structure diagram"
              imgClassName="max-h-48 max-w-full object-contain"
              hoverPreviewClassName="max-h-96 max-w-lg object-contain"
              priority
            />
          </div>
        ) : (
          <p className="mb-3 text-xs text-gray-400 dark:text-gray-500">No diagram saved yet.</p>
        )}
        {!readOnly && (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <label
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-800 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-100 dark:hover:bg-gray-800 ${busy ? 'pointer-events-none opacity-50' : ''}`}
              >
                <Upload className="h-3.5 w-3.5" />
                {busy ? 'Saving…' : diagramValue ? 'Replace' : 'Upload'}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={busy}
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    e.target.value = ''
                    if (file) applyFile(file)
                  }}
                />
              </label>
              <button
                type="button"
                disabled={busy}
                onClick={() => setShowPasteHint(true)}
                className="inline-flex items-center gap-1.5 rounded border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-800 hover:bg-gray-100 disabled:opacity-50 dark:border-gray-600 dark:text-gray-100 dark:hover:bg-gray-800"
              >
                <ClipboardPaste className="h-3.5 w-3.5" />
                Paste
              </button>
              {diagramValue && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleRemove}
                  className="inline-flex items-center gap-1.5 rounded border border-gray-300 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-gray-600 dark:text-red-400 dark:hover:bg-red-950/30"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remove
                </button>
              )}
            </div>
            {showPasteHint && (
              <div
                ref={pasteBoxRef}
                tabIndex={0}
                role="textbox"
                aria-label="Paste team structure diagram image"
                className="mt-3 rounded-md border border-dashed border-gray-300 bg-gray-50 px-3 py-2 text-xs text-gray-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
              >
                Copy a diagram image, click this box, then press Ctrl+V (or Cmd+V).
              </div>
            )}
            <p className="mt-2 text-[11px] text-gray-400 dark:text-gray-500">
              PNG, JPEG, GIF, SVG, or WEBP — up to 2MB.
            </p>
          </>
        )}
      </div>

      {formData.id && (
        <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <TeamStructureChart briefId={formData.id} readOnly={readOnly} />
        </div>
      )}
    </div>
  )
}

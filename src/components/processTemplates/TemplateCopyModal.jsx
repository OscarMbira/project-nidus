import { useState } from 'react'
import { X, Copy } from 'lucide-react'
import toast from 'react-hot-toast'
import { platformDb } from '../../services/supabase/supabaseClient'
import { getTemplateService } from '../../services/processTemplatesService'
import PlanningProjectBar, { usePlanningProjectId } from '../planning/PlanningProjectBar'

/**
 * Copy a master template record into the user's workspace.
 */
export default function TemplateCopyModal({ open, onClose, slug, master, projectId: projectIdProp, sim = false, onCopied }) {
  const [busy, setBusy] = useState(false)
  const urlProjectId = usePlanningProjectId()
  const projectId = projectIdProp || urlProjectId

  if (!open || !master) return null

  const handleCopy = async () => {
    if (!projectId) {
      toast.error('Select a project first')
      return
    }
    setBusy(true)
    try {
      const { data: { user } } = await platformDb.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      const svc = getTemplateService(slug, { sim })
      const copy = await svc.copyMaster(master.id, {
        projectId,
        copiedBy: user.id,
        accountId: master.account_id,
      })
      toast.success(`Copy created: ${copy.title || copy.id}`)
      onCopied?.(copy)
      onClose()
    } catch (e) {
      toast.error(e?.message || 'Copy failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div
        role="dialog"
        aria-labelledby="copy-modal-title"
        className="w-full max-w-md rounded-xl border border-gray-700 bg-gray-900 p-5 shadow-xl"
      >
        <div className="flex items-start justify-between gap-2 mb-4">
          <h2 id="copy-modal-title" className="text-lg font-semibold text-gray-100 flex items-center gap-2">
            <Copy className="h-5 w-5 text-blue-400" />
            Copy template to workspace
          </h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-200" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="text-sm text-gray-300 mb-1">
          Master: <strong>{master.title || master.reference_code || master.id}</strong>
        </p>
        <p className="text-xs text-gray-500 mb-4">
          A draft copy will be created for your project. You can edit your copy without changing the master.
        </p>
        {!projectIdProp && (
          <div className="mb-4 [&>div]:mb-0">
            <PlanningProjectBar isSim={sim} />
          </div>
        )}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-gray-300 hover:bg-gray-800"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy || !projectId}
            onClick={handleCopy}
            className="px-4 py-2 rounded-lg text-sm bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50"
          >
            {busy ? 'Copying…' : 'Create copy'}
          </button>
        </div>
      </div>
    </div>
  )
}

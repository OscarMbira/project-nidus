import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { platformDb } from '../../../services/supabase/supabaseClient'
import { createGapRecord } from '../services/gapDataService'

/**
 * Mobile FAB for quick capture (GAP-24) — visible on small viewports.
 */
export default function QuickCaptureFab() {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)

  const handleSave = async () => {
    if (!title.trim()) return
    setSaving(true)
    setMessage(null)
    try {
      const { data: { user } } = await platformDb.auth.getUser()
      if (!user) throw new Error('Sign in required')
      await createGapRecord('quick_capture_items', {
        title: title.trim(),
        notes: notes.trim() || null,
        user_id: user.id,
        capture_status: 'pending',
      })
      setTitle('')
      setNotes('')
      setMessage({ type: 'success', text: 'Captured successfully' })
      setTimeout(() => {
        setOpen(false)
        setMessage(null)
      }, 1200)
    } catch (e) {
      setMessage({ type: 'error', text: e.message || 'Failed to save' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 lg:hidden flex items-center justify-center w-14 h-14 rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-400"
        aria-label="Quick capture"
      >
        <Plus className="h-6 w-6" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Quick capture"
        >
          <div className="w-full max-w-md rounded-xl bg-gray-900 border border-gray-700 p-4 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-100">Quick Capture</h2>
              <button type="button" onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-200">
                <X className="h-5 w-5" />
              </button>
            </div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title"
              className="w-full mb-3 px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-100 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes (optional)"
              rows={3}
              className="w-full mb-4 px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-100 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
            />
            {message && (
              <p className={`mb-3 text-sm ${message.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                {message.text}
              </p>
            )}
            <button
              type="button"
              disabled={saving || !title.trim()}
              onClick={handleSave}
              className="w-full py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Capture'}
            </button>
          </div>
        </div>
      )}
    </>
  )
}

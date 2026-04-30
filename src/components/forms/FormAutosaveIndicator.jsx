export default function FormAutosaveIndicator({ lastSavedAt, isSaving }) {
  return (
    <div className="text-xs text-gray-400">
      {isSaving ? 'Autosaving...' : `Saved ${lastSavedAt || 'just now'}`}
    </div>
  )
}

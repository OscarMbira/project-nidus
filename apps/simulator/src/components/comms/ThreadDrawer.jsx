export default function ThreadDrawer({ open, onClose, title = 'Thread', children }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <button type="button" className="absolute inset-0 bg-black/40" aria-label="Close thread" onClick={onClose} />
      <div className="relative w-full max-w-md h-full bg-gray-900 border-l border-gray-700 shadow-xl flex flex-col">
        <div className="p-3 border-b border-gray-700 flex justify-between items-center">
          <h3 className="font-medium text-white">{title}</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-white text-sm">
            Close
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 text-gray-200">{children}</div>
      </div>
    </div>
  )
}

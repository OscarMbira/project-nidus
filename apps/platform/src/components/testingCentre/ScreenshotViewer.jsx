import { useState } from 'react'
import Modal from '../ui/Modal'

export default function ScreenshotViewer({ isOpen, onClose, imageUrl, title, note, badgeLabel }) {
  const [zoom, setZoom] = useState(1)
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title || 'Screenshot'}>
      <div className="text-gray-100 max-w-4xl">
        {badgeLabel && <span className="text-xs px-2 py-0.5 rounded bg-gray-800 mb-2 inline-block">{badgeLabel}</span>}
        <div className="overflow-auto max-h-[70vh] flex items-center justify-center bg-black/50 rounded">
          {imageUrl && <img src={imageUrl} alt="" style={{ transform: `scale(${zoom})` }} className="max-w-full object-contain transition-transform" />}
        </div>
        <div className="flex gap-2 mt-2 text-sm">
          <button type="button" onClick={() => setZoom((z) => Math.min(3, z + 0.1))} className="px-2 py-1 rounded border border-gray-600">+</button>
          <button type="button" onClick={() => setZoom((z) => Math.max(0.2, z - 0.1))} className="px-2 py-1 rounded border border-gray-600">−</button>
        </div>
        {note && <p className="mt-2 text-sm text-gray-400 whitespace-pre-wrap">{note}</p>}
      </div>
    </Modal>
  )
}

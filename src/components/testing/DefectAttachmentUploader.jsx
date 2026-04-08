import { useState, useEffect } from 'react'
import { Upload } from 'lucide-react'
import { getDefectAttachments, uploadDefectAttachment, deleteDefectAttachment } from '../../services/defectService'

export default function DefectAttachmentUploader({
  projectId,
  defectId,
  uploadedByUserId,
  getAttachments = getDefectAttachments,
  uploadAttachment = uploadDefectAttachment,
  deleteAttachment = deleteDefectAttachment,
}) {
  const [items, setItems] = useState([])
  const [uploading, setUploading] = useState(false)

  const load = async () => {
    if (!defectId) return
    const data = await getDefectAttachments(defectId)
    setItems(data)
  }

  useEffect(() => {
    load()
  }, [defectId])

  const onFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !uploadedByUserId) return
    setUploading(true)
    try {
      await uploadAttachment({
        projectId,
        defectId,
        file,
        is_screenshot: file.type.startsWith('image/'),
        uploaded_by: uploadedByUserId,
      })
      await load()
    } catch (err) {
      console.error(err)
      alert(err?.message || 'Upload failed')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/40 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white">Attachments</h3>
        <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-800 border border-gray-600 text-xs text-gray-200 cursor-pointer hover:bg-gray-700">
          <Upload className="h-4 w-4" />
          {uploading ? 'Uploading…' : 'Upload'}
          <input type="file" className="hidden" onChange={onFile} disabled={uploading || !uploadedByUserId} />
        </label>
      </div>
      <ul className="space-y-2 text-sm">
        {items.map((a) => (
          <li key={a.id} className="flex justify-between gap-2 text-gray-300">
            <a href={a.file_url} target="_blank" rel="noreferrer" className="text-emerald-400 hover:underline truncate">
              {a.file_name}
            </a>
            <button
              type="button"
              onClick={async () => {
                if (!confirm('Remove attachment?')) return
                await deleteAttachment(a.id)
                load()
              }}
              className="text-red-400 text-xs shrink-0"
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

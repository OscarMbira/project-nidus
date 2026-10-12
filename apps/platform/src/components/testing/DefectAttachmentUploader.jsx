import { useCallback, useEffect, useRef, useState } from 'react'
import { ImagePlus } from 'lucide-react'
import toast from 'react-hot-toast'
import { RowActionButton } from '@nidus/ui'
import ZoomableImage from '@nidus/ui/ZoomableImage'
import { getDefectAttachments, uploadDefectAttachment, deleteDefectAttachment } from '../../services/defectService'

function filesFromClipboard(event) {
  const items = event.clipboardData?.items
  if (!items?.length) return []
  const files = []
  for (const item of items) {
    if (item.kind === 'file' && item.type.startsWith('image/')) {
      const file = item.getAsFile()
      if (file) {
        const ext = (file.type.split('/')[1] || 'png').replace('jpeg', 'jpg')
        const named = file.name && file.name !== 'image.png'
          ? file
          : new File([file], `screenshot-${Date.now()}.${ext}`, { type: file.type })
        files.push(named)
      }
    }
  }
  return files
}

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
  const [error, setError] = useState(null)
  const getAttachmentsRef = useRef(getAttachments)
  getAttachmentsRef.current = getAttachments
  const [localPreviews, setLocalPreviews] = useState({})

  const load = useCallback(async () => {
    if (!defectId) return
    const data = await getAttachmentsRef.current(defectId)
    setItems(data || [])
  }, [defectId])

  useEffect(() => {
    load().catch((err) => setError(err?.message || 'Could not load images'))
  }, [load])

  const sendFiles = async (files) => {
    const list = [...files].filter(Boolean)
    if (!list.length) return
    if (!uploadedByUserId) {
      setError('Your user profile is still loading. Try again in a moment.')
      return
    }
    if (!projectId || !defectId) return
    setUploading(true)
    setError(null)
    try {
      // Files are independent of each other, so upload them together instead
      // of one at a time (rule 66) — N files no longer take N times as long.
      const uploaded = await Promise.all(
        list.map(async (file) => {
          const localUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : null
          const result = await uploadAttachment({
            projectId,
            defectId,
            file,
            is_screenshot: file.type.startsWith('image/'),
            uploaded_by: uploadedByUserId,
          })
          return { attachment: result?.attachment, localUrl }
        }),
      )

      // Merge the new rows straight into state instead of re-fetching and
      // re-signing the whole list (rule 66) — we already have everything we
      // need: the inserted row, and an instant local preview for the image.
      const newPreviews = {}
      const newItems = []
      for (const { attachment, localUrl } of uploaded) {
        if (!attachment) continue
        newItems.push(attachment)
        if (localUrl) newPreviews[attachment.id] = localUrl
      }
      if (Object.keys(newPreviews).length) {
        setLocalPreviews((prev) => ({ ...prev, ...newPreviews }))
      }
      if (newItems.length) {
        setItems((prev) => [...newItems, ...prev]) // newest first, matching getDefectAttachments' own order
      }
      toast.success(list.length > 1 ? `${list.length} images uploaded.` : 'Image uploaded.')
    } catch (err) {
      setError(err?.message || 'Upload failed')
      toast.error('Could not upload this image. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const onPaste = (event) => {
    const files = filesFromClipboard(event)
    if (!files.length) return
    event.preventDefault()
    sendFiles(files)
  }

  const onDrop = (event) => {
    event.preventDefault()
    sendFiles(event.dataTransfer?.files)
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="text-xs font-medium text-gray-700 dark:text-gray-200">Images</p>
        <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-300">
          Upload a file, drop an image here, or click the box and paste with Ctrl+V.
        </p>
      </div>
      <div
        tabIndex={0}
        onPaste={onPaste}
        onDragOver={(event) => event.preventDefault()}
        onDrop={onDrop}
        className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center outline-none focus:ring-2 focus:ring-emerald-500 dark:border-gray-600 dark:bg-gray-700/40"
      >
        <ImagePlus className="h-6 w-6 text-gray-600 dark:text-gray-200" />
        <span className="text-sm text-gray-800 dark:text-gray-100">
          {uploading ? 'Uploading…' : 'Click this box, then paste a screenshot (Ctrl+V), or drop an image'}
        </span>
        <label className="inline-flex cursor-pointer items-center rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700">
          Choose image
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            disabled={uploading}
            onChange={(event) => {
              sendFiles(event.target.files)
              event.target.value = ''
            }}
          />
        </label>
      </div>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      {items.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {items.map((item) => {
            const isImage = item.is_screenshot
              || String(item.file_type || '').startsWith('image/')
              || /\.(png|jpe?g|gif|webp)$/i.test(item.file_name || '')
            const stored = item.preview_url || item.file_url
            const src = localPreviews[item.id]
              || (typeof stored === 'string' && /^(https?:|blob:|data:)/i.test(stored) ? stored : null)
            return (
              <li key={item.id} className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
                {isImage && src ? (
                  <div className="bg-gray-100 dark:bg-gray-900">
                    <ZoomableImage
                      src={src}
                      alt={item.file_name}
                      hoverScale={2.5}
                      className="block w-full"
                      imgClassName="h-40 w-full object-contain"
                      hoverPreviewClassName="object-contain"
                    />
                  </div>
                ) : isImage ? (
                  <div className="flex h-40 items-center justify-center bg-gray-100 px-2 text-center text-xs text-gray-700 dark:bg-gray-900 dark:text-gray-200">
                    Preview is not available yet. Refresh after the attachment access update is applied.
                  </div>
                ) : (
                  <a href={item.file_url} target="_blank" rel="noreferrer" className="block truncate px-2 py-3 text-sm text-emerald-700 dark:text-emerald-300">
                    {item.file_name}
                  </a>
                )}
                <div className="flex items-center justify-between gap-2 px-2 py-1.5">
                  <span className="truncate text-xs text-gray-700 dark:text-gray-200">{item.file_name}</span>
                  <RowActionButton
                    variant="delete"
                    label="Remove image"
                    onClick={async () => {
                      if (!window.confirm('Remove this image?')) return
                      try {
                        await deleteAttachment(item.id)
                        // Drop it locally instead of re-fetching and re-signing
                        // everything that's left (rule 66).
                        setItems((prev) => prev.filter((i) => i.id !== item.id))
                        toast.success('Image removed.')
                      } catch (err) {
                        setError(err?.message || 'Could not remove image')
                        toast.error('Could not remove this image. Please try again.')
                      }
                    }}
                  />
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { ImagePlus } from 'lucide-react'
import { RowActionButton } from '@nidus/ui'
import ZoomableImage from '../ui/ZoomableImage'
import { removeTestCaseStepImage, uploadTestCaseStepImage, withStepImagePreviews } from '../../services/testCaseService'

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

/**
 * Upload or paste images onto one test-step field (action, expected result, or test data).
 * Same paste / drop / file control as defect images.
 */
export default function FieldImagePicker({ images = [], onChange, projectId, fieldKey, disabled = false }) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)
  const [previews, setPreviews] = useState({})
  const list = Array.isArray(images) ? images : []

  useEffect(() => {
    let cancelled = false
    const needsSign = list.filter((item) => item?.file_path && !item.preview_url && !previews[item.file_path])
    if (!needsSign.length) return undefined
    withStepImagePreviews(needsSign).then((signed) => {
      if (cancelled) return
      setPreviews((prev) => {
        const next = { ...prev }
        for (const item of signed) {
          if (item?.file_path && item.preview_url) next[item.file_path] = item.preview_url
        }
        return next
      })
    }).catch(() => {})
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list.map((item) => item?.file_path).join('|')])

  const sendFiles = async (files) => {
    const chosen = [...files].filter((file) => file && String(file.type || '').startsWith('image/'))
    if (!chosen.length) return
    if (!projectId) {
      setError('Select a project before adding an image.')
      return
    }
    setUploading(true)
    setError(null)
    try {
      const saved = []
      for (const file of chosen) {
        saved.push(await uploadTestCaseStepImage({ projectId, file, fieldKey }))
      }
      onChange([...list, ...saved])
    } catch (err) {
      setError(err?.message || 'Image upload failed')
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

  const remove = async (item) => {
    setError(null)
    try {
      await removeTestCaseStepImage(item.file_path)
    } catch {
      /* still drop it from this step if storage delete is refused */
    }
    onChange(list.filter((image) => image.file_path !== item.file_path))
  }

  return (
    <div className="mt-2 space-y-2">
      {!disabled && (
        <div
          tabIndex={0}
          onPaste={onPaste}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault()
            sendFiles(event.dataTransfer?.files)
          }}
          className="flex flex-wrap items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 bg-gray-50 px-3 py-3 text-center outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-900"
        >
          <ImagePlus className="h-4 w-4 text-gray-600 dark:text-gray-200" />
          <span className="text-xs text-gray-700 dark:text-gray-200">
            {uploading ? 'Uploading…' : 'Paste a screenshot (Ctrl+V), drop an image, or'}
          </span>
          <label className="inline-flex cursor-pointer items-center rounded-lg bg-blue-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-700">
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
      )}
      {error && <p className="text-xs text-red-700 dark:text-red-300">{error}</p>}
      {list.length > 0 && (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {list.map((item) => {
            const src = item.preview_url || previews[item.file_path] || null
            const show = typeof src === 'string' && /^(https?:|blob:|data:)/i.test(src)
            return (
              <li key={item.file_path || item.file_name} className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
                {show ? (
                  <ZoomableImage
                    src={src}
                    alt={item.file_name || 'Step image'}
                    hoverScale={2.5}
                    className="block w-full"
                    imgClassName="h-28 w-full object-contain bg-gray-100 dark:bg-gray-900"
                    hoverPreviewClassName="object-contain"
                  />
                ) : (
                  <p className="p-3 text-xs text-gray-700 dark:text-gray-200">Preview is not available yet.</p>
                )}
                {!disabled && (
                  <div className="flex justify-end border-t border-gray-200 p-1 dark:border-gray-700">
                    <RowActionButton variant="delete" label="Remove image" onClick={() => remove(item)} />
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

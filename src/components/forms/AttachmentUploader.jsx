import { useState } from 'react'

export default function AttachmentUploader({ onUpload }) {
  const [fileName, setFileName] = useState('')
  return (
    <div className="rounded-lg border border-gray-700 bg-gray-900 p-4">
      <input
        type="file"
        className="w-full text-xs text-gray-200"
        onChange={(e) => {
          const file = e.target.files?.[0]
          setFileName(file?.name || '')
          if (file) onUpload?.(file)
        }}
      />
      {fileName ? <p className="mt-2 text-xs text-gray-400">{fileName}</p> : null}
    </div>
  )
}

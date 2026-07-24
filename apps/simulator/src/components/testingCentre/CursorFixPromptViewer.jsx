import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export default function CursorFixPromptViewer({ markdown, mode = 'single', onCopy, onDownloadFile }) {
  return (
    <div className="max-w-3xl w-full p-4 bg-gray-900 text-gray-100 rounded-lg border border-amber-900/50">
      <p className="text-amber-200/90 text-sm mb-3">Review all changes carefully before applying. Do not modify production data without review.</p>
      <div className="prose prose-invert prose-sm max-w-none max-h-[60vh] overflow-auto">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown || ''}</ReactMarkdown>
      </div>
      <div className="mt-3 flex gap-2">
        {onCopy && <button type="button" onClick={onCopy} className="px-3 py-1.5 rounded bg-gray-800 text-sm">Copy to clipboard</button>}
        {onDownloadFile && <button type="button" onClick={onDownloadFile} className="px-3 py-1.5 rounded bg-blue-700 text-sm">Download .md</button>}
      </div>
    </div>
  )
}

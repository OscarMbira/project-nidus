import { useState } from 'react'
import { Send } from 'lucide-react'

export default function MessageInput({ onSend, disabled, placeholder = 'Message…' }) {
  const [text, setText] = useState('')
  const submit = () => {
    const t = text.trim()
    if (!t || disabled) return
    onSend(t)
    setText('')
  }
  return (
    <div className="flex gap-2 items-end p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/80">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            submit()
          }
        }}
        placeholder={placeholder}
        disabled={disabled}
        rows={2}
        className="flex-1 min-h-[44px] rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm resize-none focus:ring-2 focus:ring-cyan-600"
      />
      <button
        type="button"
        onClick={submit}
        disabled={disabled || !text.trim()}
        className="shrink-0 inline-flex items-center justify-center h-11 w-11 rounded-lg bg-cyan-600 text-white disabled:opacity-40"
        aria-label="Send"
      >
        <Send className="h-5 w-5" />
      </button>
    </div>
  )
}

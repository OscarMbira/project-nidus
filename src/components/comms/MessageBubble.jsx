import { useThemeContext } from '../../context/ThemeContext'

export default function MessageBubble({ message, isOwn, senderLabel }) {
  const { theme } = useThemeContext()
  const isDark = theme === 'dark'
  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-2`}>
      <div
        className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-3 py-2 text-sm ${
          isOwn
            ? 'bg-cyan-700 text-white'
            : isDark
              ? 'bg-gray-800 text-gray-100 border border-gray-700'
              : 'bg-gray-100 text-gray-900 border border-gray-200'
        }`}
      >
        {!isOwn && senderLabel && <p className="text-xs font-medium opacity-80 mb-0.5">{senderLabel}</p>}
        <p className="whitespace-pre-wrap break-words">{message.content || ''}</p>
        <p className="text-[10px] opacity-60 mt-1">
          {message.created_at ? new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
        </p>
      </div>
    </div>
  )
}

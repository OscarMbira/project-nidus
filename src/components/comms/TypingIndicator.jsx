export default function TypingIndicator({ names = [] }) {
  if (!names.length) return null
  const label = names.length === 1 ? `${names[0]} is typing…` : `${names.slice(0, 2).join(', ')} are typing…`
  return (
    <p className="text-xs text-gray-500 dark:text-gray-400 italic px-3 py-1" aria-live="polite">
      {label}
    </p>
  )
}

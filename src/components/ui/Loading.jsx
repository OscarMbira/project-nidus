import { Loader2 } from 'lucide-react'

export function Loading({ size = 'default', className = '', text, fullScreen = false }) {
  const sizes = {
    sm: 'h-4 w-4',
    default: 'h-8 w-8',
    lg: 'h-12 w-12'
  }

  const spinner = (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <Loader2 className={`${sizes[size]} animate-spin text-blue-600 dark:text-blue-400`} />
      {text && (
        <p className="text-sm text-gray-600 dark:text-gray-400">{text}</p>
      )}
    </div>
  )

  if (fullScreen) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white dark:bg-gray-900 bg-opacity-75 dark:bg-opacity-75 z-50">
        {spinner}
      </div>
    )
  }

  return spinner
}

export function LoadingOverlay({ text = 'Loading...', className = '' }) {
  return (
    <div className={`absolute inset-0 flex items-center justify-center bg-white dark:bg-gray-900 bg-opacity-75 dark:bg-opacity-75 rounded-lg z-10 ${className}`}>
      <Loading text={text} />
    </div>
  )
}

export default Loading


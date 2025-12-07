import { forwardRef } from 'react'
import { AlertCircle } from 'lucide-react'

const Textarea = forwardRef(({ 
  label, 
  error, 
  helperText, 
  required, 
  className = '', 
  id,
  rows = 4,
  ...props 
}, ref) => {
  const textareaId = id || `textarea-${Math.random().toString(36).substr(2, 9)}`
  const hasError = !!error

  return (
    <div className="w-full">
      {label && (
        <label 
          htmlFor={textareaId}
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        <textarea
          id={textareaId}
          ref={ref}
          rows={rows}
          className={`
            w-full px-4 py-2.5 
            border rounded-lg
            bg-white dark:bg-gray-700 
            text-gray-900 dark:text-white 
            placeholder-gray-400 dark:placeholder-gray-500
            focus:outline-none focus:ring-2 focus:ring-offset-0
            transition-colors
            resize-y
            disabled:opacity-50 disabled:cursor-not-allowed
            ${hasError 
              ? 'border-red-500 dark:border-red-600 focus:ring-red-500 dark:focus:ring-red-600' 
              : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent'
            }
            ${className}
          `}
          aria-invalid={hasError}
          aria-describedby={
            error ? `${textareaId}-error` : helperText ? `${textareaId}-helper` : undefined
          }
          {...props}
        />
        {hasError && (
          <div className="absolute top-3 right-3 pointer-events-none">
            <AlertCircle className="h-5 w-5 text-red-500" aria-hidden="true" />
          </div>
        )}
      </div>
      {error && (
        <p id={`${textareaId}-error`} className="mt-1.5 text-sm text-red-600 dark:text-red-400 flex items-center gap-1" role="alert">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </p>
      )}
      {helperText && !error && (
        <p id={`${textareaId}-helper`} className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
          {helperText}
        </p>
      )}
    </div>
  )
})

Textarea.displayName = 'Textarea'

export { Textarea }
export default Textarea

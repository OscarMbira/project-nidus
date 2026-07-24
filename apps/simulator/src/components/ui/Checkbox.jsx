import { forwardRef } from 'react'

const Checkbox = forwardRef(({ 
  label, 
  error, 
  helperText, 
  className = '', 
  id,
  ...props 
}, ref) => {
  const checkboxId = id || `checkbox-${Math.random().toString(36).substr(2, 9)}`
  const hasError = !!error

  return (
    <div className="w-full">
      <div className="flex items-start gap-3">
        <div className="relative flex items-center h-5 mt-0.5">
          <input
            id={checkboxId}
            ref={ref}
            type="checkbox"
            className={`
              w-4 h-4 
              rounded 
              border-gray-300 dark:border-gray-600
              bg-white dark:bg-gray-700
              text-blue-600 dark:text-blue-500
              focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400
              focus:ring-offset-0
              cursor-pointer
              transition-colors
              disabled:opacity-50 disabled:cursor-not-allowed
              ${hasError ? 'border-red-500 dark:border-red-600' : ''}
              ${className}
            `}
            aria-invalid={hasError}
            aria-describedby={
              error ? `${checkboxId}-error` : helperText ? `${checkboxId}-helper` : undefined
            }
            {...props}
          />
        </div>
        {label && (
          <label 
            htmlFor={checkboxId}
            className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer select-none"
          >
            {label}
          </label>
        )}
      </div>
      {error && (
        <p id={`${checkboxId}-error`} className="mt-1.5 ml-7 text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}
      {helperText && !error && (
        <p id={`${checkboxId}-helper`} className="mt-1.5 ml-7 text-sm text-gray-500 dark:text-gray-400">
          {helperText}
        </p>
      )}
    </div>
  )
})

Checkbox.displayName = 'Checkbox'

export default Checkbox


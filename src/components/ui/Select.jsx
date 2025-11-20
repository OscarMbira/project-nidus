import { forwardRef } from 'react'
import { AlertCircle, ChevronDown } from 'lucide-react'

const Select = forwardRef(({ 
  label, 
  error, 
  helperText, 
  required, 
  className = '', 
  id,
  placeholder = 'Select an option',
  children,
  ...props 
}, ref) => {
  const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`
  const hasError = !!error

  return (
    <div className="w-full">
      {label && (
        <label 
          htmlFor={selectId}
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        <select
          id={selectId}
          ref={ref}
          className={`
            w-full px-4 py-2.5 pr-10
            border rounded-lg
            bg-white dark:bg-gray-700 
            text-gray-900 dark:text-white 
            appearance-none
            cursor-pointer
            focus:outline-none focus:ring-2 focus:ring-offset-0
            transition-colors
            disabled:opacity-50 disabled:cursor-not-allowed
            ${hasError 
              ? 'border-red-500 dark:border-red-600 focus:ring-red-500 dark:focus:ring-red-600' 
              : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent'
            }
            ${className}
          `}
          aria-invalid={hasError}
          aria-describedby={
            error ? `${selectId}-error` : helperText ? `${selectId}-helper` : undefined
          }
          {...props}
        >
          {placeholder && (
            <option value="" disabled hidden>
              {placeholder}
            </option>
          )}
          {children}
        </select>
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          {hasError ? (
            <AlertCircle className="h-5 w-5 text-red-500" aria-hidden="true" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-400 dark:text-gray-500" aria-hidden="true" />
          )}
        </div>
      </div>
      {error && (
        <p id={`${selectId}-error`} className="mt-1.5 text-sm text-red-600 dark:text-red-400 flex items-center gap-1" role="alert">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </p>
      )}
      {helperText && !error && (
        <p id={`${selectId}-helper`} className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
          {helperText}
        </p>
      )}
    </div>
  )
})

Select.displayName = 'Select'

export default Select


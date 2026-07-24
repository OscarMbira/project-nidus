import { forwardRef } from 'react'

const Label = forwardRef(({ 
  children, 
  htmlFor, 
  required, 
  className = '', 
  ...props 
}, ref) => {
  return (
    <label
      ref={ref}
      htmlFor={htmlFor}
      className={`
        block text-sm font-medium 
        text-gray-700 dark:text-gray-300 
        mb-2
        ${className}
      `}
      {...props}
    >
      {children}
      {required && <span className="text-red-500 ml-1" aria-label="required">*</span>}
    </label>
  )
})

Label.displayName = 'Label'

export default Label


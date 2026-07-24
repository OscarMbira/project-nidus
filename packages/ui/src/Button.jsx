import { Link } from 'react-router-dom'
import { Loader2 } from 'lucide-react'

const Button = ({ 
  children, 
  variant = 'default', 
  size = 'default',
  asChild = false,
  loading = false,
  className = '',
  ...props 
}) => {
  const baseClasses = 'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed'
  
  const variants = {
    default: 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 focus-visible:ring-blue-500',
    destructive: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 focus-visible:ring-red-500',
    outline: 'border border-gray-300 dark:border-gray-600 bg-transparent hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 active:bg-gray-100 dark:active:bg-gray-600 focus-visible:ring-gray-500',
    ghost: 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 active:bg-gray-200 dark:active:bg-gray-700 focus-visible:ring-gray-500',
    secondary: 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-600 active:bg-gray-400 dark:active:bg-gray-500 focus-visible:ring-gray-500',
    success: 'bg-green-600 text-white hover:bg-green-700 active:bg-green-800 focus-visible:ring-green-500',
  }
  
  const sizes = {
    sm: 'h-8 px-3 text-sm',
    default: 'h-10 px-4 py-2',
    lg: 'h-11 px-8 text-base',
    icon: 'h-10 w-10 p-0',
  }
  
  const classes = `${baseClasses} ${variants[variant]} ${sizes[size]} ${loading ? 'cursor-wait' : ''} ${className}`
  
  if (asChild && props.to) {
    return <Link to={props.to} className={classes} {...props}>{children}</Link>
  }
  
  if (asChild) {
    return <div className={classes} {...props}>{children}</div>
  }
  
  return (
    <button 
      className={classes} 
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  )
}

export { Button }
export default Button

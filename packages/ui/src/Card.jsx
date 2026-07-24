const Card = ({ children, className = '', ...props }) => {
  return (
    <div 
      className={`rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}

const CardHeader = ({ children, className = '', ...props }) => {
  return (
    <div className={`flex flex-col space-y-1.5 p-6 ${className}`} {...props}>
      {children}
    </div>
  )
}

const CardTitle = ({ children, className = '', ...props }) => {
  return (
    <h3 className={`text-2xl font-semibold leading-none tracking-tight ${className}`} {...props}>
      {children}
    </h3>
  )
}

const CardDescription = ({ children, className = '', ...props }) => {
  return (
    <p className={`text-sm text-gray-500 dark:text-gray-400 ${className}`} {...props}>
      {children}
    </p>
  )
}

const CardContent = ({ children, className = '', ...props }) => {
  return (
    <div className={`p-6 pt-0 ${className}`} {...props}>
      {children}
    </div>
  )
}

const CardFooter = ({ children, className = '', ...props }) => {
  return (
    <div className={`flex items-center p-6 pt-0 ${className}`} {...props}>
      {children}
    </div>
  )
}

Card.Header = CardHeader
Card.Title = CardTitle
Card.Description = CardDescription
Card.Content = CardContent
Card.Footer = CardFooter

export default Card
export { CardHeader, CardTitle, CardDescription, CardContent, CardFooter }


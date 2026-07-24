import { useState } from 'react'
import { HelpCircle } from 'lucide-react'

export default function Tooltip({ text, children, position = 'top' }) {
  const [show, setShow] = useState(false)

  const positionClasses = {
    top: 'bottom-full left-1/2 transform -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 transform -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 transform -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 transform -translate-y-1/2 ml-2',
  }

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        className="cursor-help"
      >
        {children || <HelpCircle className="h-4 w-4 text-gray-400" />}
      </div>
      {show && (
        <div
          className={`absolute z-50 px-3 py-2 text-sm text-white bg-gray-900 dark:bg-gray-700 rounded-lg shadow-lg whitespace-nowrap ${positionClasses[position]}`}
        >
          {text}
          <div
            className={`absolute w-0 h-0 border-4 ${
              position === 'top'
                ? 'top-full left-1/2 transform -translate-x-1/2 border-t-gray-900 dark:border-t-gray-700 border-r-transparent border-b-transparent border-l-transparent'
                : position === 'bottom'
                ? 'bottom-full left-1/2 transform -translate-x-1/2 border-b-gray-900 dark:border-b-gray-700 border-r-transparent border-t-transparent border-l-transparent'
                : position === 'left'
                ? 'left-full top-1/2 transform -translate-y-1/2 border-l-gray-900 dark:border-l-gray-700 border-r-transparent border-t-transparent border-b-transparent'
                : 'right-full top-1/2 transform -translate-y-1/2 border-r-gray-900 dark:border-r-gray-700 border-l-transparent border-t-transparent border-b-transparent'
            }`}
          />
        </div>
      )}
    </div>
  )
}


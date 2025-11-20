import { forwardRef } from 'react'

/**
 * Accessible Table Component
 * Provides proper ARIA labels, semantic HTML, and accessibility features
 */

const Table = forwardRef(({ 
  children, 
  caption,
  className = '',
  ...props 
}, ref) => {
  return (
    <div className="overflow-x-auto">
      <table
        ref={ref}
        className={`min-w-full divide-y divide-gray-200 dark:divide-gray-700 ${className}`}
        role="table"
        {...props}
      >
        {caption && <caption className="sr-only">{caption}</caption>}
        {children}
      </table>
    </div>
  )
})

Table.displayName = 'Table'

const TableHeader = forwardRef(({ 
  children, 
  className = '',
  ...props 
}, ref) => {
  return (
    <thead
      ref={ref}
      className={`bg-gray-50 dark:bg-gray-700 ${className}`}
      {...props}
    >
      {children}
    </thead>
  )
})

TableHeader.displayName = 'TableHeader'

const TableBody = forwardRef(({ 
  children, 
  className = '',
  ...props 
}, ref) => {
  return (
    <tbody
      ref={ref}
      className={`bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700 ${className}`}
      {...props}
    >
      {children}
    </tbody>
  )
})

TableBody.displayName = 'TableBody'

const TableRow = forwardRef(({ 
  children, 
  className = '',
  isHeader = false,
  ...props 
}, ref) => {
  const Component = isHeader ? 'th' : 'tr'
  return (
    <Component
      ref={ref}
      className={`${className}`}
      {...props}
    >
      {children}
    </Component>
  )
})

TableRow.displayName = 'TableRow'

const TableHeaderCell = forwardRef(({ 
  children, 
  scope = 'col',
  className = '',
  sortable = false,
  sortDirection = null, // 'asc', 'desc', null
  onSort,
  ...props 
}, ref) => {
  return (
    <th
      ref={ref}
      scope={scope}
      className={`px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider ${className} ${
        sortable ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 select-none' : ''
      }`}
      onClick={sortable && onSort ? () => {
        const newDirection = sortDirection === 'asc' ? 'desc' : sortDirection === 'desc' ? null : 'asc'
        onSort(newDirection)
      } : undefined}
      role={sortable ? 'columnheader' : undefined}
      aria-sort={
        sortable
          ? sortDirection === 'asc'
            ? 'ascending'
            : sortDirection === 'desc'
            ? 'descending'
            : 'none'
          : undefined
      }
      tabIndex={sortable ? 0 : undefined}
      onKeyDown={sortable && onSort ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          const newDirection = sortDirection === 'asc' ? 'desc' : sortDirection === 'desc' ? null : 'asc'
          onSort(newDirection)
        }
      } : undefined}
      {...props}
    >
      <div className="flex items-center gap-2">
        {children}
        {sortable && (
          <span className="text-xs" aria-hidden="true">
            {sortDirection === 'asc' && '↑'}
            {sortDirection === 'desc' && '↓'}
            {!sortDirection && '⇅'}
          </span>
        )}
      </div>
    </th>
  )
})

TableHeaderCell.displayName = 'TableHeaderCell'

const TableCell = forwardRef(({ 
  children, 
  className = '',
  ...props 
}, ref) => {
  return (
    <td
      ref={ref}
      className={`px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white ${className}`}
      {...props}
    >
      {children}
    </td>
  )
})

TableCell.displayName = 'TableCell'

export { Table, TableHeader, TableBody, TableRow, TableHeaderCell, TableCell }


import { Inbox, Search, AlertCircle, FolderOpen } from 'lucide-react'
import { Button } from './Button'

export function EmptyState({ 
  icon: Icon = Inbox,
  title = 'No data found',
  description,
  action,
  actionLabel,
  className = ''
}) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}>
      <div className="mb-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-full">
        <Icon className="h-12 w-12 text-gray-400 dark:text-gray-500" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        {title}
      </h3>
      {description && (
        <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md mb-6">
          {description}
        </p>
      )}
      {action && actionLabel && (
        <Button onClick={action}>
          {actionLabel}
        </Button>
      )}
    </div>
  )
}

export function EmptySearch({ query, onClear }) {
  return (
    <EmptyState
      icon={Search}
      title="No results found"
      description={query ? `No results found for "${query}". Try adjusting your search or filters.` : 'No results found. Try adjusting your search or filters.'}
      action={onClear}
      actionLabel="Clear search"
    />
  )
}

export function EmptyError({ title = 'Something went wrong', description, onRetry, retryLabel = 'Try again' }) {
  return (
    <EmptyState
      icon={AlertCircle}
      title={title}
      description={description || 'An error occurred while loading data. Please try again.'}
      action={onRetry}
      actionLabel={retryLabel}
    />
  )
}

export function EmptyFolder({ title = 'No items', description, onCreate, createLabel = 'Create new' }) {
  return (
    <EmptyState
      icon={FolderOpen}
      title={title}
      description={description}
      action={onCreate}
      actionLabel={createLabel}
    />
  )
}

export default EmptyState


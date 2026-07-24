import { ThumbsUp, User } from 'lucide-react'
import { format } from 'date-fns'

const categoryConfig = {
  went_well: {
    label: 'What Went Well',
    color: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
    textColor: 'text-green-900 dark:text-green-300',
  },
  didnt_go_well: {
    label: "What Didn't Go Well",
    color: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
    textColor: 'text-red-900 dark:text-red-300',
  },
  improvements: {
    label: 'Improvements',
    color: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
    textColor: 'text-blue-900 dark:text-blue-300',
  },
  actions: {
    label: 'Actions',
    color: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
    textColor: 'text-yellow-900 dark:text-yellow-300',
  },
  appreciations: {
    label: 'Appreciations',
    color: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800',
    textColor: 'text-purple-900 dark:text-purple-300',
  },
}

export default function RetroBoard({ items, onVote, currentUserId }) {
  const groupedItems = items.reduce((acc, item) => {
    if (!acc[item.item_category]) {
      acc[item.item_category] = []
    }
    acc[item.item_category].push(item)
    return acc
  }, {})

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      {Object.keys(categoryConfig).length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400 text-center py-8">
          No retrospective items yet. Add items to get started!
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(categoryConfig).map(([category, config]) => {
            const categoryItems = groupedItems[category] || []
            return (
              <div key={category} className="space-y-3">
                <h3 className={`font-semibold text-sm mb-3 ${config.textColor}`}>
                  {config.label}
                </h3>
                <div className={`${config.color} rounded-lg p-4 min-h-[200px] space-y-3`}>
                  {categoryItems.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400 italic text-center py-4">
                      No items yet
                    </p>
                  ) : (
                    categoryItems.map((item, index) => (
                      <div
                        key={item.id}
                        className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700"
                      >
                        <p className="text-sm text-gray-900 dark:text-white mb-2">
                          {item.item_text}
                        </p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                            <User className="h-3 w-3" />
                            <span>{item.user?.full_name || item.user?.email || 'Unknown'}</span>
                          </div>
                          <button
                            onClick={() => onVote(item.id)}
                            className="flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-xs text-gray-700 dark:text-gray-300"
                          >
                            <ThumbsUp className="h-3 w-3" />
                            {item.vote_count || 0}
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}


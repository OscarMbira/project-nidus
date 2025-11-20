import { useState, useEffect } from 'react'
import { HelpCircle, X, BookOpen, Search, ChevronRight } from 'lucide-react'
import { getHelpArticles, searchHelpArticles } from '../../services/helpService'
import { useToastContext } from '../../context/ToastContext'

export default function ContextualHelp({ 
  context, 
  page, 
  section, 
  position = 'bottom-right',
  showOnMount = false 
}) {
  const [isOpen, setIsOpen] = useState(showOnMount)
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const toast = useToastContext()

  useEffect(() => {
    if (isOpen && (context || page || section)) {
      loadContextualHelp()
    }
  }, [isOpen, context, page, section])

  const loadContextualHelp = async () => {
    setLoading(true)
    try {
      const filters = {}
      if (context) filters.tags = [context]
      if (page) filters.tags = [...(filters.tags || []), page]
      if (section) filters.tags = [...(filters.tags || []), section]

      let result
      if (searchQuery) {
        result = await searchHelpArticles(searchQuery, filters)
      } else {
        result = await getHelpArticles({ ...filters, limit: 5, featured: true })
      }

      if (result.success) {
        setArticles(result.data || [])
      }
    } catch (error) {
      console.error('Error loading contextual help:', error)
      if (toast) {
        toast.error('Failed to load help articles')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = async (query) => {
    setSearchQuery(query)
    if (query) {
      setLoading(true)
      try {
        const result = await searchHelpArticles(query, {
          tags: context ? [context] : [],
          limit: 5
        })
        if (result.success) {
          setArticles(result.data || [])
        }
      } catch (error) {
        console.error('Error searching help:', error)
      } finally {
        setLoading(false)
      }
    } else {
      loadContextualHelp()
    }
  }

  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4'
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed ${positionClasses[position]} z-40 p-3 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
        aria-label="Get help"
        title="Get help with this section"
      >
        <HelpCircle className="h-5 w-5" />
      </button>
    )
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={() => setIsOpen(false)}
        aria-hidden="true"
      />

      {/* Help Panel */}
      <div
        className={`fixed ${positionClasses[position]} w-96 max-w-[90vw] max-h-[80vh] bg-white dark:bg-gray-800 rounded-lg shadow-xl z-50 flex flex-col`}
        role="dialog"
        aria-labelledby="contextual-help-title"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <h2 id="contextual-help-title" className="text-lg font-semibold text-gray-900 dark:text-white">
              Help & Support
            </h2>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors"
            aria-label="Close help"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search for help..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>
          {(context || page || section) && (
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Context: {[context, page, section].filter(Boolean).join(' > ')}
            </p>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-2"></div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Loading help articles...</p>
            </div>
          ) : articles.length > 0 ? (
            <div className="space-y-3">
              {articles.map((article) => (
                <a
                  key={article.id}
                  href={`/help/article/${article.slug}`}
                  className="block p-3 rounded-lg bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors group"
                >
                  <h3 className="font-medium text-sm text-gray-900 dark:text-white mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                    {article.title}
                  </h3>
                  {article.excerpt && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                      {article.excerpt}
                    </p>
                  )}
                  <div className="flex items-center justify-between mt-2">
                    {article.help_categories && (
                      <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
                        {article.help_categories.category_name}
                      </span>
                    )}
                    <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <HelpCircle className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                {searchQuery ? 'No help articles found.' : 'No help articles available for this context.'}
              </p>
              <a
                href="/help"
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                Browse all help articles
              </a>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <a
            href="/help"
            className="block w-full text-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            View Help Center
          </a>
        </div>
      </div>
    </>
  )
}


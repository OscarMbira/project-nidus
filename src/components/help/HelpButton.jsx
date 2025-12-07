import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { HelpCircle, X, Search } from 'lucide-react'
import { getHelpArticles, searchHelpArticles } from '../../services/helpService'
import Input from '../ui/Input.jsx'

export default function HelpButton() {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSearch = async (query) => {
    if (!query) {
      setArticles([])
      return
    }

    setLoading(true)
    try {
      const result = await searchHelpArticles(query, { limit: 5 })
      if (result.success) {
        setArticles(result.data)
      }
    } catch (error) {
      console.error('Error searching help:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleArticleClick = (slug) => {
    navigate(`/help/article/${slug}`)
    setIsOpen(false)
    setSearchQuery('')
    setArticles([])
  }

  return (
    <>
      {/* Floating Help Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 p-4 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        aria-label="Open help"
      >
        <HelpCircle className="h-6 w-6" />
      </button>

      {/* Help Modal */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-50"
            onClick={() => setIsOpen(false)}
          />

          {/* Modal */}
          <div className="fixed bottom-6 right-6 w-96 max-h-[80vh] bg-white dark:bg-gray-800 rounded-lg shadow-xl z-50 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Help</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                aria-label="Close help"
              >
                <X className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>

            {/* Search */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search for help..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    handleSearch(e.target.value)
                  }}
                  className="pl-9 pr-3 py-2 w-full"
                />
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {loading ? (
                <div className="text-center py-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Searching...</p>
                </div>
              ) : articles.length > 0 ? (
                <div className="space-y-2">
                  {articles.map((article) => (
                    <button
                      key={article.id}
                      onClick={() => handleArticleClick(article.slug)}
                      className="w-full p-3 text-left bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                    >
                      <h3 className="font-medium text-sm text-gray-900 dark:text-white mb-1">
                        {article.title}
                      </h3>
                      {article.excerpt && (
                        <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                          {article.excerpt}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              ) : searchQuery ? (
                <div className="text-center py-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">No results found.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <button
                    onClick={() => {
                      navigate('/help')
                      setIsOpen(false)
                    }}
                    className="w-full p-3 text-left bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                  >
                    <h3 className="font-medium text-sm text-gray-900 dark:text-white">Help Center</h3>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Browse all articles</p>
                  </button>
                  <button
                    onClick={() => {
                      navigate('/help/tutorials')
                      setIsOpen(false)
                    }}
                    className="w-full p-3 text-left bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                  >
                    <h3 className="font-medium text-sm text-gray-900 dark:text-white">Video Tutorials</h3>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Watch video guides</p>
                  </button>
                  <button
                    onClick={() => {
                      navigate('/help/faq')
                      setIsOpen(false)
                    }}
                    className="w-full p-3 text-left bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                  >
                    <h3 className="font-medium text-sm text-gray-900 dark:text-white">FAQ</h3>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Frequently asked questions</p>
                  </button>
                  <button
                    onClick={() => {
                      navigate('/help/contact')
                      setIsOpen(false)
                    }}
                    className="w-full p-3 text-left bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                  >
                    <h3 className="font-medium text-sm text-gray-900 dark:text-white">Contact Support</h3>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Get help from our team</p>
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  )
}


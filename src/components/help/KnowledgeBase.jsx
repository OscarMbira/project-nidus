import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, Search, ChevronRight, Eye, ThumbsUp, ThumbsDown, Clock, Tag } from 'lucide-react'
import { getHelpArticles, getHelpCategories, searchHelpArticles, submitHelpFeedback } from '../../services/helpService'
import { useToastContext } from '../../context/ToastContext'
import { supabase } from '../../services/supabaseClient'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'
import { Loading } from '../ui/Loading'
import { EmptyState } from '../ui/EmptyState'

export default function KnowledgeBase({ filters = {} }) {
  const [articles, setArticles] = useState([])
  const [categories, setCategories] = useState([])
  const [selectedCategory, setSelectedCategory] = useState(filters.category_id || null)
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [viewedArticles, setViewedArticles] = useState(new Set())
  const navigate = useNavigate()
  const toast = useToastContext()
  const [userId, setUserId] = useState(null)

  useEffect(() => {
    loadInitialData()
    
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUserId(user?.id || null)
    }
    getUser()
  }, [])

  useEffect(() => {
    if (searchQuery || selectedCategory) {
      loadArticles()
    } else {
      loadArticles()
    }
  }, [searchQuery, selectedCategory])

  const loadInitialData = async () => {
    setLoading(true)
    try {
      const [categoriesResult, articlesResult] = await Promise.all([
        getHelpCategories(),
        getHelpArticles({ limit: 20, ...filters })
      ])

      if (categoriesResult.success) {
        setCategories(categoriesResult.data)
      }
      if (articlesResult.success) {
        setArticles(articlesResult.data)
        // Mark as viewed
        articlesResult.data.forEach(article => {
          setViewedArticles(prev => new Set(prev).add(article.id))
        })
      }
    } catch (error) {
      console.error('Error loading knowledge base:', error)
      if (toast) {
        toast.error('Failed to load knowledge base')
      }
    } finally {
      setLoading(false)
    }
  }

  const loadArticles = async () => {
    setLoading(true)
    try {
      let result
      if (searchQuery) {
        result = await searchHelpArticles(searchQuery, {
          category_id: selectedCategory,
          limit: 20
        })
      } else {
        result = await getHelpArticles({
          category_id: selectedCategory,
          limit: 20,
          ...filters
        })
      }

      if (result.success) {
        setArticles(result.data || [])
      }
    } catch (error) {
      console.error('Error loading articles:', error)
      if (toast) {
        toast.error('Failed to load articles')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleArticleClick = async (article) => {
    navigate(`/help/article/${article.slug}`)
    
    // Mark as viewed
    if (!viewedArticles.has(article.id)) {
      setViewedArticles(prev => new Set(prev).add(article.id))
    }
  }

  const handleFeedback = async (articleId, feedbackType) => {
    if (!userId) {
      if (toast) {
        toast.info('Please log in to provide feedback')
      }
      return
    }

    try {
      const result = await submitHelpFeedback(articleId, userId, feedbackType)
      if (result.success) {
        if (toast) {
          toast.success(feedbackType === 'helpful' ? 'Thank you for your feedback!' : 'Thanks, we\'ll improve this article')
        }
        // Update article helpful count locally
        setArticles(prev => prev.map(article => 
          article.id === articleId 
            ? { 
                ...article, 
                helpful_count: feedbackType === 'helpful' ? (article.helpful_count || 0) + 1 : article.helpful_count,
                not_helpful_count: feedbackType === 'not_helpful' ? (article.not_helpful_count || 0) + 1 : article.not_helpful_count
              }
            : article
        ))
      }
    } catch (error) {
      console.error('Error submitting feedback:', error)
      if (toast) {
        toast.error('Failed to submit feedback')
      }
    }
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now - date
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
    return date.toLocaleDateString()
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <BookOpen className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Knowledge Base</h1>
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          Browse articles, guides, and tutorials
        </p>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            type="text"
            placeholder="Search knowledge base..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Categories */}
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedCategory === null
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              All Categories
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedCategory === category.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                {category.category_name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Articles List */}
      {loading ? (
        <Loading text="Loading articles..." />
      ) : articles.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title={searchQuery ? 'No articles found' : 'No articles available'}
          description={searchQuery 
            ? `No articles match "${searchQuery}". Try a different search term.`
            : 'There are no articles available in this category yet.'}
        />
      ) : (
        <div className="space-y-4">
          {articles.map((article) => (
            <article
              key={article.id}
              className="p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    <button
                      onClick={() => handleArticleClick(article)}
                      className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-left"
                    >
                      {article.title}
                    </button>
                  </h2>
                  
                  {article.excerpt && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                      {article.excerpt}
                    </p>
                  )}

                  <div className="flex items-center gap-4 flex-wrap text-xs text-gray-500 dark:text-gray-400">
                    {article.help_categories && (
                      <div className="flex items-center gap-1">
                        <Tag className="h-3 w-3" />
                        <span>{article.help_categories.category_name}</span>
                      </div>
                    )}
                    {article.view_count > 0 && (
                      <div className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        <span>{article.view_count} views</span>
                      </div>
                    )}
                    {article.created_at && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{formatDate(article.created_at)}</span>
                      </div>
                    )}
                  </div>

                  {/* Feedback */}
                  <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Was this helpful?</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleFeedback(article.id, 'helpful')}
                        className="flex items-center gap-1 px-3 py-1 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-green-600 dark:hover:text-green-400 transition-colors"
                        aria-label="Mark as helpful"
                      >
                        <ThumbsUp className="h-4 w-4" />
                        {article.helpful_count > 0 && <span>{article.helpful_count}</span>}
                      </button>
                      <button
                        onClick={() => handleFeedback(article.id, 'not_helpful')}
                        className="flex items-center gap-1 px-3 py-1 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                        aria-label="Mark as not helpful"
                      >
                        <ThumbsDown className="h-4 w-4" />
                        {article.not_helpful_count > 0 && <span>{article.not_helpful_count}</span>}
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleArticleClick(article)}
                  className="flex-shrink-0 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  aria-label="Read article"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Load More */}
      {articles.length >= 20 && (
        <div className="mt-6 text-center">
          <Button
            onClick={loadArticles}
            variant="outline"
          >
            Load More Articles
          </Button>
        </div>
      )}
    </div>
  )
}


import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Search, BookOpen, Video, FileText, MessageCircle, HelpCircle, ChevronRight } from 'lucide-react'
import { getHelpArticles, getHelpArticle, getHelpCategories, searchHelpArticles, getFeaturedArticles } from '../services/helpService'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import KnowledgeBase from '../components/help/KnowledgeBase'
import FAQ from '../components/help/FAQ'

export default function HelpCenter() {
  const location = useLocation()
  const navigate = useNavigate()
  const [articles, setArticles] = useState([])
  const [categories, setCategories] = useState([])
  const [featuredArticles, setFeaturedArticles] = useState([])
  const [article, setArticle] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [loading, setLoading] = useState(true)

  // Determine view based on route
  const pathname = location.pathname
  const isArticlePage = pathname.startsWith('/help/article/')
  const isTutorialsPage = pathname === '/help/tutorials'
  const isGuidesPage = pathname === '/help/guides'
  const isFAQPage = pathname === '/help/faq'
  const isContactPage = pathname === '/help/contact'
  const isMainPage = pathname === '/help'

  useEffect(() => {
    if (isArticlePage) {
      const slug = pathname.split('/help/article/')[1]
      loadArticle(slug)
    } else if (isMainPage || isGuidesPage) {
      loadData()
    }
  }, [pathname])

  useEffect(() => {
    if (!isArticlePage && (isMainPage || isGuidesPage)) {
      if (searchQuery) {
        handleSearch(searchQuery)
      } else {
        loadArticles()
      }
    }
  }, [searchQuery, selectedCategory, pathname])

  const loadData = async () => {
    setLoading(true)
    try {
      const [categoriesResult, featuredResult, articlesResult] = await Promise.all([
        getHelpCategories(),
        getFeaturedArticles(5),
        getHelpArticles({ limit: 20 })
      ])

      if (categoriesResult.success) {
        setCategories(categoriesResult.data)
      }
      if (featuredResult.success) {
        setFeaturedArticles(featuredResult.data)
      }
      if (articlesResult.success) {
        setArticles(articlesResult.data)
      }
    } catch (error) {
      console.error('Error loading help data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadArticles = async () => {
    setLoading(true)
    try {
      const result = await getHelpArticles({
        category_id: selectedCategory,
        limit: 20
      })

      if (result.success) {
        setArticles(result.data)
      }
    } catch (error) {
      console.error('Error loading articles:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = async (query) => {
    if (!query) {
      loadArticles()
      return
    }

    setLoading(true)
    try {
      const result = await searchHelpArticles(query, {
        category_id: selectedCategory,
        limit: 20
      })

      if (result.success) {
        setArticles(result.data)
      }
    } catch (error) {
      console.error('Error searching articles:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadArticle = async (slug) => {
    setLoading(true)
    try {
      const result = await getHelpArticle(slug)
      if (result.success) {
        setArticle(result.data)
      }
    } catch (error) {
      console.error('Error loading article:', error)
    } finally {
      setLoading(false)
    }
  }

  // Article detail view
  if (isArticlePage) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <button
            onClick={() => navigate('/help')}
            className="mb-6 text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-2"
          >
            ← Back to Help Center
          </button>
          
          {loading ? (
            <div className="text-center py-8">
              <p className="text-gray-600 dark:text-gray-400">Loading article...</p>
            </div>
          ) : article ? (
            <article className="bg-white dark:bg-gray-800 rounded-lg shadow p-8">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                {article.title}
              </h1>
              {article.help_categories && (
                <div className="mb-4">
                  <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded-full text-sm">
                    {article.help_categories.category_name}
                  </span>
                </div>
              )}
              <div 
                className="prose prose-lg dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: article.content }}
              />
            </article>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-600 dark:text-gray-400">Article not found.</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  // FAQ view
  if (isFAQPage) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <FAQ />
        </div>
      </div>
    )
  }

  // Knowledge Base / Guides view
  if (isGuidesPage) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <KnowledgeBase />
        </div>
      </div>
    )
  }

  // Contact view
  if (isContactPage) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Contact Support
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Get help from our support team
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8">
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              For support, please submit feedback through the Help button in the application or contact your administrator.
            </p>
            <Button onClick={() => navigate('/help')}>
              Back to Help Center
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Tutorials view (placeholder)
  if (isTutorialsPage) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Video Tutorials
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Watch video guides and tutorials
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
            <Video className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Video tutorials are coming soon. In the meantime, check out our help articles and guides.
            </p>
            <Button onClick={() => navigate('/help')}>
              Browse Help Articles
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Main Help Center view
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Help Center
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Find answers, guides, and tutorials
          </p>
        </div>

        {/* Search */}
        <div className="mb-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Search for help articles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-3 w-full"
            />
          </div>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <button
            onClick={() => navigate('/help/tutorials')}
            className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-shadow text-left"
          >
            <Video className="h-8 w-8 text-blue-600 dark:text-blue-400 mb-3" />
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Video Tutorials</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Watch video guides</p>
          </button>

          <button
            onClick={() => navigate('/help/guides')}
            className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-shadow text-left"
          >
            <FileText className="h-8 w-8 text-green-600 dark:text-green-400 mb-3" />
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">User Guides</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Comprehensive documentation</p>
          </button>

          <button
            onClick={() => navigate('/help/faq')}
            className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-shadow text-left"
          >
            <MessageCircle className="h-8 w-8 text-purple-600 dark:text-purple-400 mb-3" />
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">FAQ</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Frequently asked questions</p>
          </button>

          <button
            onClick={() => navigate('/help/contact')}
            className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-shadow text-left"
          >
            <HelpCircle className="h-8 w-8 text-orange-600 dark:text-orange-400 mb-3" />
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Contact Support</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Get help from our team</p>
          </button>
        </div>

        {/* Categories */}
        {categories.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Categories</h2>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-4 py-2 rounded-lg ${
                  selectedCategory === null
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                All
              </button>
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`px-4 py-2 rounded-lg ${
                    selectedCategory === category.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  {category.category_name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Featured Articles */}
        {featuredArticles.length > 0 && !searchQuery && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Featured Articles</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {featuredArticles.map((article) => (
                <button
                  key={article.id}
                  onClick={() => navigate(`/help/article/${article.slug}`)}
                  className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-shadow text-left"
                >
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{article.title}</h3>
                  {article.excerpt && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                      {article.excerpt}
                    </p>
                  )}
                  <div className="flex items-center text-blue-600 dark:text-blue-400 text-sm">
                    Read more <ChevronRight className="h-4 w-4 ml-1" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Articles List */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            {searchQuery ? `Search Results for "${searchQuery}"` : 'All Articles'}
          </h2>
          {loading ? (
            <div className="text-center py-8">
              <p className="text-gray-600 dark:text-gray-400">Loading articles...</p>
            </div>
          ) : articles.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600 dark:text-gray-400">No articles found.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {articles.map((article) => (
                <button
                  key={article.id}
                  onClick={() => navigate(`/help/article/${article.slug}`)}
                  className="w-full p-6 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-shadow text-left"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{article.title}</h3>
                      {article.excerpt && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                          {article.excerpt}
                        </p>
                      )}
                      {article.help_categories && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                            {article.help_categories.category_name}
                          </span>
                        </div>
                      )}
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-400 ml-4 flex-shrink-0" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


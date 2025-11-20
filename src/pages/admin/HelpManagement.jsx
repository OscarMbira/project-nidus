import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, Plus, Edit, Trash2, Eye, BarChart3, MessageSquare, FileText, Settings } from 'lucide-react'
import { getHelpArticles, getHelpCategories, getGuidedTour, getGuidedToursForPage } from '../../services/helpService'
import { getFeedback } from '../../services/feedbackService'
import { useToastContext } from '../../context/ToastContext'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Loading } from '../../components/ui/Loading'
import { EmptyState } from '../../components/ui/EmptyState'
import { supabase } from '../../services/supabaseClient'

export default function HelpManagement() {
  const [activeTab, setActiveTab] = useState('articles') // articles, categories, tours, feedback
  const [articles, setArticles] = useState([])
  const [categories, setCategories] = useState([])
  const [tours, setTours] = useState([])
  const [feedback, setFeedback] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState(null)
  const navigate = useNavigate()
  const toast = useToastContext()

  useEffect(() => {
    loadData()
  }, [activeTab])

  useEffect(() => {
    if (activeTab === 'articles') {
      loadArticles()
    }
  }, [searchQuery, selectedCategory, activeTab])

  const loadData = async () => {
    setLoading(true)
    try {
      switch (activeTab) {
        case 'articles':
          await loadArticles()
          await loadCategories()
          break
        case 'categories':
          await loadCategories()
          break
        case 'tours':
          await loadTours()
          break
        case 'feedback':
          await loadFeedback()
          break
      }
    } catch (error) {
      console.error('Error loading data:', error)
      if (toast) {
        toast.error('Failed to load data')
      }
    } finally {
      setLoading(false)
    }
  }

  const loadArticles = async () => {
    try {
      const result = await getHelpArticles({
        category_id: selectedCategory,
        search: searchQuery,
        limit: 50
      })
      if (result.success) {
        setArticles(result.data || [])
      }
    } catch (error) {
      console.error('Error loading articles:', error)
    }
  }

  const loadCategories = async () => {
    try {
      const result = await getHelpCategories()
      if (result.success) {
        setCategories(result.data || [])
      }
    } catch (error) {
      console.error('Error loading categories:', error)
    }
  }

  const loadTours = async () => {
    try {
      const result = await getGuidedToursForPage(null, null)
      if (result.success) {
        setTours(result.data || [])
      }
    } catch (error) {
      console.error('Error loading tours:', error)
    }
  }

  const loadFeedback = async () => {
    try {
      const result = await getFeedback({ limit: 50 })
      if (result.success) {
        setFeedback(result.data || [])
      }
    } catch (error) {
      console.error('Error loading feedback:', error)
    }
  }

  const handleDeleteArticle = async (articleId) => {
    if (!confirm('Are you sure you want to delete this article?')) return

    try {
      const { error } = await supabase
        .from('help_articles')
        .update({ is_deleted: true, deleted_at: new Date().toISOString() })
        .eq('id', articleId)

      if (error) throw error

      if (toast) {
        toast.success('Article deleted successfully')
      }
      loadArticles()
    } catch (error) {
      console.error('Error deleting article:', error)
      if (toast) {
        toast.error('Failed to delete article')
      }
    }
  }

  const handleDeleteCategory = async (categoryId) => {
    if (!confirm('Are you sure you want to delete this category?')) return

    try {
      const { error } = await supabase
        .from('help_categories')
        .update({ is_deleted: true, deleted_at: new Date().toISOString() })
        .eq('id', categoryId)

      if (error) throw error

      if (toast) {
        toast.success('Category deleted successfully')
      }
      loadCategories()
    } catch (error) {
      console.error('Error deleting category:', error)
      if (toast) {
        toast.error('Failed to delete category')
      }
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Help Management
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Manage help articles, categories, tours, and feedback
              </p>
            </div>
            <Button
              onClick={() => navigate('/admin/help/article/new')}
              variant="default"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Article
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-8" aria-label="Tabs">
            {[
              { id: 'articles', label: 'Articles', icon: FileText, count: articles.length },
              { id: 'categories', label: 'Categories', icon: BookOpen, count: categories.length },
              { id: 'tours', label: 'Guided Tours', icon: Settings, count: tours.length },
              { id: 'feedback', label: 'Feedback', icon: MessageSquare, count: feedback.length },
            ].map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors
                    ${activeTab === tab.id
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                    }
                  `}
                  aria-current={activeTab === tab.id ? 'page' : undefined}
                >
                  <Icon className="h-5 w-5" />
                  {tab.label}
                  {tab.count > 0 && (
                    <span className={`ml-2 py-0.5 px-2 rounded-full text-xs ${
                      activeTab === tab.id
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              )
            })}
          </nav>
        </div>

        {/* Articles Tab */}
        {activeTab === 'articles' && (
          <div>
            {/* Filters */}
            <div className="mb-6 flex gap-4">
              <div className="flex-1">
                <Input
                  type="text"
                  placeholder="Search articles..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="w-64">
                <Select
                  label="Category"
                  value={selectedCategory || ''}
                  onChange={(e) => setSelectedCategory(e.target.value || null)}
                  placeholder="All categories"
                >
                  <option value="">All categories</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.category_name}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            {loading ? (
              <Loading text="Loading articles..." />
            ) : articles.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="No articles found"
                description={searchQuery ? `No articles match "${searchQuery}"` : 'Create your first help article'}
                action={() => navigate('/admin/help/article/new')}
                actionLabel="Create Article"
              />
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Title
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Views
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Created
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {articles.map((article) => (
                      <tr key={article.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {article.title}
                          </div>
                          {article.excerpt && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">
                              {article.excerpt}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {article.help_categories && (
                            <span className="px-2 py-1 text-xs rounded bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200">
                              {article.help_categories.category_name}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          <div className="flex items-center gap-1">
                            <Eye className="h-4 w-4" />
                            {article.view_count || 0}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {article.is_published ? (
                            <span className="px-2 py-1 text-xs rounded bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200">
                              Published
                            </span>
                          ) : (
                            <span className="px-2 py-1 text-xs rounded bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                              Draft
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {formatDate(article.created_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => navigate(`/help/article/${article.slug}`)}
                              className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300"
                              aria-label="View article"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => navigate(`/admin/help/article/${article.id}/edit`)}
                              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                              aria-label="Edit article"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteArticle(article.id)}
                              className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                              aria-label="Delete article"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Categories Tab */}
        {activeTab === 'categories' && (
          <div>
            {loading ? (
              <Loading text="Loading categories..." />
            ) : categories.length === 0 ? (
              <EmptyState
                icon={BookOpen}
                title="No categories found"
                description="Create your first category"
                action={() => navigate('/admin/help/category/new')}
                actionLabel="Create Category"
              />
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Description
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Sort Order
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {categories.map((category) => (
                      <tr key={category.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {category.category_name}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {category.description || '-'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {category.sort_order}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => navigate(`/admin/help/category/${category.id}/edit`)}
                              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                              aria-label="Edit category"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteCategory(category.id)}
                              className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                              aria-label="Delete category"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tours Tab */}
        {activeTab === 'tours' && (
          <div>
            {loading ? (
              <Loading text="Loading tours..." />
            ) : tours.length === 0 ? (
              <EmptyState
                icon={Settings}
                title="No guided tours found"
                description="Create your first guided tour"
                action={() => navigate('/admin/help/tour/new')}
                actionLabel="Create Tour"
              />
            ) : (
              <div className="space-y-4">
                {tours.map((tour) => (
                  <div
                    key={tour.id}
                    className="p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                          {tour.tour_name}
                        </h3>
                        {tour.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                            {tour.description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                          <span>Key: {tour.tour_key}</span>
                          <span>Page: {tour.target_page || 'All'}</span>
                          <span>Role: {tour.target_role || 'All'}</span>
                          <span>Steps: {tour.steps?.length || 0}</span>
                          {tour.is_active ? (
                            <span className="px-2 py-1 rounded bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200">
                              Active
                            </span>
                          ) : (
                            <span className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                              Inactive
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => navigate(`/admin/help/tour/${tour.id}/edit`)}
                          className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                          aria-label="Edit tour"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Feedback Tab */}
        {activeTab === 'feedback' && (
          <div>
            {loading ? (
              <Loading text="Loading feedback..." />
            ) : feedback.length === 0 ? (
              <EmptyState
                icon={MessageSquare}
                title="No feedback found"
                description="User feedback will appear here"
              />
            ) : (
              <div className="space-y-4">
                {feedback.map((item) => (
                  <div
                    key={item.id}
                    className="p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className={`px-2 py-1 text-xs rounded ${
                            item.feedback_type === 'bug_report' ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200' :
                            item.feedback_type === 'feature_request' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200' :
                            item.feedback_type === 'rating' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200' :
                            'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                          }`}>
                            {item.feedback_type}
                          </span>
                          <span className={`px-2 py-1 text-xs rounded ${
                            item.status === 'new' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200' :
                            item.status === 'resolved' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200' :
                            'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                          }`}>
                            {item.status}
                          </span>
                          {item.rating && (
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              ⭐ {item.rating}/5
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-900 dark:text-white mb-2">
                          {item.feedback_text}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                          {item.users && (
                            <span>By: {item.users.full_name || item.users.email}</span>
                          )}
                          <span>{formatDate(item.created_at)}</span>
                          {item.page_url && (
                            <a
                              href={item.page_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 dark:text-blue-400 hover:underline"
                            >
                              View page
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}


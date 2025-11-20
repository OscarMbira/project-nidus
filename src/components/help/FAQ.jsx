import { useState, useEffect } from 'react'
import { MessageCircle, ChevronDown, ChevronUp, Search, HelpCircle } from 'lucide-react'
import { getHelpArticles, getHelpCategories, searchHelpArticles } from '../../services/helpService'
import { Input } from '../ui/Input'
import { Loading } from '../ui/Loading'
import { EmptyState } from '../ui/EmptyState'

export default function FAQ({ category = 'faq' }) {
  const [faqs, setFaqs] = useState([])
  const [categories, setCategories] = useState([])
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedItems, setExpandedItems] = useState(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadFAQs()
    loadCategories()
  }, [selectedCategory])

  useEffect(() => {
    if (searchQuery) {
      searchFAQs()
    } else {
      loadFAQs()
    }
  }, [searchQuery])

  const loadCategories = async () => {
    try {
      const result = await getHelpCategories()
      if (result.success) {
        setCategories(result.data)
      }
    } catch (error) {
      console.error('Error loading categories:', error)
    }
  }

  const loadFAQs = async () => {
    setLoading(true)
    try {
      const result = await getHelpArticles({
        category_id: selectedCategory,
        tags: category === 'faq' ? ['faq'] : undefined,
        limit: 100
      })

      if (result.success) {
        setFaqs(result.data || [])
      }
    } catch (error) {
      console.error('Error loading FAQs:', error)
    } finally {
      setLoading(false)
    }
  }

  const searchFAQs = async () => {
    setLoading(true)
    try {
      const result = await searchHelpArticles(searchQuery, {
        category_id: selectedCategory,
        tags: category === 'faq' ? ['faq'] : undefined,
        limit: 100
      })

      if (result.success) {
        setFaqs(result.data || [])
      }
    } catch (error) {
      console.error('Error searching FAQs:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleExpand = (faqId) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev)
      if (newSet.has(faqId)) {
        newSet.delete(faqId)
      } else {
        newSet.add(faqId)
      }
      return newSet
    })
  }

  // Extract FAQ format from content (Q&A pairs)
  const parseFAQContent = (content) => {
    // If content already has Q&A structure, return as is
    if (content.includes('<strong>Q:') || content.includes('**Q:')) {
      return content
    }
    
    // Otherwise, treat entire content as answer
    return content
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <MessageCircle className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Frequently Asked Questions</h1>
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          Find answers to common questions
        </p>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            type="text"
            placeholder="Search FAQs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Categories */}
      {categories.length > 0 && (
        <div className="mb-6">
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
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedCategory === cat.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                {cat.category_name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* FAQs List */}
      {loading ? (
        <Loading text="Loading FAQs..." />
      ) : faqs.length === 0 ? (
        <EmptyState
          icon={HelpCircle}
          title={searchQuery ? 'No FAQs found' : 'No FAQs available'}
          description={searchQuery 
            ? `No FAQs match "${searchQuery}". Try a different search term.`
            : 'There are no FAQs available yet.'}
        />
      ) : (
        <div className="space-y-3">
          {faqs.map((faq) => {
            const isExpanded = expandedItems.has(faq.id)
            const content = parseFAQContent(faq.content)

            return (
              <div
                key={faq.id}
                className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
              >
                <button
                  onClick={() => toggleExpand(faq.id)}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset"
                  aria-expanded={isExpanded}
                  aria-controls={`faq-content-${faq.id}`}
                >
                  <h3 className="font-semibold text-gray-900 dark:text-white pr-4">
                    {faq.title}
                  </h3>
                  {isExpanded ? (
                    <ChevronUp className="h-5 w-5 text-gray-400 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-gray-400 flex-shrink-0" />
                  )}
                </button>
                
                {isExpanded && (
                  <div
                    id={`faq-content-${faq.id}`}
                    className="px-4 pb-4 text-gray-600 dark:text-gray-400 prose prose-sm dark:prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ __html: content }}
                  />
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Help Text */}
      {!loading && faqs.length > 0 && (
        <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>Still have questions?</strong> Check out our{' '}
            <a href="/help" className="underline hover:text-blue-900 dark:hover:text-blue-100">
              Help Center
            </a>
            {' '}or{' '}
            <a href="/help/contact" className="underline hover:text-blue-900 dark:hover:text-blue-100">
              contact support
            </a>
            .
          </p>
        </div>
      )}
    </div>
  )
}


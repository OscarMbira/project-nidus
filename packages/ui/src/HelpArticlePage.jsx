/**
 * Help article page (v1345 PD4) — routed at help/articles/:slug in Platform and Simulator.
 * Reached from a field-help "Learn more" link, usually in a new tab, so the back control falls
 * back to the app's home page when there is no history (rule 73). No sidebar menu item.
 * Article text is shown as plain text (paragraphs and "- " bullets), never as HTML (G-D12).
 */
import { useContext, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import AppConfigContext from '@nidus/shared/context/AppConfigContext'
import { getPublishedHelpArticle } from '@nidus/shared/services/helpArticleReaderService'
import { parseFieldHelpText } from '@nidus/shared/utils/fieldHelp'

const HOME_BY_APP = { platform: '/platform/dashboard', simulator: '/simulator', planner: '/app' }

export default function HelpArticlePage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const appConfig = useContext(AppConfigContext)
  const [state, setState] = useState({ slug: null, article: null, error: null })

  useEffect(() => {
    let cancelled = false
    getPublishedHelpArticle(slug).then((result) => {
      if (!cancelled) setState({ slug, article: result.success ? result.data : null, error: result.success ? null : result.error })
    })
    return () => { cancelled = true }
  }, [slug])

  const goBack = () => {
    if (window.history.length > 1) navigate(-1)
    else navigate(HOME_BY_APP[appConfig?.app] || '/')
  }

  const loading = state.slug !== slug
  const blocks = state.article ? parseFieldHelpText(state.article.content) : []

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button
        type="button"
        onClick={goBack}
        className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 flex items-center gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>
      {loading ? (
        <p className="py-12 text-center text-gray-500 dark:text-gray-400">Loading…</p>
      ) : !state.article ? (
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Article not found</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">This help article does not exist or is no longer published.</p>
        </div>
      ) : (
        <article className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 space-y-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{state.article.title}</h1>
          {state.article.excerpt && <p className="text-gray-600 dark:text-gray-400">{state.article.excerpt}</p>}
          <div className="space-y-3 text-gray-800 dark:text-gray-200">
            {blocks.map((block, i) => (block.type === 'ul'
              ? <ul key={i} className="list-disc pl-6 space-y-1">{block.items.map((item, j) => <li key={j}>{item}</li>)}</ul>
              : <p key={i}>{block.text}</p>))}
          </div>
        </article>
      )}
    </div>
  )
}

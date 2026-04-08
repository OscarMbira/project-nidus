import { useLocation } from 'react-router-dom'

// Phase 5.3: 7 pages from plan + programme/tasks; plan wording first
const PAGE_QUESTIONS = {
  '/platform/dashboard':   ['What needs my attention today?', 'Summarise my portfolio health', 'Show my open risks and issues', 'How do I create a mandate?', 'What is the approval process?'],
  '/platform/risks':      ['Show me all high-severity open risks', 'Which risks have no mitigation plan?', 'List risks with no owner assigned', 'How do I add a risk mitigation?'],
  '/platform/issues':      ['List unresolved issues older than 14 days', 'Who owns the most open issues?', 'Show all critical issues', 'How do I log an issue?'],
  '/platform/mandates':    ['Which mandates are pending approval?', 'Summarise this project\'s mandate', 'Show mandates submitted this month', 'How do I create a mandate?'],
  '/platform/stakeholders': ['Who are my high-influence stakeholders?', 'Who has low engagement?', 'Show my stakeholder register', 'How do I add a stakeholder?'],
  '/platform/quality':     ['Are there overdue quality reviews?', 'Summarise the quality register', 'List quality items not yet approved', 'What fields are on the quality register?'],
  '/platform/portfolio':   ['What is my overall portfolio status?', 'Which programmes are behind?', 'Which portfolios are active?', 'How do I create a portfolio?'],
  '/platform/programme':   ['Which programmes are behind schedule?', 'Show programme benefit status', 'How do I set up a programme?'],
  '/platform/tasks':       ['Show overdue tasks', 'Which tasks are in progress?', 'List tasks due this week', 'How do I create a task?'],
}

const GLOBAL_DOCS_QUESTIONS = ['How do I create a mandate?', 'What is the approval process?', 'How do I submit a mandate for approval?', 'Where is the user guide?']

export default function AISuggestedQuestions({ onSelect }) {
  const { pathname } = useLocation()

  // Match by prefix; merge page-specific with global docs questions (Phase 1.5)
  const key = Object.keys(PAGE_QUESTIONS).find((k) => pathname.startsWith(k))
  const pageQs = key ? PAGE_QUESTIONS[key] : PAGE_QUESTIONS['/platform/dashboard']
  const questions = [...pageQs, ...GLOBAL_DOCS_QUESTIONS.filter((q) => !pageQs.includes(q))].slice(0, 8)

  return (
    <div className="px-3 py-2">
      <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">Suggested questions</p>
      <div className="flex flex-wrap gap-1">
        {questions.map((q) => (
          <button
            key={q}
            onClick={() => onSelect(q)}
            className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-blue-900 hover:text-blue-700 dark:hover:text-blue-300 transition-colors text-left"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  )
}

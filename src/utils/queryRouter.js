/**
 * queryRouter.js
 * Classifies a user question as 'data' | 'docs' | 'external'.
 * Priority: data > docs > generic (external).
 */

// Keywords that indicate the user is asking about their own project data
const DATA_KEYWORDS = [
  'my ', 'our ', 'show me', 'show my', 'show our',
  'list ', 'list my', 'how many', 'which ', 'what are my',
  'open ', 'pending ', 'overdue ', 'unresolved', 'assigned',
  'status of', 'status for', 'summary of', 'summarise', 'summarize',
  'who owns', 'who is', 'project ', 'projects ',
  'risk', 'risks', 'issue', 'issues', 'mandate', 'mandates',
  'stakeholder', 'stakeholders', 'portfolio', 'portfolios',
  'programme', 'programs', 'program',
  'quality', 'benefit', 'benefits', 'task', 'tasks',
  'milestone', 'milestones', 'budget', 'cost', 'resource',
  'highlight report', 'exception report', 'checkpoint',
  'daily log', 'lessons', 'work package',
]

// Keywords that indicate a docs/system-knowledge question (Phase 1.5)
const DOCS_KEYWORDS = [
  'how do i', 'how do i ', 'how does ', 'how to ', 'how can i',
  'what fields', 'where is ', 'what is the process', 'what is the procedure',
  'guide', 'help with', 'instructions', 'steps to', 'walk me through',
  'user guide', 'documentation', 'set up', 'setup', 'configure',
]

// Keywords that indicate a purely generic PM knowledge question (no data, no docs)
const GENERIC_KEYWORDS = [
  'what is ', 'what are ', 'what does ',
  'explain ', 'define ', 'definition of',
  'best practice', 'best practices',
  'when should', 'why do we', 'why is ',
  'difference between', 'compare ',
  'tell me about',
  'describe ', 'overview of',
  'methodology', 'framework',
]

/**
 * Classify a question and return which AI engine to use.
 * Priority: data > docs > generic.
 * @param {string} question
 * @returns {{ engine: 'data' | 'docs' | 'external', reason: string }}
 */
export function classifyQuery(question) {
  if (!question || typeof question !== 'string') {
    return { engine: 'data', reason: 'default' }
  }

  const q = question.toLowerCase().trim()

  const isData = DATA_KEYWORDS.some((kw) => q.includes(kw))
  const isDocs = DOCS_KEYWORDS.some((kw) => q.includes(kw))
  const isGeneric = GENERIC_KEYWORDS.some((kw) => q.includes(kw))

  if (isData) return { engine: 'data', reason: 'data_query' }
  if (isDocs) return { engine: 'docs', reason: 'docs_query' }
  if (isGeneric) return { engine: 'external', reason: 'generic_knowledge' }

  return { engine: 'data', reason: 'default' }
}

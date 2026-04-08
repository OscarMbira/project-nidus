/**
 * intentDetector.js
 * Maps a user question to one or more DB modules so contextFetcher
 * knows which tables to query for relevant data.
 */

const MODULE_KEYWORDS = {
  risks: [
    'risk', 'risks', 'threat', 'threats', 'mitigation',
    'probability', 'impact', 'risk owner', 'risk register',
  ],
  issues: [
    'issue', 'issues', 'problem', 'problems', 'unresolved',
    'open issue', 'issue register', 'issue owner',
  ],
  mandates: [
    'mandate', 'mandates', 'project mandate', 'approval',
    'pending approval', 'approve', 'authorise', 'authorize',
  ],
  stakeholders: [
    'stakeholder', 'stakeholders', 'engagement', 'interest',
    'influence', 'power', 'salience', 'communication plan',
    'identification source', 'identification date',
  ],
  portfolio: [
    'portfolio', 'portfolios', 'portfolio health',
    'portfolio status', 'sub-portfolio',
  ],
  programme: [
    'programme', 'program', 'programs', 'programmes',
    'programme manager', 'benefits realisation',
  ],
  quality: [
    'quality', 'inspection', 'review', 'quality register',
    'quality plan', 'qms', 'quality management',
  ],
  benefits: [
    'benefit', 'benefits', 'benefit review', 'measurement',
    'benefit realisation', 'benefits register',
  ],
  projects: [
    'project', 'projects', 'project status', 'project health',
    'project list', 'active project', 'project overview',
  ],
  tasks: [
    'task', 'tasks', 'milestone', 'milestones', 'due date',
    'overdue task', 'task status', 'to-do',
  ],
  documentation: [
    'how do i', 'how to', 'how can i', 'how does',
    'guide', 'tutorial', 'learn', 'show me how',
    'steps to', 'step by step', 'walk me through',
    'what is the process', 'what is the procedure',
    'explain how', 'help me', 'instructions',
    'getting started', 'user guide', 'documentation',
    'set up', 'setup', 'configure', 'workflow',
  ],
  // Phase 1.5: docs engine (system documentation index)
  docs: [
    'how do i', 'how to', 'how does', 'what fields', 'where is',
    'what is the process', 'guide', 'help with', 'instructions',
    'user guide', 'documentation', 'set up', 'setup', 'configure',
  ],
}

/**
 * Detect which DB modules a question relates to.
 * @param {string} question
 * @returns {string[]} Array of module names e.g. ['risks', 'issues']
 */
export function detectModules(question) {
  if (!question) return []

  const q = question.toLowerCase()
  const detected = []

  for (const [module, keywords] of Object.entries(MODULE_KEYWORDS)) {
    if (keywords.some((kw) => q.includes(kw))) {
      detected.push(module)
    }
  }

  return detected
}

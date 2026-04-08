/**
 * dataAnswerTemplates.js
 * Builds template answer strings for data queries (template mode — no external API).
 * Used when ai_settings.data_answer_mode === 'template'.
 */

/**
 * Human-readable module labels for template text.
 */
const MODULE_LABELS = {
  risks: 'risk',
  issues: 'issue',
  mandates: 'mandate',
  projects: 'project',
  stakeholders: 'stakeholder',
  portfolio: 'portfolio',
  programme: 'programme',
  quality: 'quality item',
  benefits: 'benefit',
  tasks: 'task',
  documentation: 'documentation',
}

/**
 * Build a short template answer from detected modules and structured row counts.
 * @param {string[]} modules - Detected module names (e.g. ['risks', 'issues'])
 * @param {Record<string, unknown[]>} structured - { risks: [...], issues: [...] }
 * @returns {string} One sentence, e.g. "Found 3 risks and 2 issues. See details below."
 */
export function buildTemplateAnswer(modules, structured = {}) {
  if (!modules || modules.length === 0) {
    return 'No matching data found. Try asking about risks, issues, mandates, projects, or other modules.'
  }

  const parts = []
  let totalRows = 0

  for (const mod of modules) {
    if (mod === 'documentation') continue
    const rows = structured[mod]
    const count = Array.isArray(rows) ? rows.length : 0
    if (count > 0) {
      const label = MODULE_LABELS[mod] || mod
      const noun = count === 1 ? label : `${label}s`
      parts.push(`${count} ${noun}`)
      totalRows += count
    }
  }

  if (totalRows === 0) {
    return 'No matching records found in your data. Try a different question or check your project selection.'
  }

  const summary = parts.join(', ')
  return `Found ${summary}. See details below.`
}

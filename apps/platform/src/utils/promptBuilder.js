/**
 * promptBuilder.js
 * Assembles the system prompt for Ollama (data queries).
 * Gemini queries do NOT use this — they receive the question directly.
 */

/**
 * Build the Ollama message array for a data-aware query.
 * @param {string} question - The user's question
 * @param {string} contextData - DB data fetched by contextFetcher
 * @param {Object} userInfo - { userName, orgName, role }
 * @param {Array} history - Last N messages [{role, content}]
 * @returns {Array} Ollama messages array
 */
export function buildOllamaMessages(question, contextData, userInfo = {}, history = []) {
  const { userName = 'User', orgName = 'Organisation', role = 'Project Manager' } = userInfo
  const today = new Date().toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  const maxContextChars = 4000
  const trimmedContext = contextData && contextData.length > maxContextChars
    ? contextData.slice(0, maxContextChars) + '\n… (truncated)'
    : contextData
  const hasData = trimmedContext && trimmedContext.trim().length > 0

  const systemContent = hasData
    ? `You are an AI assistant for Project Nidus, a professional project management platform.
You are assisting ${userName} (${role}) at ${orgName}.
Today's date is ${today}.

The following is live data from their project management system:
─────────────────────────────────────────────
${trimmedContext}
─────────────────────────────────────────────
Answer using ONLY the data provided above. Be concise, specific, and professional.
Do not invent or assume any information not present in the data.
If the data does not contain the answer, say so clearly.`
    : `You are an AI assistant for Project Nidus, a professional project management platform.
You are assisting ${userName} (${role}) at ${orgName}.
Today's date is ${today}.
Answer based on project management best practices. Be concise and professional.`

  const messages = [
    { role: 'system', content: systemContent },
    // Last 5 exchanges for context — keeps prompt smaller for faster first token
    ...history.slice(-5),
    { role: 'user', content: question },
  ]

  return messages
}

/**
 * v1272 — Agent tool loop (pure; the model call and tool execution are injected).
 *
 * Uses the stable Messages API (`client.messages.create`) in a manual loop rather than the beta
 * tool runner, so every step can be audited (agent_steps), every tool call checked, and progress
 * streamed to the browser. Tool results for one model turn go back in ONE user message
 * (keeps parallel tool use working). Assistant content is appended unchanged, so thinking blocks
 * are passed back as the API requires.
 */

import { addUsage } from './credits.js'

/**
 * @param {object} args
 * @param {(params: object) => Promise<object>} args.createMessage  e.g. (p) => client.messages.create(p)
 * @param {object} args.params        model, system, max_tokens, output_config, tools …
 * @param {Array}  args.messages      starting conversation (Anthropic MessageParam[])
 * @param {(name: string, input: object, toolUseId: string) => Promise<{content: any, isError?: boolean, data?: any}>} args.executeTool
 * @param {number} [args.maxIterations=8]
 * @param {(event: object) => void} [args.onEvent]   { type: 'tool_start'|'tool_end'|'model', … }
 * @returns {Promise<{ text: string, stopReason: string, usage: object, steps: Array, messages: Array, iterations: number }>}
 */
export async function runAgentLoop({ createMessage, params, messages, executeTool, maxIterations = 8, onEvent = () => {} }) {
  const convo = [...messages]
  const steps = []
  let usage = {}
  let iterations = 0
  let last = null

  while (iterations < maxIterations) {
    iterations += 1
    const started = Date.now()
    const response = await createMessage({ ...params, messages: convo })
    last = response
    usage = addUsage(usage, response.usage)
    steps.push({
      step_type: 'model',
      input_tokens: response.usage?.input_tokens || 0,
      output_tokens: response.usage?.output_tokens || 0,
      duration_ms: Date.now() - started,
      stop_reason: response.stop_reason,
    })
    onEvent({ type: 'model', stopReason: response.stop_reason })

    if (response.stop_reason === 'pause_turn') {
      convo.push({ role: 'assistant', content: response.content })
      continue
    }
    if (response.stop_reason !== 'tool_use') break

    const toolUses = (response.content || []).filter((b) => b.type === 'tool_use')
    if (toolUses.length === 0) break
    convo.push({ role: 'assistant', content: response.content })

    const results = []
    for (const tu of toolUses) {
      const t0 = Date.now()
      onEvent({ type: 'tool_start', name: tu.name, input: tu.input })
      let out
      try {
        out = await executeTool(tu.name, tu.input || {}, tu.id)
      } catch (err) {
        out = { content: `Tool error: ${err?.message || String(err)}`, isError: true }
      }
      const content = typeof out.content === 'string' ? out.content : JSON.stringify(out.content)
      results.push({ type: 'tool_result', tool_use_id: tu.id, content, ...(out.isError ? { is_error: true } : {}) })
      steps.push({
        step_type: 'tool',
        tool_name: tu.name,
        tool_input: tu.input || {},
        tool_output_summary: out.summary ?? null,
        is_error: Boolean(out.isError),
        duration_ms: Date.now() - t0,
      })
      onEvent({ type: 'tool_end', name: tu.name, isError: Boolean(out.isError), data: out.data })
    }
    convo.push({ role: 'user', content: results })
  }

  let stopReason = last?.stop_reason || 'none'
  if (last?.stop_reason === 'tool_use') {
    // Iteration cap reached with tool results pending: one last turn without tools to answer.
    const started = Date.now()
    const response = await createMessage({ ...params, messages: convo, tool_choice: { type: 'none' } })
    last = response
    usage = addUsage(usage, response.usage)
    steps.push({
      step_type: 'model',
      input_tokens: response.usage?.input_tokens || 0,
      output_tokens: response.usage?.output_tokens || 0,
      duration_ms: Date.now() - started,
      stop_reason: response.stop_reason,
    })
    stopReason = 'max_iterations'
  }

  const text = (last?.content || [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim()
  return { text, stopReason, usage, steps, messages: convo, iterations }
}

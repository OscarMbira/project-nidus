import { describe, expect, it, vi } from 'vitest'
import { runAgentLoop } from '../agentLoop.js'

function msg(stop_reason, content, usage = { input_tokens: 10, output_tokens: 5 }) {
  return { stop_reason, content, usage }
}

describe('runAgentLoop', () => {
  it('returns the text of a direct answer', async () => {
    const createMessage = vi.fn().mockResolvedValue(msg('end_turn', [{ type: 'text', text: 'Hello' }]))
    const out = await runAgentLoop({ createMessage, params: {}, messages: [{ role: 'user', content: 'hi' }], executeTool: vi.fn() })
    expect(out.text).toBe('Hello')
    expect(out.iterations).toBe(1)
    expect(createMessage).toHaveBeenCalledTimes(1)
  })

  it('runs tools and sends all results back in one user message', async () => {
    const createMessage = vi.fn()
      .mockResolvedValueOnce(msg('tool_use', [
        { type: 'thinking', thinking: '' },
        { type: 'tool_use', id: 't1', name: 'query_records', input: { entity: 'risks' } },
        { type: 'tool_use', id: 't2', name: 'query_records', input: { entity: 'issues' } },
      ]))
      .mockResolvedValueOnce(msg('end_turn', [{ type: 'text', text: 'There are 3 risks and 2 issues.' }]))
    const executeTool = vi.fn(async (name, input) => ({ content: { n: input.entity === 'risks' ? 3 : 2 }, data: { kind: 'table' } }))
    const events = []
    const out = await runAgentLoop({ createMessage, params: { model: 'm' }, messages: [{ role: 'user', content: 'q' }], executeTool, onEvent: (e) => events.push(e.type) })

    expect(out.text).toBe('There are 3 risks and 2 issues.')
    expect(executeTool).toHaveBeenCalledTimes(2)
    const second = createMessage.mock.calls[1][0].messages
    expect(second).toHaveLength(3)
    expect(second[1].role).toBe('assistant')
    expect(second[1].content[0].type).toBe('thinking') // assistant content passed back unchanged
    expect(second[2].role).toBe('user')
    expect(second[2].content.map((b) => b.tool_use_id)).toEqual(['t1', 't2'])
    expect(out.steps.filter((s) => s.step_type === 'tool')).toHaveLength(2)
    expect(out.usage.input_tokens).toBe(20)
    expect(events).toContain('tool_start')
  })

  it('marks failed tools as errors instead of stopping', async () => {
    const createMessage = vi.fn()
      .mockResolvedValueOnce(msg('tool_use', [{ type: 'tool_use', id: 't1', name: 'x', input: {} }]))
      .mockResolvedValueOnce(msg('end_turn', [{ type: 'text', text: 'ok' }]))
    const executeTool = vi.fn().mockRejectedValue(new Error('boom'))
    const out = await runAgentLoop({ createMessage, params: {}, messages: [], executeTool })
    const results = createMessage.mock.calls[1][0].messages.at(-1).content
    expect(results[0].is_error).toBe(true)
    expect(results[0].content).toMatch(/boom/)
    expect(out.steps.find((s) => s.step_type === 'tool').is_error).toBe(true)
  })

  it('stops at the iteration cap and asks for a final answer without tools', async () => {
    const toolTurn = msg('tool_use', [{ type: 'tool_use', id: 't', name: 'x', input: {} }])
    const createMessage = vi.fn(async (p) => (p.tool_choice?.type === 'none' ? msg('end_turn', [{ type: 'text', text: 'best effort' }]) : toolTurn))
    const out = await runAgentLoop({ createMessage, params: {}, messages: [], executeTool: async () => ({ content: 'r' }), maxIterations: 3 })
    expect(out.stopReason).toBe('max_iterations')
    expect(out.text).toBe('best effort')
    expect(createMessage).toHaveBeenCalledTimes(4)
  })

  it('resumes after pause_turn', async () => {
    const createMessage = vi.fn()
      .mockResolvedValueOnce(msg('pause_turn', [{ type: 'text', text: 'part' }]))
      .mockResolvedValueOnce(msg('end_turn', [{ type: 'text', text: 'done' }]))
    const out = await runAgentLoop({ createMessage, params: {}, messages: [{ role: 'user', content: 'q' }], executeTool: vi.fn() })
    expect(out.text).toBe('done')
    expect(createMessage.mock.calls[1][0].messages.at(-1).role).toBe('assistant')
  })

  it('reports a refusal without running tools', async () => {
    const createMessage = vi.fn().mockResolvedValue(msg('refusal', []))
    const executeTool = vi.fn()
    const out = await runAgentLoop({ createMessage, params: {}, messages: [], executeTool })
    expect(out.stopReason).toBe('refusal')
    expect(executeTool).not.toHaveBeenCalled()
  })
})

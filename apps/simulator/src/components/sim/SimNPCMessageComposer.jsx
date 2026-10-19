import React, { useState } from 'react'
import { sendMessageToNPC } from '../../services/sim/simNPCMessageService'

/**
 * Message an NPC stakeholder. v1272 Phase 3 (D15): the reply is written in character by the AI
 * stakeholder, who remembers earlier decisions; trust may move a little with each message.
 */
export default function SimNPCMessageComposer({ runId, npcCharacterId, npcLabel, onSent }) {
  const [type, setType] = useState('general_message')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [reply, setReply] = useState(null)
  const [error, setError] = useState('')

  const field = 'w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100'

  const submit = async (e) => {
    e.preventDefault()
    setSending(true)
    setError('')
    setReply(null)
    const res = await sendMessageToNPC(runId, npcCharacterId, type, subject, body, {})
    setSending(false)
    if (!res.success) {
      setError(res.error || 'The message could not be sent.')
      return
    }
    setReply({ text: res.data.npc_response, delta: res.data.trust_delta, notice: res.aiNotice })
    setBody('')
    setSubject('')
    onSent?.(res.data)
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">Message to {npcLabel}</div>
      <select value={type} onChange={(e) => setType(e.target.value)} className={field} aria-label="Message type">
        <option value="general_message">General message</option>
        <option value="status_request">Status request</option>
        <option value="delegation">Delegation</option>
        <option value="approval_request">Approval request</option>
        <option value="escalation">Escalation</option>
      </select>
      <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" className={field} aria-label="Subject" />
      <textarea required value={body} onChange={(e) => setBody(e.target.value)} rows={3} className={field} placeholder="Message body" aria-label="Message" maxLength={4000} />
      <button type="submit" disabled={sending} className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-50">
        {sending ? 'Sending…' : 'Send'}
      </button>
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
      {reply && (
        <div className="rounded-md bg-gray-50 p-3 text-sm text-gray-800 dark:bg-gray-800 dark:text-gray-200">
          <p className="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">{npcLabel} replied:</p>
          <p className="whitespace-pre-wrap">{reply.text}</p>
          {typeof reply.delta === 'number' && reply.delta !== 0 && (
            <p className={`mt-1 text-xs ${reply.delta > 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
              Trust {reply.delta > 0 ? 'rose' : 'fell'} a little.
            </p>
          )}
          {reply.notice && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Standard reply — AI stakeholders are not available: {reply.notice}</p>}
        </div>
      )}
    </form>
  )
}

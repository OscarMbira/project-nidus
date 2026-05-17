import React, { useState } from 'react'
import { sendMessageToNPC } from '../../services/sim/simNPCMessageService'

export default function SimNPCMessageComposer({ runId, npcCharacterId, npcLabel, theme }) {
  const [type, setType] = useState('general_message')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [status, setStatus] = useState('')
  const submit = async (e) => {
    e.preventDefault()
    setStatus('Sending…')
    const res = await sendMessageToNPC(runId, npcCharacterId, type, subject, body, {})
    setStatus(res.success ? 'Sent — NPC reply stub recorded.' : res.error || 'Failed')
  }
  return (
    <form onSubmit={submit} className={`space-y-3 rounded-lg border p-4 ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
      <div className="font-medium text-sm">Message to {npcLabel}</div>
      <select value={type} onChange={(e) => setType(e.target.value)} className="w-full rounded border border-gray-600 bg-transparent px-2 py-1 text-sm">
        <option value="general_message">General message</option>
        <option value="status_request">Status request</option>
        <option value="delegation">Delegation</option>
        <option value="approval_request">Approval request</option>
      </select>
      <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" className="w-full rounded border border-gray-600 bg-transparent px-2 py-1 text-sm" />
      <textarea required value={body} onChange={(e) => setBody(e.target.value)} rows={3} className="w-full rounded border border-gray-600 bg-transparent px-2 py-1 text-sm" placeholder="Message body" />
      <button type="submit" className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700">
        Send
      </button>
      {status && <p className="text-xs text-gray-500">{status}</p>}
    </form>
  )
}

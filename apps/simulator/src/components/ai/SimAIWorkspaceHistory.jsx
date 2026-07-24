/**
 * SimAIWorkspaceHistory.jsx (Phase 7.7)
 * Left panel: Debriefs (grouped by run) + "New chat". Click debrief → loads in centre + scores in right.
 */

import { Bot, FileText, MessageSquare } from 'lucide-react'

export default function SimAIWorkspaceHistory({ debriefs, selectedDebriefId, onSelectDebrief, onNewChat }) {
  return (
    <div className="flex flex-col h-full bg-gray-900 border-r border-gray-700">
      <div className="p-3 border-b border-gray-700">
        <button
          type="button"
          onClick={onNewChat}
          className="w-full py-2 px-3 text-sm font-medium rounded-lg bg-purple-600 hover:bg-purple-700 text-white flex items-center justify-center gap-2"
        >
          <MessageSquare className="w-4 h-4" /> New chat
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Debriefs</p>
        {!debriefs?.length ? (
          <p className="text-xs text-gray-500 px-2">No debriefs yet. Complete a simulation to see them here.</p>
        ) : (
          <div className="space-y-1">
            {debriefs.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => onSelectDebrief(d.id)}
                className={`w-full text-left text-sm px-2 py-2 rounded-lg flex items-center gap-2 truncate ${
                  selectedDebriefId === d.id
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-300 hover:bg-gray-700'
                }`}
              >
                <FileText className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">
                  {d.content?.summary ? d.content.summary.slice(0, 40) + '…' : 'Debrief'}
                </span>
                <span className="text-xs opacity-75 ml-auto">
                  {d.created_at ? new Date(d.created_at).toLocaleDateString() : ''}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

import { useState, useEffect, useCallback } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useSimPracticeOwner } from '../../../hooks/useSimPracticeOwner'
import { simListWbsNodes, simSaveWbsNode, simSoftDeleteWbsNode } from '../../../services/sim/simPlanningService'
import { simDb } from '../../../services/supabase/supabaseClient'
import WBSTreeView from '../../../components/scope/WBSTreeView'
import WBSNodeForm from '../../../components/scope/WBSNodeForm'

export default function WBSBuilder() {
  const { projectId } = useParams()
  const { canEdit } = useSimPracticeOwner(projectId)
  const [nodes, setNodes] = useState([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editNode, setEditNode] = useState(null)
  const [parentForNew, setParentForNew] = useState(null)
  const [msg, setMsg] = useState(null)

  const load = useCallback(async () => {
    if (!projectId) return
    setLoading(true)
    const res = await simListWbsNodes(projectId)
    if (res.success) setNodes(res.data || [])
    setLoading(false)
  }, [projectId])

  useEffect(() => {
    load()
  }, [load])

  const onSubmitForm = async (payload) => {
    if (!projectId || !canEdit) return
    setMsg(null)
    const { data: { user } } = await simDb.auth.getUser()
    if (!user) return
    const res = await simSaveWbsNode(projectId, payload, user.id)
    if (res.success) {
      setMsg({ ok: `WBS node saved. ID: ${res.data?.id}` })
      setFormOpen(false)
      setEditNode(null)
      setParentForNew(null)
      load()
    } else setMsg({ err: res.error })
  }

  const onDelete = async (node) => {
    if (!projectId || !canEdit) return
    if (!window.confirm(`Delete node "${node.title}"?`)) return
    const res = await simSoftDeleteWbsNode(node.id, projectId, null)
    if (res.success) load()
    else setMsg({ err: res.error })
  }

  if (!projectId) return <p className="p-6 text-gray-500">Missing project.</p>
  if (loading) return <div className="flex min-h-[40vh] items-center justify-center">Loading…</div>

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 dark:bg-gray-950">
      <nav className="mb-4 text-sm text-gray-500 dark:text-gray-400">
        <Link to={`/simulator/practice-projects/${projectId}`} className="hover:underline">
          Project
        </Link>
        <span className="mx-2">/</span>
        <span>WBS builder</span>
      </nav>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Work breakdown structure</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Hierarchical scope decomposition (PMBOK 5.5).</p>
        </div>
        {canEdit && (
          <button
            type="button"
            onClick={() => {
              setEditNode(null)
              setParentForNew(null)
              setFormOpen(true)
            }}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white"
          >
            Add root node
          </button>
        )}
      </div>
      {msg?.ok && <div className="mb-4 rounded-lg border border-emerald-700 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-200">{msg.ok}</div>}
      {msg?.err && <div className="mb-4 rounded-lg border border-red-800 bg-red-950/40 px-4 py-3 text-sm text-red-200">{msg.err}</div>}

      <WBSTreeView
        nodes={nodes}
        canEdit={canEdit}
        onEdit={(n) => {
          setEditNode(n)
          setParentForNew(null)
          setFormOpen(true)
        }}
        onDelete={onDelete}
        onAddChild={(n) => {
          setEditNode(null)
          setParentForNew(n.id)
          setFormOpen(true)
        }}
      />

      {formOpen && (
        <WBSNodeForm
          initial={editNode}
          parentId={parentForNew}
          onSubmit={onSubmitForm}
          onCancel={() => {
            setFormOpen(false)
            setEditNode(null)
            setParentForNew(null)
          }}
        />
      )}
    </div>
  )
}

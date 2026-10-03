/**
 * Product Breakdown Structure hub — full CRUD on plan_pbs_nodes (v1024).
 * Platform + Simulator (practice) via pathname detection.
 */
import { useEffect, useState, useCallback } from 'react'
import { Link, useLocation, useParams, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { usePlatformProjectId } from '@nidus/shared/hooks/usePlatformProjectId.js'
import { useProjectRole } from '@nidus/shared/hooks/useProjectRole'
import { platformDb, simDb } from '@nidus/supabase'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import PlanningProjectBar, { usePlanningProjectId } from '../../../components/planning/PlanningProjectBar'
import * as api from '../../../services/planPBSService'
import * as simApi from '../../../services/sim/simPlanPBSService'

const TABS = [
  { id: 'tree', label: 'Products & Deliverables' },
  { id: 'descriptions', label: 'Product Descriptions' },
  { id: 'acceptance', label: 'Acceptance Criteria' },
]

export default function PBSBuilder() {
  const { pathname } = useLocation()
  const params = useParams()
  const navigate = useNavigate()
  const isSim = pathname.includes('/simulator/')
  const platformProject = usePlatformProjectId()
  const planningProjectId = usePlanningProjectId()
  const projectId = isSim
    ? (params.projectId || planningProjectId)
    : platformProject.projectId
  const routeKey = platformProject.routeKey
  const { canEdit: platformCanEdit } = useProjectRole(isSim ? null : projectId)
  const canEdit = isSim ? true : platformCanEdit
  const { showSuccess, modal } = useSuccessModal()
  const [tab, setTab] = useState('tree')
  const [flat, setFlat] = useState([])
  const [tree, setTree] = useState([])
  const [loading, setLoading] = useState(true)

  const projectSuffix = routeKey ? `?projectId=${encodeURIComponent(routeKey)}` : ''
  const db = isSim ? simDb : platformDb
  const pbsApi = isSim ? simApi : api

  const load = useCallback(async () => {
    if (!projectId) return
    setLoading(true)
    try {
      let q = db.from('plan_pbs_nodes').select('*')
      q = isSim ? q.eq('practice_project_id', projectId) : q.eq('project_id', projectId)
      const { data, error } = await q.order('sort_order', { ascending: true })
      if (error) throw error
      setFlat(data || [])
      setTree(await pbsApi.getPBSTree(projectId))
    } catch (e) {
      toast.error(e?.message || 'Failed to load PBS')
    } finally {
      setLoading(false)
    }
  }, [projectId, isSim, db, pbsApi])

  useEffect(() => { load() }, [load])

  const usesFlatPmPlanningRoute = isSim && pathname.includes('/pm/planning/')
  const pbsBase = isSim
    ? (usesFlatPmPlanningRoute ? '/simulator/pm/planning/pbs' : `/simulator/practice-projects/${projectId}/scope/pbs`)
    : '/platform/scope/pbs'

  const openCreate = (parentId = null) => {
    navigate(`${pbsBase}/create${parentId ? `?parent=${parentId}` : ''}`)
  }

  const openEdit = (node) => {
    navigate(`${pbsBase}/${node.id}/edit`)
  }

  const remove = async (node) => {
    if (!canEdit) return
    if (!window.confirm(`Delete "${node.name}"?`)) return
    try {
      await pbsApi.deletePBSNode(node.id)
      showSuccess({ recordId: node.node_code || node.name, operation: 'deleted', message: 'PBS node deleted.' })
      load()
    } catch (err) {
      toast.error(err?.message || 'Delete failed')
    }
  }

  const renderNodes = (nodes, depth = 0) =>
    (nodes || []).map((n) => (
      <li key={n.id} className={`${depth ? 'ml-4 border-l border-gray-200 dark:border-gray-700 pl-3' : ''} py-2`}>
        <div className="flex flex-wrap items-center gap-2 justify-between rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2">
          <div>
            <span className="text-xs text-gray-700 dark:text-gray-200 mr-2">{n.node_code || '·'}</span>
            <span className="font-medium text-gray-900 dark:text-gray-100">{n.name}</span>
            <span className="ml-2 text-xs text-gray-700 dark:text-gray-200">({n.product_type} · {n.status})</span>
          </div>
          {canEdit && (
            <div className="flex gap-1">
              <button type="button" title="Add child" onClick={() => openCreate(n.id)} className="p-1.5 rounded text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30">
                <Plus className="h-4 w-4" />
              </button>
              <button type="button" title="Edit" onClick={() => openEdit(n)} className="p-1.5 rounded text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30">
                <Pencil className="h-4 w-4" />
              </button>
              <button type="button" title="Delete" onClick={() => remove(n)} className="p-1.5 rounded text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
        {n.children?.length > 0 && <ul className="mt-1">{renderNodes(n.children, depth + 1)}</ul>}
      </li>
    ))

  const descBase = isSim ? `/simulator/practice-product-descriptions` : `/platform/product-descriptions`
  const ppdBase = isSim ? `/simulator/ppd` : `/platform/ppd`

  return (
    <div className="w-full px-3 sm:px-4 lg:px-5 xl:px-6 py-6">
      {modal}
      {isSim && <div className="mb-3"><PlanningProjectBar isSim /></div>}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Product Breakdown Structure</h1>
          <p className="text-sm text-gray-700 dark:text-gray-200">Products, deliverables, and linked descriptions.</p>
        </div>
        {canEdit && tab === 'tree' && projectId && (
          <button type="button" onClick={() => openCreate(null)} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white">
            <Plus className="h-4 w-4" /> Add product
          </button>
        )}
      </div>

      {!projectId && <p className="text-amber-700 dark:text-amber-300 text-sm mb-4">Select a project.</p>}

      <div className="flex gap-2 mb-4 border-b border-gray-200 dark:border-gray-700">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px ${
              tab === t.id
                ? 'border-blue-600 text-blue-700 dark:text-blue-400'
                : 'border-transparent text-gray-700 dark:text-gray-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {projectId && tab === 'tree' && (
        loading ? <p className="text-gray-700 dark:text-gray-200">Loading…</p>
          : tree.length === 0 ? <p className="text-gray-700 dark:text-gray-200">No PBS nodes yet.</p>
            : <ul>{renderNodes(tree)}</ul>
      )}

      {tab === 'descriptions' && (
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 space-y-2">
          <Link to={`${descBase}${projectSuffix}`} className="text-blue-600 dark:text-blue-400 underline text-sm">Open Product Descriptions</Link>
          <Link to={`${ppdBase}${projectSuffix}`} className="block text-blue-600 dark:text-blue-400 underline text-sm">Open Project Product Description</Link>
        </div>
      )}

      {tab === 'acceptance' && (
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 space-y-3">
          <ul className="text-sm space-y-3">
            {flat.filter((n) => n.acceptance_criteria).map((n) => (
              <li key={n.id} className="text-gray-900 dark:text-gray-100">
                <div className="font-medium"><span className="text-gray-700 dark:text-gray-200">{n.node_code}</span> {n.name}</div>
                <ul className="list-disc list-inside text-gray-700 dark:text-gray-200">
                  {n.acceptance_criteria.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line, i) => (
                    <li key={i}>{line}</li>
                  ))}
                </ul>
              </li>
            ))}
            {!flat.some((n) => n.acceptance_criteria) && (
              <li className="text-gray-700 dark:text-gray-200">No acceptance criteria on PBS nodes yet.</li>
            )}
          </ul>
        </div>
      )}

    </div>
  )
}

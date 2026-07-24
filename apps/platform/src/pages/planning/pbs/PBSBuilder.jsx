import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import toast from 'react-hot-toast'
import PlanningProjectBar, { usePlanningProjectId } from '../../../components/planning/PlanningProjectBar'
import * as api from '../../../services/planPBSService'
import * as simApi from '../../../services/sim/simPlanPBSService'

export default function PBSBuilder() {
  const { pathname } = useLocation()
  const isSim = pathname.includes('/simulator/')
  const projectId = usePlanningProjectId()
  const [tree, setTree] = useState([])

  useEffect(() => {
    if (!projectId) return
    ;(async () => {
      try {
        const t = isSim ? await simApi.getPBSTree(projectId) : await api.getPBSTree(projectId)
        setTree(t || [])
      } catch (e) {
        toast.error(e?.message || 'Failed to load PBS')
      }
    })()
  }, [projectId, isSim])

  const renderNodes = (nodes, depth = 0) =>
    (nodes || []).map((n) => (
      <li key={n.id} className="ml-2 border-l border-gray-700 pl-3 py-1">
        <span className="text-gray-200">{n.node_code || '·'} {n.name}</span>
        {n.children?.length > 0 && <ul className="mt-1">{renderNodes(n.children, depth + 1)}</ul>}
      </li>
    ))

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 px-4 py-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-xl font-semibold text-white mb-2">Product breakdown (PBS)</h1>
        <PlanningProjectBar isSim={isSim} />
        {!projectId && <p className="text-amber-400/90 text-sm">Select a project.</p>}
        {projectId && <ul className="mt-4 text-sm">{renderNodes(tree)}</ul>}
      </div>
    </div>
  )
}

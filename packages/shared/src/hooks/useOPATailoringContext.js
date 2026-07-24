import { useMemo } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import * as platformSvc from '../services/projectOPATailoringService'
import * as simSvc from '../services/sim/simProjectOPATailoringService'

export function useOPATailoringContext() {
  const { projectId, customisationId } = useParams()
  const location = useLocation()
  const isSim = location.pathname.includes('/simulator/practice-projects')

  const base = isSim
    ? `/simulator/practice-projects/${projectId}/opa-templates`
    : `/platform/projects/${projectId}/opa-templates`

  const opaBrowsePath = isSim ? '/simulator/opa?type=template' : '/platform/opa?type=template'
  const sourceOpaPath = (id) => (isSim ? `/simulator/opa/${id}` : `/platform/opa/${id}`)

  const svc = useMemo(() => (isSim ? simSvc : platformSvc), [isSim])

  return {
    isSim,
    projectId,
    customisationId,
    base,
    opaBrowsePath,
    sourceOpaPath,
    svc,
    OPA_FIELD_REGISTRY: platformSvc.OPA_FIELD_REGISTRY,
    buildDefaultFieldConfigs: platformSvc.buildDefaultFieldConfigs,
    normalizeFieldConfigs: platformSvc.normalizeFieldConfigs,
  }
}

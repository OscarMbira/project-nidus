import * as platformOpa from '../opaService'
import * as simOpa from '../sim/simOPAService'

/** Resolve OPA service by domain — keeps dual-mode pages free of direct sim imports. */
export function getOPAService(isSim = false) {
  return isSim ? simOpa : platformOpa
}

/** Dual-mode OPA services — used by shared pages in pages/app */
export * as platformOpa from '../opaService.js'
export * as simOpa from '../sim/simOPAService.js'

export function getOpaService(isSim) {
  return isSim ? simOpa : platformOpa
}

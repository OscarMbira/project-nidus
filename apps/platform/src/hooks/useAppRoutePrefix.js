import { useLocation } from 'react-router-dom'

/** @returns {'/platform'|'/simulator'} */
export function useAppRoutePrefix() {
  const { pathname } = useLocation()
  return pathname.startsWith('/simulator') ? '/simulator' : '/platform'
}

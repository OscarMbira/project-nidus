import { useLocation } from 'react-router-dom'

export function useIsSimulator() {
  const { pathname } = useLocation()
  return pathname.startsWith('/simulator')
}

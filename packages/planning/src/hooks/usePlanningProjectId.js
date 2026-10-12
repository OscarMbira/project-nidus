import { useSearchParams } from 'react-router-dom'

/** The project the planning screens work on: the `?projectId=` query value (code or UUID), or ''. */
export function usePlanningProjectId() {
  const [searchParams] = useSearchParams()
  return searchParams.get('projectId') || ''
}

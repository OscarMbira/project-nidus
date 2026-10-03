/**
 * Project Charter create/edit — redirects to Project Brief (same document).
 */
import { useParams } from 'react-router-dom'
import ProjectCharterToBriefRedirect from './ProjectCharterToBriefRedirect'

export default function ProjectCharterForm() {
  const { id } = useParams()
  return <ProjectCharterToBriefRedirect mode={id ? 'edit' : 'create'} />
}

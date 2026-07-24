/**
 * Simulator Benefits – redirects to Practice Benefits Review Plans (parity with Platform benefits create/view/edit).
 * Routes: /simulator/benefits/create, /simulator/benefits/:id, /simulator/benefits/:id/edit
 */

import { Navigate, useParams, useLocation } from 'react-router-dom'

export default function PracticeBenefitsRedirectPage() {
  const { id } = useParams()
  const location = useLocation()
  const isEdit = location.pathname.endsWith('/edit')

  if (id && isEdit) {
    return <Navigate to={`/simulator/practice-benefits-review-plans/${id}/edit`} replace />
  }
  if (id) {
    return <Navigate to={`/simulator/practice-benefits-review-plans/${id}`} replace />
  }
  return <Navigate to="/simulator/practice-benefits-review-plans/create" replace />
}

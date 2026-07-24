/**
 * PMOInitiationBusinessCase
 * Redirects to the Business Case list page.
 * The actual list/create/view/edit functionality is in /pages/businessCase/
 */

import { Navigate } from 'react-router-dom'

export default function PMOInitiationBusinessCase() {
  return <Navigate to="/pmo/initiation/business-case" replace />
}

/**
 * Platform Create Benefit – full page at /platform/benefits/create
 */

import { useNavigate } from 'react-router-dom'
import BenefitForm from '../../components/benefits/BenefitForm'

export default function BenefitCreatePage() {
  const navigate = useNavigate()

  return (
    <BenefitForm
      usePageLayout
      onSave={() => navigate(-1)}
      onCancel={() => navigate(-1)}
    />
  )
}

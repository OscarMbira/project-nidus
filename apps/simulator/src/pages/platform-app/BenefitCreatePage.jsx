/**
 * Platform Create Benefit – full page at /platform/benefits/create
 */

import { useNavigate } from 'react-router-dom'
import BenefitForm from '../../components/benefits/BenefitForm'

export default function BenefitCreatePage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <BenefitForm
        usePageLayout
        onSave={() => navigate('/platform/benefits')}
        onCancel={() => navigate('/platform/benefits')}
      />
    </div>
  )
}

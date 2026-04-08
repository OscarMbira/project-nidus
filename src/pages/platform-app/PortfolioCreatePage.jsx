import { useNavigate } from 'react-router-dom'
import PortfolioForm from '../../components/portfolio/PortfolioForm'

// Platform wrapper for creating a new portfolio at /platform/portfolio/create
export default function PortfolioCreatePage() {
  const navigate = useNavigate()

  const handleSaved = (saved) => {
    const message = saved?.id
      ? `Portfolio created successfully. Record ID: ${saved.id}${saved.portfolio_name ? ` (${saved.portfolio_name})` : ''}`
      : 'Portfolio created successfully.'
    navigate('/platform/portfolio', { replace: true, state: { toast: { type: 'success', message } } })
  }

  const handleCancel = () => {
    navigate('/platform/portfolio')
  }

  return (
    <PortfolioForm
      portfolio={null}
      onSave={handleSaved}
      onCancel={handleCancel}
      useModalLayout={false}
    />
  )
}


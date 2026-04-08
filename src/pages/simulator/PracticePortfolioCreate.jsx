import { useNavigate } from 'react-router-dom'
import PracticePortfolioForm from '../../components/sim/PracticePortfolioForm'

export default function PracticePortfolioCreate() {
  const navigate = useNavigate()

  const handleSaved = () => {
    navigate('/simulator/practice-portfolio')
  }

  const handleCancel = () => {
    navigate('/simulator/practice-portfolio')
  }

  return (
    <PracticePortfolioForm
      onSaved={handleSaved}
      onCancel={handleCancel}
      useModalLayout={false}
    />
  )
}


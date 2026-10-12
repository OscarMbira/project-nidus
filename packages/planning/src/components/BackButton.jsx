import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

/** Rule 73 back control for secondary planning screens: always browser history, never a fixed path. */
export default function BackButton({ label = 'Back' }) {
  const navigate = useNavigate()
  return (
    <button
      type="button"
      onClick={() => navigate(-1)}
      className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 flex items-center gap-2"
    >
      <ArrowLeft className="h-4 w-4" />
      {label}
    </button>
  )
}

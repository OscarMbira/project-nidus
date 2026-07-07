import { useLocation } from 'react-router-dom'
import { ExternalLink } from 'lucide-react'
import { Button } from './Button.jsx'

const DetachButton = ({ label = 'Detach', width = 1000, height = 750, className = '', ...props }) => {
  const location = useLocation()

  const handleClick = () => {
    const params = new URLSearchParams(location.search)
    params.set('popout', '1')
    const url = `${window.location.origin}${location.pathname}?${params.toString()}`
    window.open(
      url,
      `popout${location.pathname}`,
      `width=${width},height=${height},resizable=yes,scrollbars=yes`,
    )
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleClick}
      title="Detach — open in a separate window for a second monitor"
      aria-label="Detach"
      className={className}
      {...props}
    >
      <ExternalLink className="h-4 w-4" />
      {label}
    </Button>
  )
}

export { DetachButton }
export default DetachButton

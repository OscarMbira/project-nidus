import { useMenu } from '../../lib/useMenu'
import PMProjectSelector from './PMProjectSelector'

/**
 * The header project selector. The route check (`routeIsPm`) can be unknown on the first render
 * after a refresh, because the user's role cache fills in later. The menu's layout hint updates
 * once the menu loads, so the selector appears without needing a navigation.
 */
export default function HeaderProjectSelector({ routeIsPm }) {
  const { layoutHint } = useMenu()
  if (!routeIsPm && layoutHint?.layout !== 'pm') return null
  return <PMProjectSelector compact />
}

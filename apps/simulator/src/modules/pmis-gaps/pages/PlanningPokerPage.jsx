import { Gamepad2 } from 'lucide-react'
import PmisGapListHub from '../components/PmisGapListHub'
import { listGapRecords } from '../services/gapDataService'

export default function PlanningPokerPage({ sim = false }) {
  return (
    <PmisGapListHub
      title="Planning Poker"
      description="Estimation sessions for agile backlog items."
      icon={Gamepad2}
      storageKey={`gap-planning-poker-${sim ? 'sim' : 'platform'}`}
      columns={[
        { key: 'session_name', label: 'Session' },
        { key: 'session_status', label: 'Status' },
        { key: 'story_count', label: 'Stories' },
        { key: 'created_at', label: 'Created' },
      ]}
      loadRows={() => listGapRecords('planning_poker_sessions', { sim, orderBy: 'created_at' })}
      baseFilename="Planning-Poker"
    />
  )
}

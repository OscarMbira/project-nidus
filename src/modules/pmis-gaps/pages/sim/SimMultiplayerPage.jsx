import { Users } from 'lucide-react'
import PmisGapListHub from '../../components/PmisGapListHub'
import { listGapRecords } from '../../services/gapDataService'

export default function SimMultiplayerPage() {
  return (
    <PmisGapListHub
      title="Team Mode (Multiplayer)"
      description="Collaborative simulation sessions with multiple participants."
      icon={Users}
      storageKey="gap-sim-multiplayer"
      columns={[
        { key: 'session_name', label: 'Session' },
        { key: 'session_status', label: 'Status' },
        { key: 'participant_count', label: 'Participants' },
        { key: 'created_at', label: 'Created' },
      ]}
      loadRows={() => listGapRecords('multiplayer_sessions', { sim: true, orderBy: 'created_at' })}
      baseFilename="Multiplayer-Sessions"
    />
  )
}

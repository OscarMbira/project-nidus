import { PenTool } from 'lucide-react'
import PmisGapListHub from '../components/PmisGapListHub'
import { listGapRecords } from '../services/gapDataService'

export default function WhiteboardPage({ sim = false }) {
  return (
    <PmisGapListHub
      title="Whiteboard"
      description="Collaborative boards for brainstorming and process mapping."
      icon={PenTool}
      storageKey={`gap-whiteboard-${sim ? 'sim' : 'platform'}`}
      columns={[
        { key: 'board_name', label: 'Board' },
        { key: 'template_type', label: 'Template' },
        { key: 'updated_at', label: 'Updated' },
      ]}
      loadRows={() => listGapRecords('whiteboards', { sim, orderBy: 'updated_at' })}
      baseFilename="Whiteboards"
    />
  )
}

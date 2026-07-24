import { Map } from 'lucide-react'
import PmisGapListHub from '../components/PmisGapListHub'
import { listGapRecords } from '../services/gapDataService'

export default function PortfolioMapPage({ sim = false }) {
  return (
    <PmisGapListHub
      title="Strategic Portfolio Map"
      description="Bubble chart configurations for portfolio strategic alignment."
      icon={Map}
      storageKey={`gap-portfolio-map-${sim ? 'sim' : 'platform'}`}
      columns={[
        { key: 'map_name', label: 'Map' },
        { key: 'x_axis_field', label: 'X Axis' },
        { key: 'y_axis_field', label: 'Y Axis' },
        { key: 'updated_at', label: 'Updated' },
      ]}
      loadRows={() => listGapRecords('portfolio_map_configs', { sim, orderBy: 'updated_at' })}
      baseFilename="Portfolio-Map"
    />
  )
}

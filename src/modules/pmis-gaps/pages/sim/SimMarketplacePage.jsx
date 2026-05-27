import { Store } from 'lucide-react'
import PmisGapListHub from '../../components/PmisGapListHub'
import { listGapRecords } from '../../services/gapDataService'

export default function SimMarketplacePage() {
  return (
    <PmisGapListHub
      title="Scenario Marketplace"
      description="Browse and purchase community scenario packs."
      icon={Store}
      storageKey="gap-sim-marketplace"
      columns={[
        { key: 'listing_title', label: 'Scenario' },
        { key: 'price_tier', label: 'Tier' },
        { key: 'average_rating', label: 'Rating' },
        { key: 'review_count', label: 'Reviews' },
      ]}
      loadRows={() => listGapRecords('scenario_marketplace_listings', { sim: true, orderBy: 'listing_title' })}
      baseFilename="Scenario-Marketplace"
    />
  )
}

/**
 * v1356 — Platform wrapper around the shared Integrations hub.
 */
import SharedIntegrations, { IntegrationsOverview as SharedOverview } from '@nidus/ui/integrations/IntegrationsSecurityPage.jsx'

const BASE = '/platform/organisation/integrations'

export default function IntegrationsSecurityPage() {
  return <SharedIntegrations basePath={BASE} />
}

export function IntegrationsOverview() {
  return <SharedOverview basePath={BASE} />
}

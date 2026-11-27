/**
 * v1356 — Planner edition Integrations & Security (same public schema as Platform).
 */
import SharedIntegrations, { IntegrationsOverview as SharedOverview } from '@nidus/ui/integrations/IntegrationsSecurityPage.jsx'

const BASE = '/app/settings/integrations'

export default function IntegrationsLayout() {
  return <SharedIntegrations basePath={BASE} />
}

export function IntegrationsOverview() {
  return <SharedOverview basePath={BASE} />
}

export {
  ApiKeysPanel,
  WebhooksPanel,
  ScimPanel,
  SsoPanel,
  ApiDocsPanel,
} from '@nidus/ui/integrations/IntegrationsPanels.jsx'

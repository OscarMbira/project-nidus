import { PLATFORM_MODULES } from '../../../packages/modules/registry.js'

const env = import.meta.env

/** @type {Record<string, string | undefined>} */
const moduleConfig = Object.fromEntries(
  PLATFORM_MODULES.map((m) => [m.federationName, env[m.envKey]]),
)

export default moduleConfig

export { PLATFORM_MODULES }

export const MODULE_MIN_VERSIONS = {
  planning_hub: '1.0.0',
  risk_module: '1.0.0',
  quality_module: '1.0.0',
  financial_module: '1.0.0',
  change_module: '1.0.0',
  stakeholder_module: '1.0.0',
  delays_module: '1.0.0',
  stage_gates_module: '1.0.0',
  pmo_module: '1.0.0',
  portfolio_module: '1.0.0',
  programme_module: '1.0.0',
  benefits_module: '1.0.0',
  issues_module: '1.0.0',
  communications_module: '1.0.0',
  reports_module: '1.0.0',
  admin_module: '1.0.0',
}

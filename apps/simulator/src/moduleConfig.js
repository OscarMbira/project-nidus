import { SIMULATOR_MODULES } from '../../../packages/modules/registry.js'

const env = import.meta.env

/** @type {Record<string, string | undefined>} */
const moduleConfig = Object.fromEntries(
  SIMULATOR_MODULES.map((m) => [m.federationName, env[m.envKey]]),
)

export default moduleConfig

export { SIMULATOR_MODULES }

export const MODULE_MIN_VERSIONS = {
  sim_planning_module: '1.0.0',
  sim_risk_module: '1.0.0',
  sim_quality_module: '1.0.0',
  sim_pmo_module: '1.0.0',
  sim_scenarios_module: '1.0.0',
  sim_leaderboard_module: '1.0.0',
  sim_admin_module: '1.0.0',
}

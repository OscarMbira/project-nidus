import moduleConfig, { MODULE_MIN_VERSIONS } from '../moduleConfig.js'
import { checkModuleVersions } from '@nidus/shared/federation/moduleVersionCheck.js'

/**
 * Shell startup: optional module version compatibility checks when federation is enabled.
 */
export async function initFederation() {
  if (import.meta.env.VITE_FEDERATION_ENABLED !== 'true') {
    return { enabled: false, checks: [] }
  }

  const checks = await checkModuleVersions(moduleConfig, MODULE_MIN_VERSIONS)
  return { enabled: true, checks }
}

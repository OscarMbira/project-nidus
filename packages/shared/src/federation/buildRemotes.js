import { getDefaultModuleUrl } from '../../../modules/registry.js'

/**
 * Build Vite federation remotes map from env + module list.
 * @param {import('../../../modules/registry.js').ModuleDef[]} modules
 * @param {Record<string, string>} env
 */
export function buildRemotesFromEnv(modules, env) {
  /** @type {Record<string, string>} */
  const remotes = {}
  for (const mod of modules) {
    const base = env[mod.envKey] || getDefaultModuleUrl(mod.port)
    remotes[mod.federationName] = `${base.replace(/\/$/, '')}/assets/remoteEntry.js`
  }
  return remotes
}

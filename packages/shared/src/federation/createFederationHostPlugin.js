import path from 'path'
import { fileURLToPath } from 'url'
import federation from '@originjs/vite-plugin-federation'
import { buildRemotesFromEnv } from './buildRemotes.js'
import { FEDERATION_SHARED } from './federationShared.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '../..')

/**
 * Module Federation host plugin for platform/simulator shells.
 * Enabled when VITE_FEDERATION_ENABLED=true.
 * @param {{ modules: import('../../packages/modules/registry.js').ModuleDef[], env: Record<string, string> }} opts
 */
export function createFederationHostPlugin({ modules, env }) {
  if (env.VITE_FEDERATION_ENABLED !== 'true') {
    return null
  }

  return federation({
    name: 'nidus_shell',
    remotes: buildRemotesFromEnv(modules, env),
    shared: FEDERATION_SHARED,
  })
}

export { FEDERATION_SHARED }

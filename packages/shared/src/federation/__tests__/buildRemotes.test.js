import { describe, it, expect } from 'vitest'
import { buildRemotesFromEnv } from '../buildRemotes.js'
import { PLATFORM_MODULES } from '../../../../modules/registry.js'

describe('buildRemotesFromEnv', () => {
  it('builds remoteEntry URLs from env vars', () => {
    const remotes = buildRemotesFromEnv(PLATFORM_MODULES.slice(0, 2), {
      VITE_MODULE_PLANNING_HUB_URL: 'http://localhost:5201',
      VITE_MODULE_RISK_URL: 'http://cdn.example/risk',
    })
    expect(remotes.planning_hub).toBe('http://localhost:5201/assets/remoteEntry.js')
    expect(remotes.risk_module).toBe('http://cdn.example/risk/assets/remoteEntry.js')
  })

  it('uses default localhost ports when env unset', () => {
    const mod = PLATFORM_MODULES.find((m) => m.federationName === 'quality_module')
    const remotes = buildRemotesFromEnv([mod], {})
    expect(remotes.quality_module).toBe('http://localhost:5203/assets/remoteEntry.js')
  })
})

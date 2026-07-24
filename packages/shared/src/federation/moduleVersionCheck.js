/**
 * Shell startup compatibility check — warns when remote module version is below minimum.
 * @param {Record<string, string | undefined>} moduleConfig
 * @param {Record<string, string>} minimumVersions e.g. { planning_hub: '1.0.0' }
 */
export async function checkModuleVersions(moduleConfig, minimumVersions = {}) {
  const results = []

  for (const [name, minVersion] of Object.entries(minimumVersions)) {
    const url = moduleConfig[name]
    if (!url) continue

    try {
      const healthUrl = `${url.replace(/\/$/, '')}/health.json`
      const res = await fetch(healthUrl, { cache: 'no-store' })
      if (!res.ok) {
        results.push({ name, ok: false, reason: `health check HTTP ${res.status}` })
        continue
      }
      const data = await res.json()
      const remoteVersion = data.version || '0.0.0'
      const compatible = compareSemver(remoteVersion, minVersion) >= 0
      results.push({ name, ok: compatible, version: remoteVersion, minimum: minVersion })
      if (!compatible) {
        console.warn(`[module-version] ${name} v${remoteVersion} is below minimum v${minVersion}`)
      }
    } catch (err) {
      results.push({ name, ok: false, reason: err?.message || 'fetch failed' })
    }
  }

  return results
}

/** @returns {number} negative if a<b, 0 if equal, positive if a>b */
function compareSemver(a, b) {
  const pa = a.split('.').map(Number)
  const pb = b.split('.').map(Number)
  for (let i = 0; i < 3; i++) {
    const diff = (pa[i] || 0) - (pb[i] || 0)
    if (diff !== 0) return diff
  }
  return 0
}

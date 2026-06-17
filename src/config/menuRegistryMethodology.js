/**
 * Methodology metadata for menu registry entries (v671).
 */
import { inferMenuItemMethodology } from './methodologyMenuUtils.js'

/**
 * @param {import('./menuRegistry.js').MenuRegistryEntry} entry
 * @returns {'structured'|'pmbok'|'agile'|'universal'}
 */
export function getRegistryEntryMethodology(entry) {
  return inferMenuItemMethodology(entry)
}

/**
 * @param {import('./menuRegistry.js').MenuRegistryEntry[]} entries
 */
export function withRegistryMethodology(entries = []) {
  return entries.map((e) => ({
    ...e,
    methodology: e.methodology || getRegistryEntryMethodology(e),
  }))
}

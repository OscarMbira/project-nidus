/**
 * Shared code boundary (v729 Option B).
 * Re-exports from canonical locations — import via @shared/* alias.
 * New cross-domain code should live here; domain-specific code stays in pages/platform-app or pages/simulator.
 */
export * from '@nidus/ui/Card.jsx'
export * from '@nidus/ui/Checkbox.jsx'
export * from '@nidus/ui/Button.jsx'
export { default as TableRowNumberHeader } from '@nidus/ui/Table.jsx'
export * from '@nidus/shared/utils/tableRowNumberUtils.js'

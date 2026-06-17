/**
 * Shared code boundary (v729 Option B).
 * Re-exports from canonical locations — import via @shared/* alias.
 * New cross-domain code should live here; domain-specific code stays in pages/platform-app or pages/simulator.
 */
export * from '../../components/ui/Card.jsx'
export * from '../../components/ui/Checkbox.jsx'
export * from '../../components/ui/Button.jsx'
export { default as TableRowNumberHeader } from '../../components/ui/Table.jsx'
export * from '../../utils/tableRowNumberUtils.js'

/** Shared Module Federation dependency config — singleton React across shell + remotes. */

// v1240: every shared module that creates a React context must be ONE instance across the shell
// and its remotes, otherwise a remote loaded at runtime gets its own copy of the context and does
// not see the shell's provider (theme, toast, unsaved-changes guard, branding, current project…).
// Listed by exact import id because federation matches ids, not package roots.
const SHARED_CONTEXT_MODULES = [
  '@nidus/shared/context/AppConfigContext',
  '@nidus/shared/context/DocumentGovernanceContext',
  '@nidus/shared/context/LanguageContext',
  '@nidus/shared/context/PracticeDocumentGovernanceContext',
  '@nidus/shared/context/ThemeContext',
  '@nidus/shared/context/ToastContext',
  '@nidus/shared/context/UnsavedChangesContext',
  '@nidus/shared/hooks/useBranding',
  '@nidus/shared/hooks/useCurrentProject',
]

// Workspace packages have no node_modules/<id>/package.json for a subpath id, so the version is
// given explicitly (packages/shared/package.json) and not version-checked between shell and remote.
const SHARED_WORKSPACE_VERSION = '0.0.1'

export const FEDERATION_SHARED = {
  react: { singleton: true, requiredVersion: '^18.3.1' },
  'react-dom': { singleton: true, requiredVersion: '^18.3.1' },
  'react-router-dom': { singleton: true, requiredVersion: '^6.30.2' },
  ...Object.fromEntries(
    SHARED_CONTEXT_MODULES.map((id) => [
      id,
      { singleton: true, version: SHARED_WORKSPACE_VERSION, requiredVersion: false },
    ])
  ),
}

// v1239: the planning context is shared only by the shells and the two planning modules (other
// modules do not depend on @nidus/planning and could not resolve it).
export const PLANNING_FEDERATION_SHARED = {
  '@nidus/planning/context/PlanningContext.jsx': { singleton: true, version: SHARED_WORKSPACE_VERSION, requiredVersion: false },
}

export const FEDERATION_BUILD = {
  target: 'esnext',
  minify: false,
  cssCodeSplit: false,
}

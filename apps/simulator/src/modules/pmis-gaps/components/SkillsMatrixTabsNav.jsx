/**
 * Small in-page tab nav shared by the three Skills Matrix surfaces (GAP-11, v963 Phase 18,
 * Simulator port). Simulator mirror of apps/platform/src/modules/pmis-gaps/components/
 * SkillsMatrixTabsNav.jsx. Catalog (shared skill list), Competency Matrix (self-assessment
 * grid), Requirements (required skills per practice project/role). One sidebar menu item
 * ("Skills Matrix") covers all three — this nav switches between them.
 */
import { useNavigate } from 'react-router-dom'

export default function SkillsMatrixTabsNav({ active, basePath }) {
  const navigate = useNavigate()
  const tabs = [
    { key: 'catalog', label: 'Skill Catalog', path: basePath },
    { key: 'matrix', label: 'Competency Matrix', path: `${basePath}/matrix` },
    { key: 'requirements', label: 'Requirements', path: `${basePath}/requirements` },
  ]
  return (
    <div className="flex flex-wrap gap-2 border-b border-gray-200 dark:border-gray-700" role="tablist" aria-label="Skills Matrix sections">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          role="tab"
          aria-selected={active === tab.key}
          onClick={() => navigate(tab.path)}
          className={`border-b-2 px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
            active === tab.key
              ? 'border-blue-600 text-gray-900 dark:border-blue-300 dark:text-gray-100'
              : 'border-transparent text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

/**
 * v1356 — Organisation / Planner Settings › Integrations & Security hub.
 * Pass basePath (e.g. /platform/organisation/integrations or /app/settings/integrations).
 */
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export default function IntegrationsSecurityPage({ basePath = '/platform/organisation/integrations' }) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const tabs = [
    { to: basePath, end: true, label: 'Overview' },
    { to: `${basePath}/api-keys`, label: 'API keys' },
    { to: `${basePath}/webhooks`, label: 'Webhooks' },
    { to: `${basePath}/scim`, label: 'SCIM' },
    { to: `${basePath}/sso`, label: 'SSO' },
    { to: `${basePath}/api-docs`, label: 'API reference' },
  ]

  return (
    <div className="w-full px-3 sm:px-4 lg:px-5 xl:px-6 py-6">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 flex items-center gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Integrations & Security</h1>
      <p className="text-sm text-gray-700 dark:text-gray-200 mb-6">
        API keys, webhooks, SCIM provisioning and single sign-on for this organisation.
      </p>
      <nav className="flex flex-wrap gap-2 mb-6" aria-label="Integrations sections">
        {tabs.map((tab) => {
          const active = tab.end ? pathname === tab.to || pathname === `${tab.to}/` : pathname.startsWith(tab.to)
          return (
            <Link
              key={tab.to}
              to={tab.to}
              className={`px-3 py-1.5 rounded-lg text-sm border ${
                active
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 border-gray-200 dark:border-gray-700'
              }`}
            >
              {tab.label}
            </Link>
          )
        })}
      </nav>
      <Outlet context={{ basePath }} />
    </div>
  )
}

export function IntegrationsOverview({ basePath = '/platform/organisation/integrations' }) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 space-y-3 text-sm text-gray-800 dark:text-gray-100">
      <p>
        Use API keys for BI and ERP tools. Subscribe to webhooks for change events. Connect SCIM so joiners and leavers stay in sync. Require SSO on verified email domains.
      </p>
      <ul className="list-disc pl-5 space-y-1">
        <li><Link className="text-blue-600 dark:text-blue-400" to={`${basePath}/api-keys`}>Create an API key</Link></li>
        <li><Link className="text-blue-600 dark:text-blue-400" to={`${basePath}/webhooks`}>Add a webhook</Link></li>
        <li><Link className="text-blue-600 dark:text-blue-400" to={`${basePath}/scim`}>Turn on SCIM</Link></li>
        <li><Link className="text-blue-600 dark:text-blue-400" to={`${basePath}/sso`}>Configure SSO</Link></li>
        <li><Link className="text-blue-600 dark:text-blue-400" to={`${basePath}/api-docs`}>Open the API reference</Link></li>
      </ul>
    </div>
  )
}

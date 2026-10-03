/**
 * PMO Configuration Zone — guided landing page (v982 Phase 2)
 * Single entry point into methodology, classifications, templates, workflows/approval chains,
 * authorities, roles & responsibilities, and reference data — closing the PRD's "PMO
 * configuration exists only as scattered settings with no guided entry point" gap. Also the
 * target of Phase 1's "Getting Started as PMO Admin" CTA.
 * Route: /platform/pmo-admin/configuration
 */
import { useNavigate } from 'react-router-dom'
import {
  Compass, Sliders, Layers, FileStack, GitBranch, ShieldCheck, Users, Database, ArrowLeft, Package, Tags, UserCog, ClipboardCheck, CalendarRange, Settings,
} from 'lucide-react'

const CARDS = [
  {
    icon: Sliders,
    title: 'Delivery Methodology',
    description: 'Default methodology (Hybrid, Structured, Standards-based, Agile) and whether projects may override it.',
    to: '/platform/pmo-admin',
    cta: 'Open methodology settings →',
  },
  {
    icon: Tags,
    title: 'Risk Categories',
    description: 'Add the categories and sub-categories used when a risk is logged. Built-in names stay as they are.',
    to: '/platform/pmo-admin/risk-categories',
    cta: 'Manage risk categories →',
  },
  {
    icon: UserCog,
    title: 'Assignment Roles',
    description: 'Add the role options (Lead, Contributor, Reviewer, etc.) offered when assigning a resource.',
    to: '/platform/pmo-admin/assignment-roles',
    cta: 'Manage assignment roles →',
  },
  {
    icon: ClipboardCheck,
    title: 'Timesheet Review Reasons',
    description: 'Add the predefined reasons a reviewer picks from when approving or rejecting a timesheet entry.',
    to: '/platform/pmo-admin/timesheet-review-reasons',
    cta: 'Manage review reasons →',
  },
  {
    icon: CalendarRange,
    title: 'Timesheet Work Categories',
    description: 'Add the category options (Governance, Data Migration, Defect Fixing, etc.) offered when logging time.',
    to: '/platform/pmo-admin/timesheet-work-categories',
    cta: 'Manage work categories →',
  },
  {
    icon: Tags,
    title: 'Timesheet Overtime Types',
    description: 'Add the classification options (After Hours, Public Holiday, etc.) offered on the Overtime grid.',
    to: '/platform/pmo-admin/timesheet-overtime-types',
    cta: 'Manage overtime types →',
  },
  {
    icon: Settings,
    title: 'Timesheet Settings',
    description: 'Set standard daily hours, overtime maximums, and the standard working week for timesheets.',
    to: '/platform/pmo-admin/timesheet-settings',
    cta: 'Manage timesheet settings →',
  },
  {
    icon: Layers,
    title: 'Project Classifications',
    description: 'Define complexity levels and link them to which template governance a project inherits.',
    to: '/platform/pmo-admin/project-classifications',
    cta: 'Manage classifications →',
  },
  {
    icon: Package,
    title: 'Capability Profile',
    description: 'Pick a starting tier (Essential/Standard/Advanced/Comprehensive) for which capabilities your organisation sees by default.',
    to: '/platform/pmo-admin/capability-profile',
    cta: 'Choose a capability profile →',
  },
  {
    icon: FileStack,
    title: 'Templates',
    description: 'Industry templates and their governance — required stage gates and approval chains.',
    to: '/platform/pmo/industry-templates',
    cta: 'Open templates →',
  },
  {
    icon: GitBranch,
    title: 'Workflows & Approval Chains',
    description: 'Reusable, ordered approval-chain templates a project template can require.',
    to: '/platform/pmo-admin/approval-chains',
    cta: 'Manage approval chains →',
  },
  {
    icon: ShieldCheck,
    title: 'Authorities',
    description: 'Delegated authority, approval thresholds, and escalation levels.',
    to: '/platform/pmo-admin/authorities',
    cta: 'Manage authorities →',
  },
  {
    icon: Users,
    title: 'Roles & Responsibilities',
    description: 'Custom organisation roles and default RACI per role and record type.',
    to: '/platform/pmo-admin/roles-responsibilities',
    cta: 'Manage roles & responsibilities →',
  },
  {
    icon: Database,
    title: 'Reference Data',
    description: 'Project types, statuses, funding sources, portfolio and budget categories, and more.',
    to: '/platform/pmo-admin',
    cta: 'Open reference data →',
  },
]

export default function PmoConfigurationHome() {
  const navigate = useNavigate()

  return (
    <div className="min-h-full bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <Compass className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">PMO Configuration</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Set up your organisation's methodology, classifications, templates, workflows, authorities, roles, and reference data — once, in one place.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {CARDS.map((card) => {
            const Icon = card.icon
            return (
              <div key={card.title} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-5 flex flex-col">
                <Icon className="h-7 w-7 text-emerald-600 dark:text-emerald-400 mb-3" aria-hidden />
                <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-1">{card.title}</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 flex-1">{card.description}</p>
                <button
                  type="button"
                  onClick={() => navigate(card.to)}
                  className="mt-4 text-left text-sm font-medium text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300"
                >
                  {card.cta}
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

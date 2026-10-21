/**
 * PMO Configuration Zone — guided landing page (v982 Phase 2)
 * Single entry point into methodology, classifications, templates, workflows/approval chains,
 * authorities, roles & responsibilities, and reference data — closing the PRD's "PMO
 * configuration exists only as scattered settings with no guided entry point" gap. Also the
 * target of Phase 1's "Getting Started as PMO Admin" CTA.
 * Route: /simulator/pmo/configuration
 */
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Compass, Sliders, Layers, FileStack, GitBranch, ShieldCheck, Users, Database, ArrowLeft, Package, Tags, UserCog, ClipboardCheck, CalendarRange, Settings, Sparkles, Search,
} from 'lucide-react'
import { useViewMode } from '@nidus/shared/hooks/useViewMode'
import { useSortableTable } from '@nidus/shared/hooks/useSortableTable'
import { getDisplayRowNumber } from '@nidus/shared/utils/tableRowNumberUtils'
import ViewToggle from '@nidus/ui/ViewToggle'
import ExportListMenu from '@nidus/ui/ExportListMenu'
import RowNumberBadge from '@nidus/ui/RowNumberBadge'
import { RowActionButton } from '@nidus/ui'
import { TableHeaderCell, TableRowNumberHeader, TableRowNumberCell } from '@nidus/ui/Table'

const CARDS = [
  {
    icon: Sliders,
    title: 'Delivery Methodology',
    description: 'Default methodology (Hybrid, Structured, Standards-based, Agile) and whether projects may override it.',
    to: '/simulator/pmo/dashboard',
    cta: 'Open methodology settings →',
  },
  {
    icon: Tags,
    title: 'Risk Categories',
    description: 'Add the categories and sub-categories used when a risk is logged. Built-in names stay as they are.',
    to: '/simulator/pmo/risk-categories',
    cta: 'Manage risk categories →',
  },
  {
    icon: Layers,
    title: 'Project Classifications',
    description: 'Define complexity levels and link them to which template governance a project inherits.',
    to: '/simulator/pmo/project-classifications',
    cta: 'Manage classifications →',
  },
  {
    icon: UserCog,
    title: 'Assignment Roles',
    description: 'Add the role options (Lead, Contributor, Reviewer, etc.) offered when assigning a resource.',
    to: '/simulator/pmo/assignment-roles',
    cta: 'Manage assignment roles →',
  },
  {
    icon: ClipboardCheck,
    title: 'Timesheet Review Reasons',
    description: 'Add the predefined reasons a reviewer picks from when approving or rejecting a timesheet entry.',
    to: '/simulator/pmo/timesheet-review-reasons',
    cta: 'Manage review reasons →',
  },
  {
    icon: CalendarRange,
    title: 'Timesheet Work Categories',
    description: 'Add the category options (Governance, Data Migration, Defect Fixing, etc.) offered when logging time.',
    to: '/simulator/pmo/timesheet-work-categories',
    cta: 'Manage work categories →',
  },
  {
    icon: Tags,
    title: 'Timesheet Overtime Types',
    description: 'Add the classification options (After Hours, Public Holiday, etc.) offered on the Overtime grid.',
    to: '/simulator/pmo/timesheet-overtime-types',
    cta: 'Manage overtime types →',
  },
  {
    icon: Settings,
    title: 'Timesheet Settings',
    description: 'Set standard daily hours, overtime maximums, and the standard working week for timesheets.',
    to: '/simulator/pmo/timesheet-settings',
    cta: 'Manage timesheet settings →',
  },
  {
    icon: Package,
    title: 'Capability Profile',
    description: 'Pick a starting tier (Essential/Standard/Advanced/Comprehensive) for which capabilities your organisation sees by default.',
    to: '/simulator/pmo/capability-profile',
    cta: 'Choose a capability profile →',
  },
  {
    icon: Sparkles,
    title: 'AI Settings',
    description: 'Accept the AI notice, turn Ask Nidus on or off, set how long conversations are kept, and check AI credit usage.',
    to: '/simulator/organisation/ai-settings',
    cta: 'Open AI settings →',
  },
  {
    icon: FileStack,
    title: 'Templates',
    description: 'Industry templates and their governance — required stage gates and approval chains.',
    to: '/simulator/pmo/organisational-templates',
    cta: 'Open templates →',
  },
  {
    icon: GitBranch,
    title: 'Workflows & Approval Chains',
    description: 'Reusable, ordered approval-chain templates a project template can require.',
    to: '/simulator/pmo/approval-chains',
    cta: 'Manage approval chains →',
  },
  {
    icon: ShieldCheck,
    title: 'Authorities',
    description: 'Delegated authority, approval thresholds, and escalation levels.',
    to: '/simulator/pmo/authorities',
    cta: 'Manage authorities →',
  },
  {
    icon: Users,
    title: 'Roles & Responsibilities',
    description: 'Custom organisation roles and default RACI per role and record type.',
    to: '/simulator/pmo/roles-responsibilities',
    cta: 'Manage roles & responsibilities →',
  },
  {
    icon: Database,
    title: 'Reference Data',
    description: 'Project types, statuses, funding sources, portfolio and budget categories, and more.',
    to: '/simulator/pmo/project-types',
    cta: 'Open reference data →',
  },
]

const EXPORT_COLUMNS = [
  { key: 'title', label: 'Area' },
  { key: 'description', label: 'Description' },
]

const DEFAULT_SORT = { column: 'title', direction: 'asc' }

const SORT_ACCESSORS = {
  title: (card) => card.title,
  description: (card) => card.description,
}

export default function PmoConfigurationHome() {
  const navigate = useNavigate()
  const [viewMode, setViewMode] = useViewMode('pmo-configuration-home', 'list')
  const [search, setSearch] = useState('')
  const { handleSort, getSortDirectionForColumn, sortedData } = useSortableTable({
    defaultSort: DEFAULT_SORT,
    storageKey: 'nidus-pmo-configuration-home',
  })

  const displayCards = useMemo(() => {
    const q = search.trim().toLowerCase()
    const filtered = q
      ? CARDS.filter((card) => card.title.toLowerCase().includes(q) || card.description.toLowerCase().includes(q))
      : CARDS
    return sortedData(filtered, SORT_ACCESSORS)
  }, [search, sortedData])

  const exportData = useMemo(
    () => displayCards.map((card) => ({ title: card.title, description: card.description })),
    [displayCards],
  )

  const openAction = (card) => (
    <RowActionButton variant="view" label={`Open ${card.title}`} onClick={() => navigate(card.to)} />
  )

  return (
    <div className="w-full">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <Compass className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">PMO Configuration</h1>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Set up your organisation's methodology, classifications, templates, workflows, authorities, roles, and reference data — once, in one place.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search configuration areas..."
              className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ExportListMenu
              columns={EXPORT_COLUMNS}
              data={exportData}
              baseFilename="PMO-Configuration-Areas"
              disabled={!displayCards.length}
            />
            <ViewToggle value={viewMode} onChange={setViewMode} ariaLabel="PMO configuration layout" />
          </div>
        </div>

        {displayCards.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-800">
            <p className="text-gray-700 dark:text-gray-200">No configuration areas match your search.</p>
          </div>
        ) : viewMode === 'list' ? (
          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <TableRowNumberHeader />
                  <TableHeaderCell sortable sortDirection={getSortDirectionForColumn('title')} onSort={() => handleSort('title')}>Area</TableHeaderCell>
                  <TableHeaderCell sortable sortDirection={getSortDirectionForColumn('description')} onSort={() => handleSort('description')}>Description</TableHeaderCell>
                  <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wider text-gray-700 dark:text-gray-200">Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayCards.map((card, index) => {
                  const Icon = card.icon
                  return (
                    <tr key={card.title} className="border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <TableRowNumberCell number={getDisplayRowNumber(index)} />
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2 font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">
                          <Icon className="h-4 w-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" aria-hidden />
                          {card.title}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-gray-700 dark:text-gray-200">{card.description}</td>
                      <td className="px-3 py-3">
                        <div className="flex justify-end">{openAction(card)}</div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayCards.map((card, index) => {
              const Icon = card.icon
              return (
                <div key={card.title} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-5 flex flex-col">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <RowNumberBadge number={getDisplayRowNumber(index)} />
                      <Icon className="h-7 w-7 text-emerald-600 dark:text-emerald-400" aria-hidden />
                    </div>
                    {openAction(card)}
                  </div>
                  <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-1">{card.title}</h2>
                  <p className="text-sm text-gray-700 dark:text-gray-200 flex-1">{card.description}</p>
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
        )}
      </div>
    </div>
  )
}

/**
 * Shared tab chrome for a record's detail/edit surface (v866, generalised v871).
 * Two ways to use it:
 *  - Simple 2-3 tab shape (most forms): pass detailsLabel/auditLabel/extraTab as
 *    before — nothing changes for existing callers without extraTab.
 *    When `extraTab` is set (e.g. Signatories), order is:
 *    Details → extraTab → Audit details.
 *  - Arbitrary tab count (forms with more than one content section plus Audit,
 *    e.g. IssueForm's Details/Ownership/Impact/Links/Audit): pass an explicit
 *    `tabs` array instead; it fully overrides the legacy props.
 * @param {{
 *   activeTab: string,
 *   onChange: (tab: string) => void,
 *   tabs?: { value: string, label: string }[] | null,
 *   detailsLabel?: string,
 *   auditLabel?: string,
 *   ariaLabel?: string,
 *   extraTab?: { value: string, label: string } | null,
 * }} props
 */
export default function DetailAuditTabList({
  activeTab,
  onChange,
  tabs = null,
  detailsLabel = 'Details',
  auditLabel = 'Audit details',
  ariaLabel = 'Record sections',
  extraTab = null,
}) {
  const resolvedTabs = tabs || [
    { value: 'details', label: detailsLabel },
    ...(extraTab ? [extraTab] : []),
    { value: 'audit', label: auditLabel },
  ]

  const tabClass = (selected) =>
    `border-b-2 px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
      selected
        ? 'border-blue-600 text-gray-900 dark:border-blue-300 dark:text-gray-100'
        : 'border-transparent text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100'
    }`

  return (
    <div
      className="flex flex-wrap gap-2 border-b border-gray-200 dark:border-gray-700"
      role="tablist"
      aria-label={ariaLabel}
    >
      {resolvedTabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          role="tab"
          aria-selected={activeTab === tab.value}
          onClick={() => onChange(tab.value)}
          className={tabClass(activeTab === tab.value)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

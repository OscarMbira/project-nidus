/**
 * Small dashboard summary tile (label + big number), optionally clickable.
 * Matches the visual weight already hand-rolled across every register Dashboard tab.
 * Pass `onClick` to make the card navigate to the filtered record list it represents —
 * omit it for calculated/aggregate cards (averages, percentages, blended metrics) that
 * have no single coherent list of records behind them (see CLAUDE.md rule 64).
 *
 * @param {{
 *   label: string,
 *   value: React.ReactNode,
 *   icon?: React.ComponentType,
 *   accentClassName?: string,
 *   iconClassName?: string,
 *   borderClassName?: string,
 *   onClick?: () => void,
 *   className?: string,
 * }} props
 */
export default function DashboardStatCard({
  label,
  value,
  icon: Icon,
  accentClassName = 'text-gray-900 dark:text-white',
  iconClassName = 'text-gray-400 dark:text-gray-500',
  borderClassName = 'border-gray-200 dark:border-gray-700',
  onClick,
  className = '',
}) {
  const content = (
    <>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
        {Icon && <Icon className={`h-5 w-5 shrink-0 ${iconClassName}`} />}
      </div>
      <p className={`text-2xl font-bold ${accentClassName}`}>{value}</p>
    </>
  );

  const baseClassName = `bg-white dark:bg-gray-800 rounded-lg border ${borderClassName} p-4 text-left w-full ${className}`.trim();

  if (!onClick) {
    return <div className={baseClassName}>{content}</div>;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`${baseClassName} cursor-pointer transition-colors hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900`}
    >
      {content}
    </button>
  );
}

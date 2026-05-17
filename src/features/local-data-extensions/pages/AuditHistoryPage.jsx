import { useLdeContext } from './LocalDataExtensionsRoutes'
import FieldAuditHistory from '../components/FieldAuditHistory'

export default function AuditHistoryPage() {
  const { platformDb, accountId } = useLdeContext()
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/40 p-4">
      <FieldAuditHistory platformDb={platformDb} accountId={accountId} />
    </div>
  )
}

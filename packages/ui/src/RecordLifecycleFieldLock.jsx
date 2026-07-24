export function isRecordLifecycleLocked(recordStatus) {
  return recordStatus === 'unauthorised'
}

export function RecordLifecycleLockBanner() {
  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-100">
      This record is locked for editing until the pending change is approved or rejected in Record Lifecycle.
    </div>
  )
}

export function RecordLifecycleFieldLock({ recordStatus, children, className = '' }) {
  const locked = isRecordLifecycleLocked(recordStatus)

  return (
    <div className={className}>
      {locked && (
        <div className="mb-4">
          <RecordLifecycleLockBanner />
        </div>
      )}
      <fieldset disabled={locked} className="min-w-0 border-0 p-0 m-0 disabled:opacity-95">
        {children}
      </fieldset>
    </div>
  )
}

export default RecordLifecycleFieldLock

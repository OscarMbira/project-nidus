/**
 * TRUE once a column exists on a table for this client (asked once per page session). Used by forms
 * whose new columns come from SQL the owner runs later (v1338): until then the field stays hidden and
 * is not sent, so saves keep working.
 */
const cache = new WeakMap()

export function isColumnAvailable(db, table, column) {
  if (!db || !table || !column) return Promise.resolve(false)
  if (!cache.has(db)) cache.set(db, new Map())
  const perDb = cache.get(db)
  const key = `${table}.${column}`
  if (!perDb.has(key)) {
    perDb.set(key, db.from(table).select(column).limit(1).then(({ error }) => !error, () => false))
  }
  return perDb.get(key)
}

/** Test hook. */
export function resetColumnProbe(db) {
  cache.delete(db)
}

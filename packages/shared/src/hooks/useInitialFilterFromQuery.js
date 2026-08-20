import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Reads a fixed set of query params intended to pre-seed a list/register page's filter
 * state from an inbound dashboard-card link (see CLAUDE.md rule 64 — clickable summary
 * cards). Returns only the params actually present in the URL; the caller merges the
 * result into its own filter state shape (which varies per page) via its own setFilters
 * call, typically in a one-time effect on mount.
 *
 * @param {string[]} paramNames - query param names to look for, e.g. ['status', 'risk_level']
 * @returns {Record<string, string>} present params only, keyed by name
 */
export function useInitialFilterFromQuery(paramNames) {
  const [searchParams] = useSearchParams();
  return useMemo(() => {
    const result = {};
    for (const name of paramNames) {
      const v = searchParams.get(name);
      if (v != null && v !== '') result[name] = v;
    }
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, paramNames.join(',')]);
}

export default useInitialFilterFromQuery;

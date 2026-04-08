import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import {
  decodeProjectRouteSegment,
  looksLikeProjectUuid,
  resolveProjectIdFromRouteSegment,
} from '../utils/projectRouteParam';

/**
 * Resolves /platform/projects/:idOrCode → real projects.id for API calls.
 * `routeKey` is the decoded URL segment (preserve for building links).
 */
export function usePlatformProjectId() {
  const params = useParams();
  const raw = params.projectId ?? params.id;

  const decoded = useMemo(() => decodeProjectRouteSegment(raw), [raw]);

  const [projectId, setProjectId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    if (!decoded) {
      setProjectId(null);
      setLoading(false);
      setError('missing');
      return () => {};
    }

    setError(null);

    if (looksLikeProjectUuid(decoded)) {
      setProjectId(decoded);
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    setLoading(true);
    setProjectId(null);

    resolveProjectIdFromRouteSegment(decoded).then((id) => {
      if (cancelled) return;
      if (id) {
        setProjectId(id);
        setError(null);
      } else {
        setProjectId(null);
        setError('not_found');
      }
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [decoded]);

  return {
    /** Resolved UUID for Supabase project_id / .eq('id', ...) */
    projectId,
    /** Decoded path segment (project code or uuid string) */
    routeKey: decoded || null,
    loading,
    error,
  };
}

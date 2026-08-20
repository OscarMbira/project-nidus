import { useState, useEffect, useMemo } from 'react';
import { useParams, useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import {
  decodeProjectRouteSegment,
  looksLikeProjectUuid,
  resolveProjectIdFromRouteSegment,
  resolveProjectRouteKeyFromId,
} from '@nidus/shared/utils/projectRouteParam';
import { readCurrentPmProjectId } from '@nidus/shared/utils/currentProjectStorage';

/**
 * Resolves /platform/projects/:idOrCode → real projects.id for API calls.
 * `routeKey` is the decoded URL segment (preserve for building links).
 *
 * Fallback chain (each step only applies when the previous found nothing) — purely additive,
 * so the 100+ existing callers on routes with a real path param are unaffected:
 *   1. Route path param (`:projectId` / `:id`) — unchanged, existing behaviour.
 *   2. `?projectId=` query string — for route trees with no project path segment (e.g. /pm/*).
 *   3. The PM area's last-selected "current project" (localStorage) — so sidebar-driven
 *      navigation into /pm/* pages (which carries no query param at all) still resolves.
 */
export function usePlatformProjectId() {
  const params = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const raw =
    params.projectId ??
    params.id ??
    searchParams.get('projectId') ??
    (searchParams.get('entityType') === 'project' ? searchParams.get('entityId') : null) ??
    searchParams.get('entityId') ??
    readCurrentPmProjectId();

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

  // /pm/* routes carry no project path segment, so a raw-UUID ?projectId= would otherwise stay
  // in the address bar forever. Rewrite it to project_code once resolvable — idempotent, since
  // after the replace the param is no longer a UUID and this effect no-ops. Only the `projectId`
  // query param is normalized; the entityId/entityType=project legacy fallback already has its
  // own redirect handling on specific pages (v864 Templates).
  useEffect(() => {
    const qp = searchParams.get('projectId');
    if (!qp || !looksLikeProjectUuid(qp)) return undefined;
    let cancelled = false;
    resolveProjectRouteKeyFromId(qp).then((code) => {
      if (cancelled || !code || code === qp) return;
      const next = new URLSearchParams(searchParams);
      next.set('projectId', code);
      setSearchParams(next, { replace: true });
    });
    return () => {
      cancelled = true;
    };
  }, [searchParams, setSearchParams]);

  // Nested routes (e.g. /platform/projects/:projectId/lessons) carry a raw-UUID bookmark
  // or legacy link forever unless rewritten to project_code — same idea as the ?projectId=
  // rewrite above, but for the :projectId / :id path segment. Idempotent: once rewritten the
  // segment is no longer a UUID and this effect no-ops.
  useEffect(() => {
    const pathParam = params.projectId ?? params.id;
    if (!pathParam || !looksLikeProjectUuid(pathParam)) return undefined;
    let cancelled = false;
    resolveProjectRouteKeyFromId(pathParam).then((code) => {
      if (cancelled || !code || code === pathParam) return;
      const segmentRe = new RegExp(`(^|/)${pathParam}(?=/|$)`);
      if (!segmentRe.test(location.pathname)) return;
      const nextPath = location.pathname.replace(segmentRe, `$1${code}`);
      navigate({ pathname: nextPath, search: location.search, hash: location.hash }, { replace: true });
    });
    return () => {
      cancelled = true;
    };
  }, [params.projectId, params.id, location.pathname, location.search, location.hash, navigate]);

  return {
    /** Resolved UUID for Supabase project_id / .eq('id', ...) */
    projectId,
    /** Decoded path segment (project code or uuid string) */
    routeKey: decoded || null,
    loading,
    error,
  };
}

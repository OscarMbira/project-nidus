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
 * Fallback chain (each step only applies when the previous is not a real project):
 *   1. Route path param `:projectId`.
 *   2. Route path param `:id` only on `/projects/:id`.
 *   3. `?projectId=` when it resolves to a project row.
 *   4. The PM area's last-selected project in localStorage.
 * A UUID that is not a project is skipped.
 */
export function usePlatformProjectId() {
  const params = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const queryProjectId = searchParams.get('projectId');
  const entityType = searchParams.get('entityType');
  const entityId = searchParams.get('entityId');
  const storedProjectId = readCurrentPmProjectId();
  const onProjectPath = /\/projects\/[^/]+/.test(location.pathname);
  const explicitKey = useMemo(() => {
    const raw = params.projectId
      || (onProjectPath ? params.id : null)
      || queryProjectId
      || (entityType === 'project' ? entityId : null);
    return decodeProjectRouteSegment(raw) || '';
  }, [params.projectId, params.id, onProjectPath, queryProjectId, entityType, entityId]);

  const [projectId, setProjectId] = useState(null);
  const [routeKey, setRouteKey] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [explicitMiss, setExplicitMiss] = useState(false);

  const applyResolved = (id, key) => {
    setProjectId(id);
    setRouteKey(key);
    setError(null);
    setLoading(false);
  };

  useEffect(() => {
    let cancelled = false;
    if (!explicitKey) {
      setExplicitMiss(true);
      return () => {
        cancelled = true;
      };
    }

    setExplicitMiss(false);
    setLoading(true);
    setError(null);

    ;(async () => {
      const legacyEntityId = entityType === 'project' ? decodeProjectRouteSegment(entityId) : '';
      if (
        legacyEntityId
        && explicitKey === legacyEntityId
        && looksLikeProjectUuid(explicitKey)
        && explicitKey !== queryProjectId
      ) {
        if (!cancelled) applyResolved(explicitKey, explicitKey);
        return;
      }

      const id = await resolveProjectIdFromRouteSegment(explicitKey);
      if (cancelled) return;
      if (!id) {
        setExplicitMiss(true);
        return;
      }
      let key = explicitKey;
      if (looksLikeProjectUuid(explicitKey)) {
        const code = await resolveProjectRouteKeyFromId(id);
        if (cancelled) return;
        if (code && !looksLikeProjectUuid(code)) key = code;
      }
      applyResolved(id, key);
    })();

    return () => {
      cancelled = true;
    };
  }, [explicitKey, entityType, entityId, queryProjectId]);

  useEffect(() => {
    if (!explicitMiss) return undefined;
    let cancelled = false;
    const fallbacks = [];
    const decodedValue = decodeProjectRouteSegment(storedProjectId);
    if (decodedValue && decodedValue !== explicitKey) fallbacks.push(decodedValue);

    if (fallbacks.length === 0) {
      setProjectId(null);
      setRouteKey(null);
      setLoading(false);
      setError(explicitKey ? 'not_found' : 'missing');
      return () => {
        cancelled = true;
      };
    }

    setLoading(true);
    ;(async () => {
      for (const candidate of fallbacks) {
        const id = await resolveProjectIdFromRouteSegment(candidate);
        if (cancelled) return;
        if (!id) continue;
        let key = candidate;
        if (looksLikeProjectUuid(candidate)) {
          const code = await resolveProjectRouteKeyFromId(id);
          if (cancelled) return;
          if (code && !looksLikeProjectUuid(code)) key = code;
        }
        if (!cancelled) applyResolved(id, key);
        return;
      }
      if (cancelled) return;
      setProjectId(null);
      setRouteKey(null);
      setError('not_found');
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [explicitMiss, explicitKey, storedProjectId]);

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
    const pathParam = params.projectId ?? (onProjectPath ? params.id : null);
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
  }, [params.projectId, params.id, onProjectPath, location.pathname, location.search, location.hash, navigate]);

  // Write the resolved project back into ?projectId= whenever it's missing or stale. Covers two
  // cases: (1) a ?projectId= pointing at some other record's id, and (2) no ?projectId= in the
  // URL at all — resolved purely via localStorage fallback (e.g. a bare /platform/timesheets
  // link). Without this second case, sibling components that read ?projectId= directly off the
  // URL (PlanningProjectBar, for one) never learn which project was actually resolved, and show
  // an empty "Select a project…" picker even though the page itself has real project-scoped data
  // loaded.
  // Skipped for the legacy entityType=project pattern (v864) — that has its own dedicated
  // resolution shortcut above (applyResolved called directly, no DB round-trip), and writing
  // ?projectId= here would re-trigger a second, redundant resolution pass against it.
  useEffect(() => {
    if (explicitKey && !explicitMiss) return undefined;
    if (loading || !routeKey || !projectId || entityType === 'project') return undefined;
    const qp = searchParams.get('projectId');
    if (qp === routeKey || qp === projectId) return undefined;
    const next = new URLSearchParams(searchParams);
    next.set('projectId', routeKey);
    setSearchParams(next, { replace: true });
    return undefined;
  }, [searchParams, setSearchParams, loading, routeKey, projectId, entityType]);

  return {
    /** Resolved UUID for Supabase project_id / .eq('id', ...) */
    projectId,
    /** Project code when known, otherwise the resolved project id */
    routeKey,
    loading,
    error,
  };
}

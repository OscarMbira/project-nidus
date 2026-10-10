import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { usePlatformProjectId } from '@nidus/shared/hooks/usePlatformProjectId.js';
import { platformProjectPath } from '@nidus/shared/utils/projectRouteParam';
import { fetchFollowOnActions } from '../../services/closingProjectService';
import FollowOnActionsForm from '../../components/structured/closing/FollowOnActionsForm';

export default function FollowOnActionFormPage() {
  const { projectId, routeKey } = usePlatformProjectId();
  const { actionKey } = useParams();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const isCreate = !actionKey || actionKey === 'create';
  const readOnly = !isCreate && !pathname.endsWith('/edit');
  const [action, setAction] = useState(null);
  const [loading, setLoading] = useState(!isCreate);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (!projectId || isCreate) return undefined;
    let cancelled = false;
    setLoading(true);
    fetchFollowOnActions(projectId)
      .then((rows) => {
        if (cancelled) return;
        const match = (rows || []).find((row) => row.action_reference === actionKey || row.id === actionKey);
        setAction(match || null);
        setMissing(!match);
      })
      .catch((error) => {
        console.error('Error loading follow-on action:', error);
        if (!cancelled) {
          setAction(null);
          setMissing(true);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [projectId, actionKey, isCreate]);

  return (
    <div className="w-full px-3 sm:px-4 lg:px-5 xl:px-6 py-6">
      {!projectId || loading ? (
        <p className="text-sm text-gray-700 dark:text-gray-200">Loading follow-on action…</p>
      ) : missing ? (
        <p className="text-sm text-gray-700 dark:text-gray-200">This follow-on action could not be found.</p>
      ) : (
        <FollowOnActionsForm
          projectId={projectId}
          action={isCreate ? null : action}
          readOnly={readOnly}
          onEdit={readOnly ? () => navigate(platformProjectPath(routeKey || projectId, 'closure', 'actions', actionKey, 'edit')) : undefined}
          onClose={() => navigate(-1)}
        />
      )}
    </div>
  );
}

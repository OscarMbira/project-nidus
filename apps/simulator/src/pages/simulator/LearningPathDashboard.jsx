import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { simDb } from '../../services/supabase/supabaseClient';
import { SIMULATOR_ROLE_LIST } from '@nidus/shared/constants/simulatorRoles';
import {
  getLearningPathsForRole,
  getLearningPathProgress,
  computePathCompletion,
  updateModuleProgress,
} from '../../services/sim/learningPathService';

export default function LearningPathDashboard() {
  const [params] = useSearchParams();
  const roleId = params.get('role') || SIMULATOR_ROLE_LIST[0].id;
  const [paths, setPaths] = useState([]);
  const [progress, setProgress] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data: { user } } = await simDb.auth.getUser();
        const rolePaths = await getLearningPathsForRole(roleId);
        setPaths(rolePaths);
        if (user && rolePaths[0]) {
          setProgress(await getLearningPathProgress(user.id, rolePaths[0].id));
        }
      } catch (err) {
        console.error('LearningPathDashboard:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [roleId]);

  const path = paths[0];
  const completion = path ? computePathCompletion(path, progress) : 0;
  const modules = [...(path?.modules || [])].sort((a, b) => (a.order || 0) - (b.order || 0));

  const startModule = async (moduleId) => {
    const { data: { user } } = await simDb.auth.getUser();
    if (!user || !path) return;
    await updateModuleProgress(user.id, path.id, moduleId, { status: 'in_progress' });
    window.location.href = `/simulator/learning/module/${moduleId}?path=${path.id}&role=${roleId}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {SIMULATOR_ROLE_LIST.map((r) => (
          <Link
            key={r.id}
            to={`/simulator/learning?role=${r.id}`}
            className={`px-3 py-1.5 rounded-full text-xs font-medium ${
              r.id === roleId ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
            }`}
          >
            {r.label}
          </Link>
        ))}
      </div>
      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin h-10 w-10 border-b-2 border-blue-600 rounded-full" /></div>
      ) : !path ? (
        <p className="text-gray-500 dark:text-gray-400">No learning path configured for this role.</p>
      ) : (
        <>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{path.title}</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{path.description}</p>
            <div className="mt-3 h-2 rounded-full bg-gray-200 dark:bg-gray-700 max-w-md">
              <div className="h-full bg-blue-600 rounded-full" style={{ width: `${completion}%` }} />
            </div>
            <p className="text-xs text-gray-500 mt-1">{completion}% complete · ~{path.estimated_hours}h estimated</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {modules.map((mod) => {
              const row = progress.find((p) => p.module_id === mod.id);
              const status = row?.status || 'not_started';
              return (
                <div key={mod.id} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
                  <p className="text-xs text-gray-500 uppercase">{status.replace('_', ' ')}</p>
                  <h3 className="font-semibold text-gray-900 dark:text-white">{mod.title}</h3>
                  <button
                    type="button"
                    onClick={() => startModule(mod.id)}
                    className="mt-3 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {status === 'completed' ? 'Review module' : 'Continue'}
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

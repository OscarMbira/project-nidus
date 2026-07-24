import { useEffect, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { simDb } from '../../services/supabase/supabaseClient';
import { getLearningPathsForRole, updateModuleProgress } from '../../services/sim/learningPathService';

export default function LearningModule() {
  const { moduleId } = useParams();
  const [params] = useSearchParams();
  const pathId = params.get('path');
  const roleId = params.get('role');
  const [path, setPath] = useState(null);
  const [module, setModule] = useState(null);

  useEffect(() => {
    (async () => {
      if (!roleId) return;
      const paths = await getLearningPathsForRole(roleId);
      const active = paths.find((p) => p.id === pathId) || paths[0];
      setPath(active);
      setModule((active?.modules || []).find((m) => m.id === moduleId));
    })();
  }, [moduleId, pathId, roleId]);

  const markComplete = async () => {
    const { data: { user } } = await simDb.auth.getUser();
    if (!user || !path) return;
    await updateModuleProgress(user.id, path.id, moduleId, { status: 'completed', score: 100 });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link to={`/simulator/learning?role=${roleId}`} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
        ← Back to learning path
      </Link>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{module?.title || 'Learning module'}</h1>
      <p className="text-gray-600 dark:text-gray-400">
        Complete theory review and linked practice scenarios for this module. Progress is saved to your learning path.
      </p>
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Module content is loaded from the configured learning path. Launch a role-filtered scenario from the library to apply this module in practice.
        </p>
        <Link
          to={`/simulator/scenarios?role=${roleId}`}
          className="inline-block text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          Browse scenarios for this role
        </Link>
        <button
          type="button"
          onClick={markComplete}
          className="block mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
        >
          Mark module complete
        </button>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { simDb } from '../../../services/supabase/supabaseClient';
import { getLearningPathsForRole, computePathCompletion, getLearningPathProgress } from '../../../services/sim/learningPathService';

export default function LearningPathWidget({ roleId }) {
  const [path, setPath] = useState(null);
  const [completion, setCompletion] = useState(0);
  const [nextModule, setNextModule] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await simDb.auth.getUser();
        const paths = await getLearningPathsForRole(roleId);
        if (!paths.length) return;
        const active = paths[0];
        setPath(active);
        if (user) {
          const progress = await getLearningPathProgress(user.id, active.id);
          setCompletion(computePathCompletion(active, progress));
          const modules = [...(active.modules || [])].sort((a, b) => (a.order || 0) - (b.order || 0));
          const next = modules.find((m) => !progress.some((p) => p.module_id === m.id && p.status === 'completed'));
          setNextModule(next || null);
        }
      } catch (err) {
        console.error('LearningPathWidget:', err);
      }
    })();
  }, [roleId]);

  if (!path) return null;

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5">
      <div className="flex items-center justify-between gap-4 mb-3">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Continue Learning</h2>
        <Link to={`/simulator/learning?role=${roleId}`} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
          View path
        </Link>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{path.title}</p>
      <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden mb-2">
        <div className="h-full bg-blue-600 transition-all" style={{ width: `${completion}%` }} />
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        {completion}% complete{nextModule ? ` · Next: ${nextModule.title}` : ' · Path complete'}
      </p>
    </div>
  );
}

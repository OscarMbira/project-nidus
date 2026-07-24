import { useEffect, useState } from 'react';
import { simDb } from '../../../services/supabase/supabaseClient';
import { getRoleCompetencies, getRoleScoreSummary } from '../../../services/sim/roleScoringService';
import { getPreferredRole } from '../../../services/sim/rolePreferenceService';

export default function RoleScoreDashboard({ roleId: roleIdProp }) {
  const [roleId, setRoleId] = useState(roleIdProp);
  const [competencies, setCompetencies] = useState([]);
  const [scores, setScores] = useState({ competencies: {}, overall: 0 });

  useEffect(() => {
    (async () => {
      const { data: { user } } = await simDb.auth.getUser();
      const rid = roleIdProp || (user ? await getPreferredRole(user.id) : null) || 'project_manager';
      setRoleId(rid);
      setCompetencies(await getRoleCompetencies(rid));
      if (user) setScores(await getRoleScoreSummary(user.id, rid));
    })();
  }, [roleIdProp]);

  const maxVal = Math.max(...Object.values(scores.competencies || {}), 1);

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5">
      <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Role competency profile</h3>
      <p className="text-2xl font-bold text-blue-600 mb-4">{Math.round(scores.overall)}%</p>
      <div className="space-y-3">
        {(competencies.length ? competencies : Object.keys(scores.competencies).map((k) => ({ competency_key: k, competency_label: k }))).map((c) => {
          const val = scores.competencies[c.competency_key] || 0;
          return (
            <div key={c.competency_key}>
              <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                <span>{c.competency_label}</span>
                <span>{Math.round(val)}%</span>
              </div>
              <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-700">
                <div
                  className="h-full bg-blue-600 rounded-full"
                  style={{ width: `${(val / maxVal) * 100}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

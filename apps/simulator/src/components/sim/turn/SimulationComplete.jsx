import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { simDb } from '../../../services/supabase/supabaseClient';
import { getTurnHistory } from '../../../services/sim/turnEngineService';
import { getRoleScoreSummary } from '../../../services/sim/roleScoringService';
import { checkCertificateEligibility } from '../../../services/sim/certificateEligibilityService';
import { getSimulatorRoleById } from '@nidus/shared/constants/simulatorRoles';

export default function SimulationComplete() {
  const { runId } = useParams();
  const [run, setRun] = useState(null);
  const [turns, setTurns] = useState([]);
  const [scores, setScores] = useState(null);
  const [certCheck, setCertCheck] = useState(null);

  useEffect(() => {
    (async () => {
      const { data: runRow } = await simDb.from('simulation_runs').select('*').eq('id', runId).single();
      setRun(runRow);
      setTurns(await getTurnHistory(runId));
      if (runRow?.user_id && runRow?.selected_role) {
        setScores(await getRoleScoreSummary(runRow.user_id, runRow.selected_role));
        const templates = {
          project_coordinator: 'coord_foundations',
          pmo_analyst: 'pmo_analyst_certified',
          project_manager: 'pm_professional',
          programme_manager: 'pgm_advanced',
          portfolio_manager: 'pf_strategic',
        };
        const code = templates[runRow.selected_role];
        if (code) setCertCheck(await checkCertificateEligibility(runRow.user_id, code));
      }
    })();
  }, [runId]);

  const role = getSimulatorRoleById(run?.selected_role);
  const criticalTurns = turns
    .filter((t) => (t.decisions_made || []).length > 0)
    .slice(-5);

  return (
    <div className="max-w-3xl mx-auto space-y-6 py-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Simulation Debrief</h1>
      <p className="text-gray-600 dark:text-gray-400">
        {role?.label || 'Practice'} simulation complete. Review your competency scores and critical decision moments.
      </p>

      {scores && (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-3">Competency scores</h2>
          <p className="text-3xl font-bold text-blue-600 mb-4">{Math.round(scores.overall)}% overall</p>
          <ul className="space-y-2 text-sm">
            {Object.entries(scores.competencies || {}).map(([k, v]) => (
              <li key={k} className="flex justify-between text-gray-600 dark:text-gray-400">
                <span className="capitalize">{k.replace(/_/g, ' ')}</span>
                <span>{Math.round(v)}%</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5">
        <h2 className="font-semibold text-gray-900 dark:text-white mb-3">Critical moments</h2>
        <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
          {criticalTurns.map((t) => (
            <li key={t.id}>Turn {t.turn_number}: {(t.decisions_made || []).length} decision(s)</li>
          ))}
        </ul>
      </div>

      {certCheck && (
        <div className={`rounded-lg p-4 text-sm ${certCheck.eligible ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200' : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}>
          {certCheck.eligible ? 'You meet certificate eligibility criteria.' : `Certificate: ${certCheck.reason}`}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <Link to="/simulator/scenarios" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium">Try again</Link>
        <Link to="/simulator/role-selection" className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium">Try different role</Link>
      </div>
    </div>
  );
}

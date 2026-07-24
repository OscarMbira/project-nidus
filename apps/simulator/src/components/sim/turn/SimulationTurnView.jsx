import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { simDb } from '../../../services/supabase/supabaseClient';
import { getCurrentTurn, advanceTurn, skipTurn, getTurnHistory, initializeTurns } from '../../../services/sim/turnEngineService';
import { getEventsForTurn, submitDecision, generateTurnEvents } from '../../../services/sim/turnEventService';
import { calculateTurnMetrics, getProjectHealthScore } from '../../../services/sim/turnMetricsService';
import { completeCollaborativeSessionIfReady } from '../../../services/sim/simCollaborativeSessionService';
import TurnTimeline from './TurnTimeline';
import TurnDashboard from './TurnDashboard';
import TurnEventCard from './TurnEventCard';
import TurnSummary from './TurnSummary';
import CollaborativeRolesRollup from './CollaborativeRolesRollup';
import PendingEscalationsPanel from '../PendingEscalationsPanel';

export default function SimulationTurnView() {
  const { runId } = useParams();
  const navigate = useNavigate();
  const [run, setRun] = useState(null);
  const [turn, setTurn] = useState(null);
  const [turns, setTurns] = useState([]);
  const [events, setEvents] = useState([]);
  const [metrics, setMetrics] = useState({});
  const [health, setHealth] = useState({ score: 0, rag: 'amber' });
  const [loading, setLoading] = useState(true);
  const [showSummary, setShowSummary] = useState(false);
  const [fastForwarding, setFastForwarding] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: runRow } = await simDb.from('simulation_runs').select('*, scenarios(*)').eq('id', runId).single();
      setRun(runRow);
      const roleId = runRow?.selected_role || runRow?.scenarios?.target_role || 'project_manager';

      let history = await getTurnHistory(runId);
      if (!history.length) {
        await initializeTurns(runId, { roleId });
        history = await getTurnHistory(runId);
      }

      const current = await getCurrentTurn(runId);
      setTurns(history);
      setTurn(current);

      if (current) {
        let turnEvents = await getEventsForTurn(current.id, roleId);
        if (!turnEvents.length) {
          turnEvents = await generateTurnEvents(runId, current.turn_number, roleId, {
            scenario: runRow?.scenarios,
            projectState: current.metrics_snapshot || {},
          });
        }
        setEvents(turnEvents);

        const metricRows = await calculateTurnMetrics(runId, current.turn_number, {
          roleId,
          projectState: current.metrics_snapshot || {},
        });
        const snapshot = Object.fromEntries((metricRows || []).map((m) => [m.metric_name, Number(m.metric_value)]));
        setMetrics(snapshot);
        setHealth(await getProjectHealthScore(runId, current.turn_number));
      }
    } catch (err) {
      console.error('SimulationTurnView load:', err);
    } finally {
      setLoading(false);
    }
  }, [runId]);

  useEffect(() => { load(); }, [load]);

  const pendingEvents = events.filter((e) => e.requires_decision && !e.user_decision);

  const handleDecision = async (eventId, optionId) => {
    await submitDecision(eventId, optionId, metrics);
    await load();
  };

  const handleAdvance = async () => {
    if (pendingEvents.length) return;
    setShowSummary(true);
  };

  const confirmAdvance = async () => {
    setShowSummary(false);
    const next = await advanceTurn(runId);
    if (!next) {
      if (run?.collaborative_session_id) {
        await completeCollaborativeSessionIfReady(run.collaborative_session_id);
      }
      navigate(`/simulator/runs/${runId}/complete`);
      return;
    }
    await load();
  };

  const handleFastForward = async () => {
    if (pendingEvents.length) return;
    setFastForwarding(true);
    await new Promise((r) => setTimeout(r, 2000));
    await skipTurn(runId);
    setFastForwarding(false);
    await load();
  };

  if (loading) {
    return <div className="flex justify-center py-20"><div className="animate-spin h-12 w-12 border-b-2 border-blue-600 rounded-full" /></div>;
  }

  const roleId = run?.selected_role || run?.scenarios?.target_role || 'project_manager';
  const totalTurns = turns.length;
  const turnLabel = turn ? `Turn ${turn.turn_number} of ${totalTurns} — ${turn.sim_date_start} to ${turn.sim_date_end}` : 'Simulation complete';

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-900 py-2 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">{turnLabel}</h1>
        {turn && totalTurns > 0 && (
          <div className="mt-2 h-2 rounded-full bg-gray-200 dark:bg-gray-700">
            <div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: `${(turn.turn_number / totalTurns) * 100}%` }} />
          </div>
        )}
      </div>

      <TurnTimeline turns={turns} currentTurnNumber={turn?.turn_number} />

      {run?.collaborative_session_id && (
        <PendingEscalationsPanel sessionId={run.collaborative_session_id} myRole={roleId} />
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <TurnDashboard roleId={roleId} metrics={metrics} health={health} />
        {run?.collaborative_session_id && (
          <CollaborativeRolesRollup collaborativeSessionId={run.collaborative_session_id} myRunId={runId} />
        )}
      </div>

      <div className="space-y-3">
        <h2 className="font-semibold text-gray-900 dark:text-white">Events requiring attention</h2>
        {events.length ? events.map((ev) => (
          <TurnEventCard key={ev.id} event={ev} onSelectOption={handleDecision} />
        )) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">No events this turn — you can fast-forward.</p>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={!!pendingEvents.length}
          onClick={handleAdvance}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium"
        >
          End Turn & Advance
        </button>
        {!pendingEvents.length && (
          <button
            type="button"
            onClick={handleFastForward}
            disabled={fastForwarding}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            {fastForwarding ? 'Fast-forwarding…' : 'Fast-Forward'}
          </button>
        )}
      </div>

      {showSummary && (
        <TurnSummary
          decisions={turn?.decisions_made || []}
          onContinue={confirmAdvance}
        />
      )}
    </div>
  );
}

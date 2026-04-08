/**
 * Stage Gate Oversight Component
 * 
 * Displays table of all upcoming/overdue gates with:
 * - Current stage, next gate date, approval status, gate owner
 * - Overdue flag (red highlight)
 * - "Flag Overdue" action
 * - "Escalate" action
 * - Filter by status (pending/approved/rejected/overdue)
 */

import { useState, useEffect, memo } from 'react';
import { Clock, AlertTriangle, CheckCircle, XCircle, Flag, ArrowUp, FileX } from 'lucide-react';
import { getStageGates, getOverdueGates, flagOverdueGate, escalateGate, checkGateDocumentCompliance } from '../../../services/stageGateService';
import { platformDb } from '../../../services/supabase/supabaseClient';
import { useNavigate } from 'react-router-dom';

// Note: stageGateService uses 'stage_gates' table, but actual table is 'stage_boundaries'
// This component will work with stageGateService, but may need adjustment if table name differs

const StageGateOversight = memo(function StageGateOversight({ organizationId }) {
  const [gates, setGates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all', 'pending', 'overdue', 'approved', 'rejected'
  const [complianceChecks, setComplianceChecks] = useState({}); // Map of gateId -> compliance status
  const navigate = useNavigate();

  useEffect(() => {
    if (organizationId) {
      loadGates();
    }
  }, [organizationId, filter]);

  const loadGates = async () => {
    if (!organizationId) return;

    setLoading(true);
    setError(null);

    try {
      let result;
      if (filter === 'overdue') {
        result = await getOverdueGates(organizationId);
      } else {
        const filters = {};
        if (filter === 'pending') {
          filters.status = 'PENDING';
        } else if (filter === 'approved') {
          filters.status = 'APPROVED';
        } else if (filter === 'rejected') {
          filters.status = 'REJECTED';
        }
        result = await getStageGates(organizationId, filters);
      }

      if (result.success) {
        const gatesData = result.data || [];
        setGates(gatesData);
        
        // Check document compliance for each gate
        const complianceMap = {};
        for (const gate of gatesData) {
          try {
            const complianceResult = await checkGateDocumentCompliance(gate.id);
            if (complianceResult.success) {
              complianceMap[gate.id] = {
                can_approve: complianceResult.can_approve,
                missing_count: complianceResult.missing_documents_count || 0,
                unapproved_count: complianceResult.unapproved_documents_count || 0,
                blocking_reason: complianceResult.blocking_reason
              };
            }
          } catch (err) {
            console.warn(`Failed to check compliance for gate ${gate.id}:`, err);
          }
        }
        setComplianceChecks(complianceMap);
      } else {
        setError(result.error);
      }
    } catch (err) {
      console.error('Error loading stage gates:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFlagOverdue = async (gateId) => {
    try {
      const { data: { user } } = await platformDb.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: userRecord } = await platformDb
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .single();

      const result = await flagOverdueGate(gateId, userRecord?.id);
      
      if (result.success) {
        await loadGates();
      } else {
        alert('Failed to flag gate as overdue: ' + result.error);
      }
    } catch (error) {
      console.error('Error flagging gate:', error);
      alert('Failed to flag gate: ' + error.message);
    }
  };

  const handleEscalate = async (gateId) => {
    const escalationNotes = prompt('Enter escalation notes:');
    if (!escalationNotes) return;

    try {
      const { data: { user } } = await platformDb.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: userRecord } = await platformDb
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .single();

      const result = await escalateGate(gateId, userRecord?.id, escalationNotes);
      
      if (result.success) {
        await loadGates();
      } else {
        alert('Failed to escalate gate: ' + result.error);
      }
    } catch (error) {
      console.error('Error escalating gate:', error);
      alert('Failed to escalate gate: ' + error.message);
    }
  };

  const getStatusColor = (status) => {
    const s = status?.toLowerCase() || '';
    if (s === 'approved') return 'bg-green-900/30 text-green-400';
    if (s === 'rejected') return 'bg-red-900/30 text-red-400';
    if (s === 'pending' || s === 'not_started') return 'bg-yellow-900/30 text-yellow-400';
    return 'bg-gray-700 text-gray-400';
  };

  const getStatusIcon = (status) => {
    const s = status?.toLowerCase() || '';
    if (s === 'approved') return <CheckCircle className="h-4 w-4" />;
    if (s === 'rejected') return <XCircle className="h-4 w-4" />;
    return <Clock className="h-4 w-4" />;
  };

  if (loading) {
    return (
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-100 mb-4">Stage Gate Oversight</h2>
        <div className="bg-gray-800 rounded-lg p-6 animate-pulse">
          <div className="h-4 bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-12 bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mb-8">
        <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4">
          <p className="text-red-400">Error loading stage gates: {error}</p>
        </div>
      </div>
    );
  }

  // Filter gates by overdue status
  const filteredGates = gates.filter(gate => {
    if (filter === 'overdue') {
      return gate.is_overdue || (gate.planned_date && new Date(gate.planned_date) < new Date() && gate.status !== 'approved' && gate.status !== 'rejected');
    }
    return true;
  });

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-100">Stage Gate Oversight</h2>
        <div className="flex gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Gates</option>
            <option value="pending">Pending</option>
            <option value="overdue">Overdue</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {filteredGates.length === 0 ? (
        <div className="bg-gray-800 rounded-lg p-12 text-center">
          <Clock className="h-12 w-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">No stage gates found</p>
        </div>
      ) : (
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Project</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Document Compliance</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Gate Name</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Stage</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Planned Date</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Owner</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {filteredGates.map(gate => {
                  const isOverdue = gate.is_overdue || (gate.planned_date && new Date(gate.planned_date) < new Date() && gate.status !== 'approved' && gate.status !== 'rejected');
                  
                  return (
                    <tr 
                      key={gate.id} 
                      className={`hover:bg-gray-700/30 ${isOverdue ? 'bg-red-900/10' : ''}`}
                    >
                      <td className="px-4 py-3">
                        <button
                          onClick={() => gate.project?.id && navigate(`/platform/projects/${gate.project.id}`)}
                          className="text-blue-400 hover:text-blue-300 font-medium"
                        >
                          {gate.project?.project_name || 'Unknown Project'}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        {(() => {
                          const compliance = complianceChecks[gate.id];
                          if (!compliance) {
                            return <span className="text-gray-500 text-sm">Checking...</span>;
                          }
                          if (compliance.can_approve) {
                            return (
                              <div className="flex items-center gap-2 text-green-400">
                                <CheckCircle className="h-4 w-4" />
                                <span className="text-sm">Compliant</span>
                              </div>
                            );
                          }
                          return (
                            <div className="flex items-center gap-2 text-red-400" title={compliance.blocking_reason}>
                              <FileX className="h-4 w-4" />
                              <span className="text-sm">
                                {compliance.missing_count > 0 && `${compliance.missing_count} missing`}
                                {compliance.missing_count > 0 && compliance.unapproved_count > 0 && ', '}
                                {compliance.unapproved_count > 0 && `${compliance.unapproved_count} unapproved`}
                              </span>
                            </div>
                          );
                        })()}
                      </td>
                      <td className="px-4 py-3 text-gray-100">{gate.gate_name || gate.stage_name}</td>
                      <td className="px-4 py-3 text-gray-300">{gate.stage_name || 'N/A'}</td>
                      <td className="px-4 py-3">
                        {gate.planned_date ? (
                          <div className={`flex items-center gap-2 ${isOverdue ? 'text-red-400' : 'text-gray-300'}`}>
                            {isOverdue && <AlertTriangle className="h-4 w-4" />}
                            {new Date(gate.planned_date).toLocaleDateString()}
                          </div>
                        ) : (
                          <span className="text-gray-500">Not set</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className={`inline-flex items-center gap-2 px-2 py-1 rounded text-xs ${getStatusColor(gate.status || gate.gate_status)}`}>
                          {getStatusIcon(gate.status || gate.gate_status)}
                          <span>{gate.status || gate.gate_status || 'Unknown'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-300">
                        {gate.gate_owner?.full_name || gate.gate_owner_user_id || 'Unassigned'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          {isOverdue && gate.status !== 'approved' && gate.status !== 'rejected' && (
                            <>
                              <button
                                onClick={() => handleFlagOverdue(gate.id)}
                                className="p-1.5 text-yellow-400 hover:text-yellow-300 hover:bg-yellow-900/20 rounded transition-colors"
                                title="Flag as overdue"
                              >
                                <Flag className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleEscalate(gate.id)}
                                className="p-1.5 text-orange-400 hover:text-orange-300 hover:bg-orange-900/20 rounded transition-colors"
                                title="Escalate"
                              >
                                <ArrowUp className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
});

export default StageGateOversight;

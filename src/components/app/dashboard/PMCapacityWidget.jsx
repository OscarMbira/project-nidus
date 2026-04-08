/**
 * PM Capacity Widget Component
 * 
 * Displays table of all PMs with:
 * - Active project count
 * - Capacity status (Available / At Capacity / BREACH)
 * - Visual indicators (🟢🟡🔴)
 * - List of active projects per PM
 * - "Reassign PM" button for breached PMs
 */

import { useState, useEffect, memo } from 'react';
import { Users, AlertTriangle, CheckCircle, Clock, User } from 'lucide-react';
import { platformDb } from '../../../services/supabase/supabaseClient';
import ReassignPMModal from './ReassignPMModal';

const PMCapacityWidget = memo(function PMCapacityWidget({ organizationId }) {
  const [pmData, setPmData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPM, setSelectedPM] = useState(null);
  const [showReassignModal, setShowReassignModal] = useState(false);

  useEffect(() => {
    if (organizationId) {
      loadPMCapacityData();
    }
  }, [organizationId]);

  const loadPMCapacityData = async () => {
    if (!organizationId) return;

    setLoading(true);
    setError(null);

    try {
      // Get projects for this account
      const { data: accountProjects } = await platformDb
        .from('projects')
        .select('id')
        .eq('account_id', organizationId)
        .eq('is_deleted', false);

      if (!accountProjects || accountProjects.length === 0) {
        setPmData([]);
        setLoading(false);
        return;
      }

      // Query pm_capacity_view
      const { data, error: viewError } = await platformDb
        .from('pm_capacity_view')
        .select('*')
        .eq('pm_is_active', true)
        .eq('pm_is_deleted', false)
        .order('pm_name');

      if (viewError) {
        console.warn('Error querying pm_capacity_view, calculating manually:', viewError);
        // Fallback: calculate manually
        await calculatePMCapacityManually(accountProjects.map(p => p.id));
      } else {
        setPmData(data || []);
      }
    } catch (err) {
      console.error('Error loading PM capacity data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const calculatePMCapacityManually = async (projectIds) => {
    try {
      // Get all PM assignments for these projects
      const { data: assignments } = await platformDb
        .from('project_assignments')
        .select(`
          user_id,
          project_id,
          users:user_id (id, full_name, email),
          projects:project_id (
            id,
            project_name,
            project_code,
            status_id,
            project_statuses:status_id (status_name)
          )
        `)
        .in('project_id', projectIds)
        .eq('assignment_type', 'PROJECT_MANAGER')
        .eq('is_active', true)
        .eq('is_deleted', false);

      if (!assignments) {
        setPmData([]);
        return;
      }

      // Group by PM
      const pmMap = new Map();
      assignments.forEach(assignment => {
        const pmId = assignment.user_id;
        if (!pmMap.has(pmId)) {
          pmMap.set(pmId, {
            pm_user_id: pmId,
            pm_name: assignment.users?.full_name || assignment.users?.email || 'Unknown',
            pm_email: assignment.users?.email,
            active_projects_count: 0,
            active_project_ids: [],
            active_project_names: [],
            capacity_status: 'FREE'
          });
        }

        const pm = pmMap.get(pmId);
        const statusName = assignment.projects?.project_statuses?.status_name?.toLowerCase() || '';
        const isActive = ['active', 'in progress', 'in_progress'].includes(statusName);

        if (isActive && assignment.projects?.id) {
          pm.active_projects_count++;
          pm.active_project_ids.push(assignment.projects.id);
          pm.active_project_names.push(assignment.projects.project_name);
        }
      });

      // Calculate capacity status
      const pmArray = Array.from(pmMap.values()).map(pm => {
        if (pm.active_projects_count > 2) {
          pm.capacity_status = 'BREACH';
        } else if (pm.active_projects_count === 2) {
          pm.capacity_status = 'AT_CAPACITY';
        } else if (pm.active_projects_count === 1) {
          pm.capacity_status = 'AVAILABLE';
        } else {
          pm.capacity_status = 'FREE';
        }
        return pm;
      });

      setPmData(pmArray);
    } catch (err) {
      console.error('Error calculating PM capacity manually:', err);
      setError(err.message);
    }
  };

  const getCapacityColor = (status) => {
    switch (status) {
      case 'BREACH':
        return 'text-red-400 bg-red-900/20 border-red-500/50';
      case 'AT_CAPACITY':
        return 'text-yellow-400 bg-yellow-900/20 border-yellow-500/50';
      case 'AVAILABLE':
        return 'text-blue-400 bg-blue-900/20 border-blue-500/50';
      default:
        return 'text-green-400 bg-green-900/20 border-green-500/50';
    }
  };

  const getCapacityIcon = (status) => {
    switch (status) {
      case 'BREACH':
        return <AlertTriangle className="h-5 w-5 text-red-400" />;
      case 'AT_CAPACITY':
        return <Clock className="h-5 w-5 text-yellow-400" />;
      case 'AVAILABLE':
        return <CheckCircle className="h-5 w-5 text-blue-400" />;
      default:
        return <CheckCircle className="h-5 w-5 text-green-400" />;
    }
  };

  if (loading) {
    return (
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-100 mb-4">PM Capacity</h2>
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
          <p className="text-red-400">Error loading PM capacity: {error}</p>
        </div>
      </div>
    );
  }

  const breachedPMs = pmData.filter(pm => pm.capacity_status === 'BREACH');
  const atCapacityPMs = pmData.filter(pm => pm.capacity_status === 'AT_CAPACITY');

  return (
    <>
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-100">PM Capacity</h2>
          {breachedPMs.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-1 bg-red-900/20 border border-red-500/50 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-red-400" />
              <span className="text-sm text-red-400">
                {breachedPMs.length} PM{breachedPMs.length !== 1 ? 's' : ''} in breach
              </span>
            </div>
          )}
        </div>

        {pmData.length === 0 ? (
          <div className="bg-gray-800 rounded-lg p-12 text-center">
            <Users className="h-12 w-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No Project Managers found</p>
          </div>
        ) : (
          <div className="bg-gray-800 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-700/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">PM Name</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Active Projects</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Capacity Status</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Projects</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {pmData.map(pm => (
                    <tr key={pm.pm_user_id} className="hover:bg-gray-700/30">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-400" />
                          <div>
                            <div className="text-gray-100 font-medium">{pm.pm_name}</div>
                            {pm.pm_email && (
                              <div className="text-xs text-gray-400">{pm.pm_email}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-gray-100 font-semibold">
                          {pm.active_projects_count || 0}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg border ${getCapacityColor(pm.capacity_status)}`}>
                          {getCapacityIcon(pm.capacity_status)}
                          <span className="text-sm font-medium">{pm.capacity_status}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {(pm.active_project_names || []).slice(0, 3).map((name, idx) => (
                            <span
                              key={idx}
                              className="text-xs px-2 py-1 bg-gray-700 rounded text-gray-300"
                            >
                              {name}
                            </span>
                          ))}
                          {(pm.active_project_names || []).length > 3 && (
                            <span className="text-xs px-2 py-1 bg-gray-700 rounded text-gray-400">
                              +{(pm.active_project_names || []).length - 3} more
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {pm.capacity_status === 'BREACH' && (
                          <button
                            onClick={() => {
                              setSelectedPM(pm);
                              setShowReassignModal(true);
                            }}
                            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm transition-colors"
                          >
                            Reassign
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Reassign PM Modal */}
      {showReassignModal && selectedPM && (
        <ReassignPMModal
          pm={selectedPM}
          organizationId={organizationId}
          onClose={() => {
            setShowReassignModal(false);
            setSelectedPM(null);
          }}
          onSuccess={() => {
            setShowReassignModal(false);
            setSelectedPM(null);
            loadPMCapacityData();
          }}
        />
      )}
    </>
  );
});

export default PMCapacityWidget;

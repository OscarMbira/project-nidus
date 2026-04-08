/**
 * Reassign PM Modal Component
 * 
 * Allows PMO to reassign projects from one PM to another:
 * - Select project to reassign
 * - Select new PM (with capacity check)
 * - Reason for reassignment
 * - Audit log entry on confirm
 */

import { useState, useEffect, memo } from 'react';
import { X, Save, AlertTriangle } from 'lucide-react';
import { platformDb } from '../../../services/supabase/supabaseClient';
import { reassignPM } from '../../../services/pmCapacityService';
import { logAction } from '../../../services/pmoAuditService';

const ReassignPMModal = memo(function ReassignPMModal({ 
  pm, 
  organizationId, 
  onClose, 
  onSuccess 
}) {
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [newPMId, setNewPMId] = useState('');
  const [reason, setReason] = useState('');
  const [availablePMs, setAvailablePMs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingPMs, setLoadingPMs] = useState(true);
  const [error, setError] = useState(null);
  const [capacityCheck, setCapacityCheck] = useState(null);

  useEffect(() => {
    loadAvailablePMs();
  }, []);

  useEffect(() => {
    if (newPMId) {
      checkNewPMCapacity();
    } else {
      setCapacityCheck(null);
    }
  }, [newPMId]);

  const loadAvailablePMs = async () => {
    setLoadingPMs(true);
    try {
      // Get all PMs except the current one
      const { data: pmCapacityData } = await platformDb
        .from('pm_capacity_view')
        .select('pm_user_id, pm_name, pm_email, capacity_status, active_projects_count')
        .neq('pm_user_id', pm.pm_user_id)
        .eq('pm_is_active', true)
        .eq('pm_is_deleted', false)
        .order('pm_name');

      setAvailablePMs(pmCapacityData || []);
    } catch (error) {
      console.error('Error loading available PMs:', error);
    } finally {
      setLoadingPMs(false);
    }
  };

  const checkNewPMCapacity = async () => {
    if (!newPMId) return;

    try {
      const { data: newPMData } = await platformDb
        .from('pm_capacity_view')
        .select('capacity_status, active_projects_count')
        .eq('pm_user_id', newPMId)
        .single();

      if (newPMData) {
        const currentCount = newPMData.active_projects_count || 0;
        const willExceed = currentCount >= 2;
        
        setCapacityCheck({
          currentCount,
          willExceed,
          canAssign: currentCount < 2
        });
      }
    } catch (error) {
      console.error('Error checking PM capacity:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedProjectId || !newPMId) {
      setError('Please select both a project and a new PM');
      return;
    }

    if (capacityCheck?.willExceed) {
      setError('Selected PM is already at capacity (2 active projects). Cannot assign more projects.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await platformDb.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: userRecord } = await platformDb
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .single();

      // Reassign PM using service
      const result = await reassignPM(selectedProjectId, pm.pm_user_id, newPMId, userRecord?.id, reason);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to reassign PM');
      }

      // Audit logging is handled by reassignPM service

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error reassigning PM:', error);
      setError(error.message || 'Failed to reassign PM');
    } finally {
      setLoading(false);
    }
  };

  const projects = (pm.active_project_ids || []).map((id, idx) => ({
    id,
    name: pm.active_project_names?.[idx] || `Project ${id.substring(0, 8)}`
  }));

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div>
            <h3 className="text-xl font-semibold text-gray-100">Reassign PM</h3>
            <p className="text-sm text-gray-400 mt-1">
              Reassigning from: <span className="font-medium">{pm.pm_name}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-100"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 bg-red-900/20 border border-red-500/50 rounded-lg p-3 flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            {/* Select Project */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Select Project to Reassign *
              </label>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                required
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a project...</option>
                {projects.map(project => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Select New PM */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Select New PM *
              </label>
              <select
                value={newPMId}
                onChange={(e) => setNewPMId(e.target.value)}
                required
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a PM...</option>
                {loadingPMs ? (
                  <option disabled>Loading PMs...</option>
                ) : (
                  availablePMs.map(pmOption => (
                    <option key={pmOption.pm_user_id} value={pmOption.pm_user_id}>
                      {pmOption.pm_name} 
                      {pmOption.pm_email && ` (${pmOption.pm_email})`}
                      {pmOption.capacity_status === 'AT_CAPACITY' && ' - At Capacity'}
                      {pmOption.capacity_status === 'BREACH' && ' - BREACH'}
                    </option>
                  ))
                )}
              </select>
              {capacityCheck && (
                <div className={`mt-2 p-2 rounded-lg text-sm ${
                  capacityCheck.willExceed 
                    ? 'bg-red-900/20 text-red-400 border border-red-500/50'
                    : capacityCheck.currentCount === 1
                    ? 'bg-yellow-900/20 text-yellow-400 border border-yellow-500/50'
                    : 'bg-green-900/20 text-green-400 border border-green-500/50'
                }`}>
                  {capacityCheck.willExceed ? (
                    <span>⚠️ This PM is already at capacity (2 active projects). Cannot assign more.</span>
                  ) : capacityCheck.currentCount === 1 ? (
                    <span>⚠️ This PM has 1 active project. Assigning will put them at capacity.</span>
                  ) : (
                    <span>✓ This PM has {capacityCheck.currentCount} active project(s). Safe to assign.</span>
                  )}
                </div>
              )}
            </div>

            {/* Reason */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Reason for Reassignment
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter reason for reassignment..."
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || capacityCheck?.willExceed}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              <Save className="h-4 w-4" />
              {loading ? 'Reassigning...' : 'Reassign PM'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
});

export default ReassignPMModal;

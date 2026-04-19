/**
 * Exception Management Component
 * 
 * Displays list of projects in exception with:
 * - Exception reason, level, status
 * - "Raise Exception" button
 * - "Escalate Exception" action
 * - "Resolve Exception" action
 * - Visual indicators by level (low/medium/high/critical)
 */

import { useState, useEffect, memo } from 'react';
import { AlertCircle, AlertTriangle, XCircle, CheckCircle, Plus, ArrowUp } from 'lucide-react';
import { getAllExceptions, escalateException, resolveException } from '../../../services/exceptionService';
import { platformDb } from '../../../services/supabase/supabaseClient';
import { useNavigate } from 'react-router-dom';
import RaiseExceptionModal from './RaiseExceptionModal';

const ExceptionManagement = memo(function ExceptionManagement({ organizationId }) {
  const [exceptions, setExceptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('active'); // 'active', 'all', 'resolved', 'closed'
  const [showRaiseModal, setShowRaiseModal] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    if (organizationId) {
      loadExceptions();
    }
  }, [organizationId, filter]);

  const loadExceptions = async () => {
    if (!organizationId) return;

    setLoading(true);
    setError(null);

    try {
      const filters = {};
      if (filter === 'active') {
        filters.status = ['OPEN', 'ESCALATED', 'UNDER_REVIEW'];
      } else if (filter === 'resolved') {
        filters.status = 'RESOLVED';
      } else if (filter === 'closed') {
        filters.status = 'CLOSED';
      }

      const result = await getAllExceptions(organizationId, filters);

      if (result.success) {
        setExceptions(result.data || []);
      } else {
        setError(result.error);
      }
    } catch (err) {
      console.error('Error loading exceptions:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEscalate = async (exceptionId) => {
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

      const result = await escalateException(exceptionId, {
        escalated_to_user_id: userRecord?.id,
        escalation_notes: escalationNotes
      }, userRecord?.id);

      if (result.success) {
        await loadExceptions();
      } else {
        alert('Failed to escalate exception: ' + result.error);
      }
    } catch (error) {
      console.error('Error escalating exception:', error);
      alert('Failed to escalate: ' + error.message);
    }
  };

  const handleResolve = async (exceptionId) => {
    const resolutionNotes = prompt('Enter resolution notes:');
    if (!resolutionNotes) return;

    try {
      const { data: { user } } = await platformDb.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: userRecord } = await platformDb
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .single();

      const result = await resolveException(exceptionId, {
        resolution_notes: resolutionNotes
      }, userRecord?.id);

      if (result.success) {
        await loadExceptions();
      } else {
        alert('Failed to resolve exception: ' + result.error);
      }
    } catch (error) {
      console.error('Error resolving exception:', error);
      alert('Failed to resolve: ' + error.message);
    }
  };

  const getLevelColor = (level) => {
    const l = level?.toLowerCase() || '';
    if (l === 'critical') return 'bg-red-900/30 text-red-400 border-red-500/50';
    if (l === 'high') return 'bg-orange-900/30 text-orange-400 border-orange-500/50';
    if (l === 'medium') return 'bg-yellow-900/30 text-yellow-400 border-yellow-500/50';
    return 'bg-blue-900/30 text-blue-400 border-blue-500/50';
  };

  const getLevelIcon = (level) => {
    const l = level?.toLowerCase() || '';
    if (l === 'critical') return <XCircle className="h-5 w-5" />;
    if (l === 'high') return <AlertTriangle className="h-5 w-5" />;
    if (l === 'medium') return <AlertCircle className="h-5 w-5" />;
    return <AlertCircle className="h-5 w-5" />;
  };

  if (loading) {
    return (
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Exception Management</h2>
        <div className="bg-gray-200 dark:bg-gray-800 rounded-lg p-6 animate-pulse">
          <div className="h-4 bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-gray-700 rounded"></div>
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
          <p className="text-red-400">Error loading exceptions: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Exception Management</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setShowRaiseModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              <Plus className="h-4 w-4" />
              Raise Exception
            </button>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="active">Active</option>
              <option value="all">All</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </div>

        {exceptions.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-12 text-center border border-gray-200 dark:border-gray-700">
            <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <p className="text-gray-400">No exceptions found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {exceptions.map(exception => (
              <div
                key={exception.id}
                className={`bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 border-l-4 ${
                  exception.exception_level === 'CRITICAL' ? 'border-l-red-500' :
                  exception.exception_level === 'HIGH' ? 'border-l-orange-500' :
                  exception.exception_level === 'MEDIUM' ? 'border-l-yellow-500' :
                  'border-l-blue-500'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {getLevelIcon(exception.exception_level)}
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100">{exception.exception_title}</h3>
                      <div className={`px-2 py-1 rounded text-xs border ${getLevelColor(exception.exception_level)}`}>
                        {exception.exception_level}
                      </div>
                      <div className={`px-2 py-1 rounded text-xs ${
                        exception.exception_status === 'OPEN' ? 'bg-blue-900/30 text-blue-400' :
                        exception.exception_status === 'ESCALATED' ? 'bg-red-900/30 text-red-400' :
                        exception.exception_status === 'UNDER_REVIEW' ? 'bg-yellow-900/30 text-yellow-400' :
                        'bg-gray-700 text-gray-400'
                      }`}>
                        {exception.exception_status}
                      </div>
                    </div>
                    <p className="text-sm text-gray-300 mb-2">{exception.exception_reason}</p>
                    {exception.exception_description && (
                      <p className="text-sm text-gray-400 mb-2">{exception.exception_description}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-gray-400">
                      <button
                        onClick={() => exception.project?.id && navigate(`/platform/projects/${exception.project.id}`)}
                        className="text-blue-400 hover:text-blue-300"
                      >
                        Project: {exception.project?.project_name || 'Unknown'}
                      </button>
                      {exception.raised_by_user && (
                        <span>Raised by: {exception.raised_by_user.full_name}</span>
                      )}
                      {exception.raised_at && (
                        <span>Raised: {new Date(exception.raised_at).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    {exception.exception_status !== 'RESOLVED' && exception.exception_status !== 'CLOSED' && (
                      <>
                        {exception.exception_status !== 'ESCALATED' && (
                          <button
                            onClick={() => handleEscalate(exception.id)}
                            className="p-2 text-orange-400 hover:text-orange-300 hover:bg-orange-900/20 rounded transition-colors"
                            title="Escalate"
                          >
                            <ArrowUp className="h-5 w-5" />
                          </button>
                        )}
                        <button
                          onClick={() => handleResolve(exception.id)}
                          className="p-2 text-green-400 hover:text-green-300 hover:bg-green-900/20 rounded transition-colors"
                          title="Resolve"
                        >
                          <CheckCircle className="h-5 w-5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Raise Exception Modal */}
      {showRaiseModal && (
        <RaiseExceptionModal
          organizationId={organizationId}
          onClose={() => setShowRaiseModal(false)}
          onSuccess={() => {
            setShowRaiseModal(false);
            loadExceptions();
          }}
        />
      )}
    </>
  );
});

export default ExceptionManagement;

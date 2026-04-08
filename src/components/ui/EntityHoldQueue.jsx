/**
 * EntityHoldQueue Component
 *
 * Reusable component for displaying entity-specific hold queue.
 * Shows drafts on hold with search, filtering, and actions.
 *
 * @version v201
 * @created 2026-01-31
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Filter,
  Trash2,
  Play,
  Clock,
  AlertTriangle,
  Folder,
  RefreshCw,
  ChevronRight,
  MoreVertical
} from 'lucide-react';
import { getUserDraftsByEntity, deleteDraft, resumeDraft, clearExpiredDrafts, getDraftStats } from '../../services/draftQueueService';
import { getEntityConfig, getEntityLabel, getEntityIcon, getEditRoute, getCreateRoute } from '../../config/draftQueueConfig';
import { DraftStatusBadge, ExpiryBadge, CompletionBadge } from './DraftStatusBadge';
import { DraftLimitMeter } from './DraftLimitWarning';

/**
 * EntityHoldQueue Component
 *
 * @param {object} props - Component props
 * @param {string} props.entityType - Entity type to show drafts for
 * @param {string} [props.title] - Custom title
 * @param {boolean} [props.showSearch] - Show search input
 * @param {boolean} [props.showFilters] - Show filter options
 * @param {boolean} [props.showLimitMeter] - Show draft limit meter
 * @param {function} [props.onResume] - Custom resume handler
 * @param {function} [props.onDelete] - Custom delete handler
 * @param {string} [props.className] - Additional CSS classes
 */
export function EntityHoldQueue({
  entityType,
  title,
  showSearch = true,
  showFilters = true,
  showLimitMeter = true,
  onResume,
  onDelete,
  className = ''
}) {
  const navigate = useNavigate();
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [draftStats, setDraftStats] = useState(null);
  const [actionLoading, setActionLoading] = useState({});

  const entityConfig = getEntityConfig(entityType);
  const EntityIcon = getEntityIcon(entityType);
  const displayTitle = title || `${getEntityLabel(entityType, true)} On Hold`;

  // Load drafts
  const loadDrafts = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [draftsData, statsData] = await Promise.all([
        getUserDraftsByEntity(entityType),
        getDraftStats()
      ]);

      setDrafts(draftsData);
      setDraftStats(statsData);
    } catch (err) {
      console.error('Error loading drafts:', err);
      setError('Failed to load drafts');
    } finally {
      setLoading(false);
    }
  }, [entityType]);

  useEffect(() => {
    loadDrafts();
  }, [loadDrafts]);

  // Handle resume
  const handleResume = async (draft) => {
    if (onResume) {
      onResume(draft);
      return;
    }

    setActionLoading(prev => ({ ...prev, [draft.id]: 'resuming' }));

    try {
      await resumeDraft(draft.id);

      // Navigate to edit route with draft data
      const editRoute = draft.entity_id
        ? getEditRoute(entityType, draft.entity_id)
        : getCreateRoute(entityType);

      if (editRoute) {
        navigate(editRoute, {
          state: {
            draftId: draft.id,
            formData: draft.form_data,
            isResumingDraft: true
          }
        });
      }
    } catch (err) {
      console.error('Error resuming draft:', err);
      setError('Failed to resume draft');
    } finally {
      setActionLoading(prev => ({ ...prev, [draft.id]: null }));
    }
  };

  // Handle delete
  const handleDelete = async (draft) => {
    if (onDelete) {
      onDelete(draft);
      return;
    }

    if (!window.confirm('Are you sure you want to delete this draft? This cannot be undone.')) {
      return;
    }

    setActionLoading(prev => ({ ...prev, [draft.id]: 'deleting' }));

    try {
      await deleteDraft(draft.id);
      setDrafts(prev => prev.filter(d => d.id !== draft.id));
      // Refresh stats
      const stats = await getDraftStats();
      setDraftStats(stats);
    } catch (err) {
      console.error('Error deleting draft:', err);
      setError('Failed to delete draft');
    } finally {
      setActionLoading(prev => ({ ...prev, [draft.id]: null }));
    }
  };

  // Handle clear expired
  const handleClearExpired = async () => {
    if (!window.confirm('Clear all expired drafts? This cannot be undone.')) {
      return;
    }

    try {
      await clearExpiredDrafts();
      await loadDrafts();
    } catch (err) {
      console.error('Error clearing expired drafts:', err);
      setError('Failed to clear expired drafts');
    }
  };

  // Filter drafts
  const filteredDrafts = drafts.filter(draft => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const title = (draft.entity_title || '').toLowerCase();
      const reason = (draft.hold_reason || '').toLowerCase();
      if (!title.includes(query) && !reason.includes(query)) {
        return false;
      }
    }

    // Status filter
    if (statusFilter && draft.hold_status !== statusFilter) {
      return false;
    }

    return true;
  });

  // Format relative time
  const formatRelativeTime = (date) => {
    if (!date) return '';
    const now = new Date();
    const then = new Date(date);
    const diffMs = now - then;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return then.toLocaleDateString();
  };

  // Render loading state
  if (loading) {
    return (
      <div className={`bg-gray-800 rounded-xl border border-gray-700 ${className}`}>
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-700 rounded w-1/3" />
            <div className="h-10 bg-gray-700 rounded" />
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-24 bg-gray-700 rounded-lg" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gray-800 rounded-xl border border-gray-700 ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 rounded-lg">
              <EntityIcon className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">{displayTitle}</h2>
              <p className="text-sm text-gray-400">
                {filteredDrafts.length} draft{filteredDrafts.length !== 1 ? 's' : ''} on hold
              </p>
            </div>
          </div>
          <button
            onClick={loadDrafts}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>

        {/* Draft Limit Meter */}
        {showLimitMeter && draftStats && (
          <div className="mt-4">
            <DraftLimitMeter
              count={draftStats.active_drafts}
              max={15}
              showText={true}
            />
          </div>
        )}
      </div>

      {/* Search and Filters */}
      {(showSearch || showFilters) && (
        <div className="px-6 py-3 border-b border-gray-700 flex items-center gap-4">
          {showSearch && (
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search drafts..."
                className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-gray-600 rounded-lg
                  text-white placeholder-gray-500
                  focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>
          )}

          {showFilters && (
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg
                  text-white text-sm
                  focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="active">Active</option>
                <option value="expired">Expired</option>
                <option value="">All</option>
              </select>
            </div>
          )}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mx-6 mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400" />
          <span className="text-sm text-red-400">{error}</span>
        </div>
      )}

      {/* Drafts List */}
      <div className="p-6">
        {filteredDrafts.length === 0 ? (
          <div className="text-center py-12">
            <Folder className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-400">No drafts on hold</h3>
            <p className="text-sm text-gray-500 mt-1">
              {searchQuery
                ? 'No drafts match your search'
                : `You don't have any ${getEntityLabel(entityType, true).toLowerCase()} on hold`}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredDrafts.map((draft) => (
              <DraftCard
                key={draft.id}
                draft={draft}
                entityType={entityType}
                onResume={() => handleResume(draft)}
                onDelete={() => handleDelete(draft)}
                isLoading={actionLoading[draft.id]}
                formatRelativeTime={formatRelativeTime}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {drafts.some(d => d.hold_status === 'expired') && (
        <div className="px-6 py-3 border-t border-gray-700 flex items-center justify-between">
          <span className="text-sm text-gray-400">
            {drafts.filter(d => d.hold_status === 'expired').length} expired draft(s)
          </span>
          <button
            onClick={handleClearExpired}
            className="text-sm text-red-400 hover:text-red-300 font-medium"
          >
            Clear Expired
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * DraftCard Component
 *
 * Individual draft item in the queue
 */
function DraftCard({
  draft,
  entityType,
  onResume,
  onDelete,
  isLoading,
  formatRelativeTime
}) {
  const [showMenu, setShowMenu] = useState(false);

  const EntityIcon = getEntityIcon(entityType);

  return (
    <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4 hover:border-gray-600 transition-colors">
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className="p-2 bg-gray-700 rounded-lg flex-shrink-0">
          <EntityIcon className="w-5 h-5 text-gray-400" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Title and badges */}
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-white font-medium truncate">
                {draft.entity_title || 'Untitled'}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <DraftStatusBadge status={draft.hold_status} size="sm" />
                {draft.form_mode === 'edit' && (
                  <span className="text-xs text-gray-500">(Edit)</span>
                )}
              </div>
            </div>
            <CompletionBadge percentage={draft.completion_percentage} size="sm" />
          </div>

          {/* Progress bar */}
          <div className="mt-3">
            <div className="w-full h-1.5 bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  draft.completion_percentage >= 80
                    ? 'bg-green-500'
                    : draft.completion_percentage >= 50
                    ? 'bg-amber-500'
                    : 'bg-blue-500'
                }`}
                style={{ width: `${draft.completion_percentage}%` }}
              />
            </div>
          </div>

          {/* Hold reason */}
          {draft.hold_reason && (
            <p className="mt-2 text-sm text-gray-400 line-clamp-2">
              "{draft.hold_reason}"
            </p>
          )}

          {/* Meta info */}
          <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              Held: {formatRelativeTime(draft.last_saved_at)}
            </span>
            <ExpiryBadge expiresAt={draft.expires_at} size="sm" />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={onResume}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5
              bg-amber-600 hover:bg-amber-700
              text-white text-sm font-medium rounded-lg
              transition-colors disabled:opacity-50"
          >
            {isLoading === 'resuming' ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            <span>Resume</span>
          </button>

          <button
            onClick={onDelete}
            disabled={isLoading}
            className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
            title="Delete draft"
          >
            {isLoading === 'deleting' ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default EntityHoldQueue;

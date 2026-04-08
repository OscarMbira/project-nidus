import { useState, useMemo } from 'react';
import { User, Edit2, Trash2, Eye, Users, Building, Mail, Phone, MapPin } from 'lucide-react';
import { deleteStakeholder } from '../../services/stakeholderService';
import { getCompletenessPercent } from '../../utils/stakeholderCompleteness';
import { TableHeaderCell } from '../ui/Table';
import { useSortableTable } from '../../hooks/useSortableTable';

export default function StakeholderRegister({
  stakeholders = [],
  loadError = null,
  onEdit,
  onView,
  onRefresh,
  onDeleteSuccess,
  viewMode = 'grid',
}) {
  const [deleting, setDeleting] = useState(null);

  const { handleSort, getSortDirectionForColumn, sortedData } = useSortableTable({
    defaultSort: { column: 'stakeholder_name', direction: 'asc' },
    storageKey: 'nidus-stakeholder-register-sort',
  });

  const stakeholderAccessors = useMemo(
    () => ({
      stakeholder_name: (r) => r.stakeholder_name ?? '',
      stakeholder_type: (r) => r.stakeholder_type ?? '',
      stakeholder_status: (r) => r.stakeholder_status ?? '',
    }),
    []
  );

  const displayRows = useMemo(
    () => sortedData(stakeholders, stakeholderAccessors),
    [stakeholders, sortedData, stakeholderAccessors]
  );

  const handleDelete = async (stakeholder) => {
    if (!window.confirm(`Are you sure you want to delete stakeholder "${stakeholder.stakeholder_name}"?`)) {
      return;
    }

    try {
      setDeleting(stakeholder.id);
      await deleteStakeholder(stakeholder.id);
      onDeleteSuccess?.(stakeholder);
      onRefresh?.();
    } catch (error) {
      console.error('Error deleting stakeholder:', error);
      alert('Error deleting stakeholder: ' + error.message);
    } finally {
      setDeleting(null);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'inactive':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      case 'departed':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'internal':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'external':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
      case 'customer':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'supplier':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
      case 'regulator':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  if (!stakeholders.length) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
        <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        {loadError ? (
          <>
            <h3 className="text-xl font-semibold text-red-600 dark:text-red-400 mb-2">
              Could not load stakeholders
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-2">
              {loadError}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
              Check your connection and permissions. If using Supabase, run <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">SQL/v304.3_stakeholders_rls_policies.sql</code> so the list can load.
            </p>
            {onRefresh && (
              <button
                type="button"
                onClick={() => onRefresh()}
                className="px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 border border-current rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20"
              >
                Retry
              </button>
            )}
          </>
        ) : (
          <>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No Stakeholders
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-2">
              Add stakeholders to track engagement and communication
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
              Run <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">v304.6_stakeholder_project_id_nullable.sql</code> then <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">v304.2_seed_60_stakeholders.sql</code> in Supabase for sample data (no project required). Then click Refresh to load.
            </p>
            {onRefresh && (
              <button
                type="button"
                onClick={() => onRefresh()}
                className="px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
              >
                Refresh list
              </button>
            )}
          </>
        )}
      </div>
    );
  }

  if (viewMode === 'grid') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayRows.map((stakeholder) => (
          <div
            key={stakeholder.id}
            className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 min-h-[220px] flex flex-col hover:shadow-md transition-shadow"
          >
            <button
              type="button"
              onClick={() => onView?.(stakeholder)}
              className="text-left flex-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-lg"
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{stakeholder.stakeholder_name}</h3>
                <span className={`shrink-0 px-2 py-1 text-xs font-medium rounded capitalize ${getTypeColor(stakeholder.stakeholder_type)}`}>
                  {stakeholder.stakeholder_type || 'N/A'}
                </span>
              </div>
              <div className="flex flex-wrap gap-2 mb-3">
                <span className={`px-2 py-1 text-xs font-medium rounded capitalize ${getStatusColor(stakeholder.stakeholder_status)}`}>
                  {stakeholder.stakeholder_status || 'active'}
                </span>
                {(stakeholder.power_level != null || stakeholder.interest_level != null) && (
                  <span className="px-2 py-1 text-xs rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                    Influence {stakeholder.power_level ?? '—'} / Interest {stakeholder.interest_level ?? '—'}
                  </span>
                )}
              </div>
              {stakeholder.stakeholder_organization && (
                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{stakeholder.stakeholder_organization}</p>
              )}
            </button>
            <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700" onClick={(e) => e.stopPropagation()}>
              {onView && (
                <button type="button" onClick={() => onView(stakeholder)} className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700">
                  View
                </button>
              )}
              {onEdit && (
                <button type="button" onClick={() => onEdit(stakeholder)} className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700">
                  Edit
                </button>
              )}
              <button
                type="button"
                onClick={() => handleDelete(stakeholder)}
                disabled={deleting === stakeholder.id}
                className="text-xs px-2 py-1 rounded border border-red-200 dark:border-red-800 text-red-600 disabled:opacity-50"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <TableHeaderCell
                sortable
                sortDirection={getSortDirectionForColumn('stakeholder_name')}
                onSort={() => handleSort('stakeholder_name')}
                className="!normal-case"
              >
                Stakeholder
              </TableHeaderCell>
              <TableHeaderCell
                sortable
                sortDirection={getSortDirectionForColumn('stakeholder_type')}
                onSort={() => handleSort('stakeholder_type')}
                className="!normal-case"
              >
                Type
              </TableHeaderCell>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Organization
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Contact
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Expectations
              </th>
              <TableHeaderCell
                sortable
                sortDirection={getSortDirectionForColumn('stakeholder_status')}
                onSort={() => handleSort('stakeholder_status')}
                className="!normal-case"
              >
                Status
              </TableHeaderCell>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider min-w-[180px] sticky right-0 bg-gray-50 dark:bg-gray-700 shadow-[-4px_0_8px_rgba(0,0,0,0.06)] dark:shadow-[-4px_0_8px_rgba(0,0,0,0.2)] z-10">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {displayRows.map((stakeholder) => (
              <tr
                key={stakeholder.id}
                className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${onView ? 'cursor-pointer' : ''}`}
                onClick={() => onView?.(stakeholder)}
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                      <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {stakeholder.stakeholder_name}
                        </span>
                        <span
                          className="text-xs px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300"
                          title="Record completeness"
                        >
                          {getCompletenessPercent(stakeholder)}%
                        </span>
                      </div>
                      {stakeholder.stakeholder_title && (
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {stakeholder.stakeholder_title}
                        </div>
                      )}
                      {stakeholder.stakeholder_reference && (
                        <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                          {stakeholder.stakeholder_reference}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs font-medium rounded capitalize ${getTypeColor(stakeholder.stakeholder_type)}`}>
                    {stakeholder.stakeholder_type || 'N/A'}
                  </span>
                  {stakeholder.is_decision_maker && (
                    <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                      Decision Maker
                    </div>
                  )}
                  {stakeholder.is_influencer && (
                    <div className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                      Influencer
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-1 text-sm text-gray-900 dark:text-white">
                    <Building className="h-3 w-3 text-gray-400" />
                    {stakeholder.stakeholder_organization || 'N/A'}
                  </div>
                  {stakeholder.stakeholder_department && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {stakeholder.stakeholder_department}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="space-y-1">
                    {stakeholder.email && (
                      <div className="flex items-center gap-1 text-sm text-gray-900 dark:text-white">
                        <Mail className="h-3 w-3 text-gray-400" />
                        <span className="text-xs truncate max-w-[200px]">{stakeholder.email}</span>
                      </div>
                    )}
                    {stakeholder.phone && (
                      <div className="flex items-center gap-1 text-sm text-gray-900 dark:text-white">
                        <Phone className="h-3 w-3 text-gray-400" />
                        <span className="text-xs">{stakeholder.phone}</span>
                      </div>
                    )}
                    {stakeholder.office_location && (
                      <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                        <MapPin className="h-3 w-3 text-gray-400" />
                        <span className="truncate max-w-[150px]">{stakeholder.office_location}</span>
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900 dark:text-white">
                    {stakeholder.project_role || stakeholder.stakeholder_role || 'N/A'}
                  </div>
                  {stakeholder.organization_level && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 capitalize">
                      {stakeholder.organization_level?.replace('-', ' ')}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap max-w-xs">
                  {stakeholder.expectations ? (
                    <div className="text-xs text-gray-700 dark:text-gray-200 truncate" title={stakeholder.expectations}>
                      {stakeholder.expectations}
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400 dark:text-gray-500">—</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs font-medium rounded capitalize ${getStatusColor(stakeholder.stakeholder_status)}`}>
                    {stakeholder.stakeholder_status || 'active'}
                  </span>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium sticky right-0 bg-white dark:bg-gray-800 shadow-[-4px_0_8px_rgba(0,0,0,0.06)] dark:shadow-[-4px_0_8px_rgba(0,0,0,0.2)] z-10 hover:bg-gray-50 dark:hover:bg-gray-700" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-1.5 flex-wrap">
                    {onView && (
                      <button
                        type="button"
                        onClick={() => onView(stakeholder)}
                        className="inline-flex items-center gap-1 px-2 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 text-xs font-medium"
                        title="View Details"
                        aria-label="View"
                      >
                        <Eye className="h-3.5 w-3.5 shrink-0" />
                        <span>View</span>
                      </button>
                    )}
                    {onEdit && (
                      <button
                        type="button"
                        onClick={() => onEdit(stakeholder)}
                        className="inline-flex items-center gap-1 px-2 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 text-xs font-medium"
                        title="Edit"
                        aria-label="Edit"
                      >
                        <Edit2 className="h-3.5 w-3.5 shrink-0" />
                        <span>Edit</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDelete(stakeholder)}
                      disabled={deleting === stakeholder.id}
                      className="inline-flex items-center gap-1 px-2 py-1.5 rounded border border-red-200 dark:border-red-800 bg-white dark:bg-gray-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 text-xs font-medium"
                      title="Delete"
                      aria-label="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5 shrink-0" />
                      <span>Delete</span>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}


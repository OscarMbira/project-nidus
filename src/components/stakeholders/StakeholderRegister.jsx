import { useState } from 'react';
import { User, Edit2, Trash2, Eye, Users, Building, Mail, Phone, MapPin } from 'lucide-react';
import { deleteStakeholder } from '../../services/stakeholderService';

export default function StakeholderRegister({ stakeholders = [], onEdit, onView, onRefresh }) {
  const [deleting, setDeleting] = useState(null);

  const handleDelete = async (stakeholder) => {
    if (!window.confirm(`Are you sure you want to delete stakeholder "${stakeholder.stakeholder_name}"?`)) {
      return;
    }

    try {
      setDeleting(stakeholder.id);
      await deleteStakeholder(stakeholder.id);
      onRefresh();
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

  if (stakeholders.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
        <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          No Stakeholders
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          Add stakeholders to track engagement and communication
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Stakeholder
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Type
              </th>
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
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {stakeholders.map((stakeholder) => (
              <tr key={stakeholder.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                      <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {stakeholder.stakeholder_name}
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
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs font-medium rounded capitalize ${getStatusColor(stakeholder.stakeholder_status)}`}>
                    {stakeholder.stakeholder_status || 'active'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end gap-2">
                    {onView && (
                      <button
                        onClick={() => onView(stakeholder)}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    )}
                    {onEdit && (
                      <button
                        onClick={() => onEdit(stakeholder)}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                        title="Edit"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(stakeholder)}
                      disabled={deleting === stakeholder.id}
                      className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
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


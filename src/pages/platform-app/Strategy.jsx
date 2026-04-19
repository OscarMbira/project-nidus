/**
 * Strategy Module
 * Strategic planning and alignment
 * Route: /platform/strategy
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Compass, Plus, Search, Target, TrendingUp, BarChart3 } from 'lucide-react';
import { platformDb } from '../../services/supabase/supabaseClient';
import { getStrategicObjectives, getStrategicReports } from '../../services/strategicService';

export default function Strategy() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [organizationId, setOrganizationId] = useState(null);
  const [objectives, setObjectives] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadOrganization();
  }, []);

  useEffect(() => {
    if (organizationId) {
      loadObjectives();
    }
  }, [organizationId, searchTerm]);

  const loadOrganization = async () => {
    try {
      const { data: { user } } = await platformDb.auth.getUser();
      if (!user) {
        navigate('/auth/login');
        return;
      }

      const { data: userRecord } = await platformDb
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .single();

      if (userRecord) {
        const { data: account } = await platformDb
          .from('accounts')
          .select('id')
          .eq('owner_user_id', userRecord.id)
          .single();

        if (account) {
          setOrganizationId(account.id);
        } else {
          const { data: project } = await platformDb
            .from('projects')
            .select('account_id')
            .eq('owner_user_id', userRecord.id)
            .eq('is_deleted', false)
            .limit(1)
            .single();

          if (project?.account_id) {
            setOrganizationId(project.account_id);
          }
        }
      }
    } catch (error) {
      console.error('Error loading organization:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadObjectives = async () => {
    if (!organizationId) return;

    try {
      setLoading(true);
      const filters = { search: searchTerm };
      const data = await getStrategicObjectives(filters);
      setObjectives(data || []);
    } catch (error) {
      console.error('Error loading objectives:', error);
      setObjectives([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !organizationId) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading strategy...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Compass className="h-8 w-8 text-purple-400" />
              <h1 className="text-3xl font-bold text-gray-100">Strategy</h1>
            </div>
            <button
              onClick={() => navigate('/platform/strategy/create')}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
            >
              <Plus className="h-5 w-5" />
              Create Objective
            </button>
          </div>
          <p className="text-gray-400">Strategic planning and portfolio alignment</p>
        </div>

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search objectives..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400 mx-auto mb-4"></div>
            <p className="text-gray-400">Loading objectives...</p>
          </div>
        ) : objectives.length === 0 ? (
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-12 text-center">
            <Compass className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-300 mb-2">No Strategic Objectives</h3>
            <p className="text-gray-500 mb-6">
              {searchTerm ? 'No objectives match your search.' : 'Get started by creating your first strategic objective.'}
            </p>
            {!searchTerm && (
              <button
                onClick={() => navigate('/platform/strategy/create')}
                className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              >
                Create Objective
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {objectives.map(objective => (
              <div
                key={objective.id}
                onClick={() => navigate(`/platform/strategy/${objective.id}`)}
                className="bg-gray-800 rounded-lg border border-gray-700 p-6 hover:border-purple-500 transition-colors cursor-pointer"
              >
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-100">{objective.objective_name}</h3>
                  {objective.objective_type && (
                    <span className="px-2 py-1 text-xs bg-cyan-900/30 text-cyan-300 rounded">
                      {objective.objective_type}
                    </span>
                  )}
                </div>
                {objective.objective_description && (
                  <p className="text-gray-400 mb-4 line-clamp-2 text-sm">{objective.objective_description}</p>
                )}
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span className={objective.objective_status === 'active' ? 'text-green-400' : 'text-gray-600'}>
                    {objective.objective_status || 'Unknown'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

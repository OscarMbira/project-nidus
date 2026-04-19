/**
 * Benefits Module
 * Benefits realization tracking
 * Route: /platform/benefits
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Target, Plus, Search, TrendingUp, CheckCircle, Clock } from 'lucide-react';
import { platformDb } from '../../services/supabase/supabaseClient';
import { getBenefits, getBenefitsDashboardStats } from '../../services/benefitsService';

export default function Benefits() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [organizationId, setOrganizationId] = useState(null);
  const [benefits, setBenefits] = useState([]);
  const [stats, setStats] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadOrganization();
  }, []);

  useEffect(() => {
    if (organizationId) {
      loadBenefits();
    }
  }, [organizationId, searchTerm]);

  const loadOrganization = async () => {
    try {
      const { data: { user } } = await platformDb.auth.getUser();
      if (!user) {
        navigate('/auth/login');
        return;
      }

      // Get user's account
      const { data: userRecord } = await platformDb
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .single();

      if (userRecord) {
        // Get account
        const { data: account } = await platformDb
          .from('accounts')
          .select('id')
          .eq('owner_user_id', userRecord.id)
          .single();

        if (account) {
          setOrganizationId(account.id);
        } else {
          // Try through projects
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

  const loadBenefits = async () => {
    if (!organizationId) return;

    try {
      setLoading(true);
      const filters = { search: searchTerm };
      const [benefitsData, statsData] = await Promise.all([
        getBenefits(filters),
        getBenefitsDashboardStats(filters)
      ]);
      setBenefits(benefitsData || []);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading benefits:', error);
      setBenefits([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredBenefits = benefits.filter(benefit =>
    benefit.benefit_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    benefit.benefit_description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading && !organizationId) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading benefits...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Target className="h-8 w-8 text-blue-500" />
              <h1 className="text-3xl font-bold text-gray-100">Benefits</h1>
            </div>
            <button
              onClick={() => navigate('/platform/benefits/create')}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Plus className="h-5 w-5" />
              Create Benefit
            </button>
          </div>
          <p className="text-gray-400">
            Track and measure benefits realization across projects and programmes
          </p>
        </div>

        {/* Stats */}
        {stats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
              <div className="flex items-center gap-3 mb-2">
                <Target className="h-6 w-6 text-blue-500" />
                <span className="text-2xl font-bold text-gray-100">{stats.total_benefits || 0}</span>
              </div>
              <p className="text-sm text-gray-400">Total Benefits</p>
            </div>
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
              <div className="flex items-center gap-3 mb-2">
                <CheckCircle className="h-6 w-6 text-green-400" />
                <span className="text-2xl font-bold text-gray-100">{stats.realized_benefits || 0}</span>
              </div>
              <p className="text-sm text-gray-400">Realized</p>
            </div>
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
              <div className="flex items-center gap-3 mb-2">
                <TrendingUp className="h-6 w-6 text-blue-400" />
                <span className="text-2xl font-bold text-gray-100">{stats.in_progress_benefits || 0}</span>
              </div>
              <p className="text-sm text-gray-400">In Progress</p>
            </div>
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
              <div className="flex items-center gap-3 mb-2">
                <Clock className="h-6 w-6 text-yellow-400" />
                <span className="text-2xl font-bold text-gray-100">{stats.planned_benefits || 0}</span>
              </div>
              <p className="text-sm text-gray-400">Planned</p>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search benefits..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Benefits Display */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto mb-4"></div>
            <p className="text-gray-400">Loading benefits...</p>
          </div>
        ) : filteredBenefits.length === 0 ? (
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-12 text-center">
            <Target className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-300 mb-2">No Benefits Found</h3>
            <p className="text-gray-500 mb-6">
              {searchTerm ? 'No benefits match your search.' : 'Get started by creating your first benefit.'}
            </p>
            {!searchTerm && (
              <button
                onClick={() => navigate('/platform/benefits/create')}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Create Benefit
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBenefits.map(benefit => (
              <div
                key={benefit.id}
                onClick={() => navigate(`/platform/benefits/${benefit.id}`)}
                className="bg-gray-800 rounded-lg border border-gray-700 p-6 hover:border-blue-500 transition-colors cursor-pointer"
              >
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-100 flex-1">
                    {benefit.benefit_name}
                  </h3>
                  {benefit.benefit_type && (
                    <span className="px-2 py-1 text-xs bg-blue-900/30 text-blue-300 rounded">
                      {benefit.benefit_type}
                    </span>
                  )}
                </div>
                {benefit.benefit_description && (
                  <p className="text-gray-400 mb-4 line-clamp-2 text-sm">
                    {benefit.benefit_description}
                  </p>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className={`px-2 py-1 text-xs rounded ${
                    benefit.benefit_status === 'realized' ? 'bg-green-900/30 text-green-300' :
                    benefit.benefit_status === 'in-progress' ? 'bg-blue-900/30 text-blue-300' :
                    'bg-gray-700 text-gray-300'
                  }`}>
                    {benefit.benefit_status || 'Planned'}
                  </span>
                  {benefit.target_value && (
                    <span className="text-gray-400">
                      Target: {benefit.target_value}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


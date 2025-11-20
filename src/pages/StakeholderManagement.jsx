import { useState, useEffect } from 'react';
import { Users, Plus, Search, Target, MessageSquare, BarChart3 } from 'lucide-react';
import { getStakeholders, getStakeholderAnalysis, getStakeholderEngagement } from '../services/stakeholderService';
import StakeholderRegister from '../components/stakeholders/StakeholderRegister';
import StakeholderForm from '../components/stakeholders/StakeholderForm';
import PowerInterestMatrix from '../components/stakeholders/PowerInterestMatrix';
import EngagementTracker from '../components/stakeholders/EngagementTracker';
import { supabase } from '../services/supabaseClient';

export default function StakeholderManagement() {
  const [stakeholders, setStakeholders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedStakeholder, setSelectedStakeholder] = useState(null);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [projects, setProjects] = useState([]);
  const [activeTab, setActiveTab] = useState('register');
  const [filters, setFilters] = useState({
    project_id: '',
    stakeholder_type: '',
    stakeholder_status: '',
    search: '',
  });

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      setFilters(prev => ({ ...prev, project_id: selectedProjectId }));
    }
    fetchData();
  }, [filters, selectedProjectId, activeTab]);

  const fetchProjects = async () => {
    try {
      const { data } = await supabase
        .from('projects')
        .select('id, project_name, project_code, project_status')
        .eq('is_deleted', false)
        .order('project_name', { ascending: true });

      if (data) setProjects(data);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await getStakeholders(filters);
      setStakeholders(data || []);
    } catch (error) {
      console.error('Error fetching stakeholders:', error);
      alert('Error loading stakeholder management: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateStakeholder = () => {
    setSelectedStakeholder(null);
    setShowForm(true);
  };

  const handleEditStakeholder = (stakeholder) => {
    setSelectedStakeholder(stakeholder);
    setShowForm(true);
  };

  const handleStakeholderSaved = () => {
    setShowForm(false);
    setSelectedStakeholder(null);
    fetchData();
  };

  if (loading && activeTab === 'register') {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Users className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            Stakeholder Management
          </h1>
          <button
            onClick={handleCreateStakeholder}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            <Plus className="h-5 w-5" />
            Add Stakeholder
          </button>
        </div>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Manage stakeholder register, analysis, and engagement
        </p>
      </div>

      {/* Project Selector */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Filter by Project
            </label>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Projects</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>
                  {project.project_name} {project.project_code ? `(${project.project_code})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('register')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'register'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <Users className="h-4 w-4 inline mr-2" />
            Register
          </button>
          <button
            onClick={() => setActiveTab('matrix')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'matrix'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <Target className="h-4 w-4 inline mr-2" />
            Power/Interest Matrix
          </button>
          <button
            onClick={() => setActiveTab('engagement')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'engagement'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <MessageSquare className="h-4 w-4 inline mr-2" />
            Engagement Tracking
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'register' && (
        <>
          {/* Filters */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                <Search className="h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search stakeholders..."
                  value={filters.search || ''}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
              <select
                value={filters.stakeholder_type || ''}
                onChange={(e) => setFilters({ ...filters, stakeholder_type: e.target.value })}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="">All Types</option>
                <option value="internal">Internal</option>
                <option value="external">External</option>
                <option value="customer">Customer</option>
                <option value="supplier">Supplier</option>
                <option value="partner">Partner</option>
                <option value="regulator">Regulator</option>
              </select>
              <select
                value={filters.stakeholder_status || ''}
                onChange={(e) => setFilters({ ...filters, stakeholder_status: e.target.value })}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="departed">Departed</option>
              </select>
            </div>
          </div>

          {/* Stakeholder Register */}
          <StakeholderRegister
            stakeholders={stakeholders}
            onEdit={handleEditStakeholder}
            onView={handleEditStakeholder}
            onRefresh={fetchData}
          />
        </>
      )}

      {activeTab === 'matrix' && (
        <PowerInterestMatrix
          projectId={selectedProjectId || null}
          stakeholders={stakeholders}
        />
      )}

      {activeTab === 'engagement' && (
        <EngagementTracker
          projectId={selectedProjectId || null}
          stakeholders={stakeholders}
        />
      )}

      {/* Stakeholder Form Modal */}
      {showForm && (
        <StakeholderForm
          stakeholder={selectedStakeholder}
          projectId={selectedProjectId || null}
          onSave={handleStakeholderSaved}
          onCancel={() => {
            setShowForm(false);
            setSelectedStakeholder(null);
          }}
        />
      )}
    </div>
  );
}


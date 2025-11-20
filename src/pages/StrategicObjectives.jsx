import { useState, useEffect } from 'react';
import { Target, Plus, Search, GitBranch, FolderKanban } from 'lucide-react';
import { getStrategicObjectives, getStrategicAlignmentDashboardStats } from '../services/strategicService';
import StrategicObjectivesManager from '../components/strategy/StrategicObjectivesManager';
import ObjectiveForm from '../components/strategy/ObjectiveForm';
import ObjectiveHierarchyView from '../components/strategy/ObjectiveHierarchyView';
import { supabase } from '../services/supabaseClient';

export default function StrategicObjectives() {
  const [objectives, setObjectives] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showObjectiveForm, setShowObjectiveForm] = useState(false);
  const [selectedObjective, setSelectedObjective] = useState(null);
  const [showHierarchyForm, setShowHierarchyForm] = useState(false);
  const [selectedParentObjective, setSelectedParentObjective] = useState(null);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'hierarchy'
  const [filters, setFilters] = useState({
    portfolio_id: '',
    objective_category: '',
    objective_type: '',
    objective_level: '',
    objective_status: '',
    search: '',
  });

  useEffect(() => {
    fetchData();
  }, [filters]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [objectivesData, statsData] = await Promise.all([
        getStrategicObjectives(filters),
        getStrategicAlignmentDashboardStats(filters),
      ]);
      setObjectives(objectivesData || []);
      setStats(statsData);
    } catch (error) {
      console.error('Error fetching objectives data:', error);
      alert('Error loading objectives: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateObjective = () => {
    setSelectedObjective(null);
    setShowObjectiveForm(true);
  };

  const handleEditObjective = (objective) => {
    setSelectedObjective(objective);
    setShowObjectiveForm(true);
  };

  const handleObjectiveSaved = () => {
    setShowObjectiveForm(false);
    setSelectedObjective(null);
    fetchData();
  };

  const handleAddHierarchy = (parentObjective) => {
    setSelectedParentObjective(parentObjective);
    setShowHierarchyForm(true);
  };

  if (loading) {
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
            <Target className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            Strategic Objectives
          </h1>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 border border-gray-300 dark:border-gray-600 rounded-lg p-1">
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  viewMode === 'list'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                List View
              </button>
              <button
                onClick={() => setViewMode('hierarchy')}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  viewMode === 'hierarchy'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <GitBranch className="h-4 w-4 inline mr-1" />
                Hierarchy View
              </button>
            </div>
            <button
              onClick={handleCreateObjective}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              <Plus className="h-5 w-5" />
              Create Objective
            </button>
          </div>
        </div>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Define and manage strategic objectives for organizational alignment
        </p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Objectives</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalObjectives || 0}</p>
              </div>
              <Target className="h-8 w-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-green-200 dark:border-green-800 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Active Objectives</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.activeObjectives || 0}</p>
              </div>
              <GitBranch className="h-8 w-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-blue-200 dark:border-blue-800 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Completed</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.completedObjectives || 0}</p>
              </div>
              <Target className="h-8 w-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-purple-200 dark:border-purple-800 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Project Mappings</p>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.totalMappings || 0}</p>
              </div>
              <FolderKanban className="h-8 w-8 text-purple-500" />
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <div className="space-y-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <Search className="h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search objectives..."
                value={filters.search || ''}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            <select
              value={filters.portfolio_id || ''}
              onChange={(e) => setFilters({ ...filters, portfolio_id: e.target.value })}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="">All Portfolios</option>
              {/* TODO: Fetch and populate portfolios */}
            </select>
            <select
              value={filters.objective_category || ''}
              onChange={(e) => setFilters({ ...filters, objective_category: e.target.value })}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="">All Categories</option>
              <option value="strategic">Strategic</option>
              <option value="financial">Financial</option>
              <option value="operational">Operational</option>
              <option value="customer">Customer</option>
              <option value="employee">Employee</option>
              <option value="innovation">Innovation</option>
              <option value="compliance">Compliance</option>
              <option value="sustainability">Sustainability</option>
            </select>
            <select
              value={filters.objective_status || ''}
              onChange={(e) => setFilters({ ...filters, objective_status: e.target.value })}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="on_hold">On Hold</option>
              <option value="completed">Completed</option>
              <option value="achieved">Achieved</option>
              <option value="missed">Missed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <select
              value={filters.objective_level || ''}
              onChange={(e) => setFilters({ ...filters, objective_level: e.target.value })}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="">All Levels</option>
              <option value="strategic">Strategic</option>
              <option value="tactical">Tactical</option>
              <option value="operational">Operational</option>
            </select>
          </div>
        </div>
      </div>

      {/* Objectives View */}
      {viewMode === 'list' ? (
        <StrategicObjectivesManager
          objectives={objectives}
          onEdit={handleEditObjective}
          onRefresh={fetchData}
        />
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <ObjectiveHierarchyView
            onEdit={handleEditObjective}
            onAddHierarchy={handleAddHierarchy}
          />
        </div>
      )}

      {/* Objective Form Modal */}
      {showObjectiveForm && (
        <ObjectiveForm
          objective={selectedObjective}
          onSave={handleObjectiveSaved}
          onCancel={() => {
            setShowObjectiveForm(false);
            setSelectedObjective(null);
          }}
        />
      )}
    </div>
  );
}


import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Plus, Search as SearchIcon, Settings } from 'lucide-react';
import { getQualityRegister, getQualityManagementStats } from '../services/qualityManagementService';
import QualityRegister from '../components/quality/QualityRegister';
import QualityRegisterForm from '../components/quality/QualityRegisterForm';
import QualityMetricsDashboard from '../components/quality/QualityMetricsDashboard';
import QualityActivityBulkImport from '../components/quality/QualityActivityBulkImport';
import { supabase } from '../services/supabaseClient';
import { platformDb } from '@nidus/supabase';
import { useViewMode } from '@nidus/shared/hooks/useViewMode';
import ViewToggle from '@nidus/ui/ViewToggle';
import TierFieldCustomisationPanel from '@nidus/ui/TierFieldCustomisationPanel.jsx';
import { QUALITY_TIER_SURFACES } from '../features/local-data-extensions/components/InheritedQualityFields';

export default function QualityManagement() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [projects, setProjects] = useState([]);
  const [pageMode, setPageMode] = useState('list'); // list | settings
  const [settingsCategory, setSettingsCategory] = useState(QUALITY_TIER_SURFACES[0].category);
  const [filters, setFilters] = useState({
    project_id: '',
    quality_status: '',
    product_type: '',
    search: '',
  });
  const [qualityRegisterViewMode, setQualityRegisterViewMode] = useViewMode('quality-register', 'grid');

  const selectedProject = useMemo(
    () => projects.find((p) => p.id === selectedProjectId) || null,
    [projects, selectedProjectId],
  );

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      setFilters(prev => ({ ...prev, project_id: selectedProjectId }));
    }
    if (pageMode === 'list') {
      fetchData();
    }
  }, [filters, selectedProjectId, pageMode]);

  const fetchProjects = async () => {
    try {
      const { data } = await supabase
        .from('projects')
        .select('id, project_name, project_code, project_status, account_id')
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
      const [itemsData, statsData] = await Promise.all([
        getQualityRegister(filters),
        getQualityManagementStats(filters),
      ]);
      setItems(itemsData || []);
      setStats(statsData);
    } catch (error) {
      console.error('Error fetching quality data:', error);
      alert('Error loading quality management: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateItem = () => {
    setSelectedItem(null);
    setShowForm(true);
  };

  const handleEditItem = (item) => {
    if (item && item.type === 'activity' && item.activity_identifier) {
      navigate(`/platform/quality/activity/${item.activity_identifier}`);
    } else {
      setSelectedItem(item);
      setShowForm(true);
    }
  };

  const handleItemSaved = () => {
    setShowForm(false);
    setSelectedItem(null);
    fetchData();
  };

  if (loading && pageMode === 'list') {
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
        <div className="flex items-center justify-between mb-2 gap-3 flex-wrap">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Shield className="h-8 w-8 text-purple-600 dark:text-purple-400" />
            Quality Management
          </h1>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
              <button
                type="button"
                onClick={() => setPageMode('list')}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  pageMode === 'list'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                List
              </button>
              <button
                type="button"
                onClick={() => setPageMode('settings')}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  pageMode === 'settings'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <Settings className="h-4 w-4 inline mr-1" />
                Settings
              </button>
            </div>
            {pageMode === 'list' && (
              <button
                type="button"
                onClick={handleCreateItem}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                <Plus className="h-5 w-5" />
                Add Quality Item
              </button>
            )}
          </div>
        </div>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Manage quality register, reviews, inspections, and defects
        </p>
      </div>

      {/* Project Selector */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {pageMode === 'settings' ? 'Project (required for field templates)' : 'Filter by Project'}
            </label>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">{pageMode === 'settings' ? 'Select a project…' : 'All Projects'}</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>
                  {project.project_name} {project.project_code ? `(${project.project_code})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {pageMode === 'settings' ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
              Quality field templates
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Customise inherited fields separately for the quality register, reviews, and inspections.
              Mandatory lock prevents lower tiers from turning a field off.
            </p>
            <div className="flex flex-wrap gap-2 mb-4">
              {QUALITY_TIER_SURFACES.map((surface) => (
                <button
                  key={surface.category}
                  type="button"
                  onClick={() => setSettingsCategory(surface.category)}
                  className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                    settingsCategory === surface.category
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {surface.label}
                </button>
              ))}
            </div>
          </div>
          {selectedProject?.account_id && selectedProjectId ? (
            <TierFieldCustomisationPanel
              key={settingsCategory}
              db={platformDb}
              accountId={selectedProject.account_id}
              tier="project"
              entityType="project"
              entityId={selectedProjectId}
              entityName={selectedProject.project_name || 'Project'}
              category={settingsCategory}
            />
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Select a project above to customise field templates for that project.
            </p>
          )}
        </div>
      ) : (
        <>
          <div className="mb-6">
            <QualityMetricsDashboard projectId={selectedProjectId || null} />
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                <SearchIcon className="h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search quality items..."
                  value={filters.search || ''}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
              <select
                value={filters.quality_status || ''}
                onChange={(e) => setFilters({ ...filters, quality_status: e.target.value })}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="in-review">In Review</option>
                <option value="passed">Passed</option>
                <option value="failed">Failed</option>
                <option value="conditional">Conditional</option>
                <option value="approved">Approved</option>
              </select>
              <select
                value={filters.product_type || ''}
                onChange={(e) => setFilters({ ...filters, product_type: e.target.value })}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="">All Types</option>
                <option value="document">Document</option>
                <option value="software">Software</option>
                <option value="hardware">Hardware</option>
                <option value="service">Service</option>
                <option value="report">Report</option>
                <option value="other">Other</option>
              </select>
              <ViewToggle
                value={qualityRegisterViewMode}
                onChange={setQualityRegisterViewMode}
                ariaLabel="Quality register layout"
              />
            </div>
          </div>

          <div className="mb-6">
            <details className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <summary className="px-6 py-4 cursor-pointer font-medium text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700">
                Bulk Import Quality Activities
              </summary>
              <div className="px-6 pb-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                <QualityActivityBulkImport onImportComplete={fetchData} />
              </div>
            </details>
          </div>

          <QualityRegister
            items={items}
            onEdit={handleEditItem}
            onView={handleEditItem}
            onRefresh={fetchData}
            projectId={selectedProjectId || null}
            registerViewMode={qualityRegisterViewMode}
          />
        </>
      )}

      {showForm && (
        <QualityRegisterForm
          item={selectedItem}
          projectId={selectedProjectId || null}
          accountId={selectedProject?.account_id || null}
          onSave={handleItemSaved}
          onCancel={() => {
            setShowForm(false);
            setSelectedItem(null);
          }}
        />
      )}
    </div>
  );
}

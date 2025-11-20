import { useState, useEffect } from 'react';
import { Shield, Plus, Search, CheckCircle, Search as SearchIcon, BarChart3, FileText } from 'lucide-react';
import { getQualityRegister, getQualityManagementStats } from '../services/qualityManagementService';
import QualityRegister from '../components/quality/QualityRegister';
import QualityRegisterForm from '../components/quality/QualityRegisterForm';
import QualityMetricsDashboard from '../components/quality/QualityMetricsDashboard';
import { supabase } from '../services/supabaseClient';

export default function QualityManagement() {
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [projects, setProjects] = useState([]);
  const [filters, setFilters] = useState({
    project_id: '',
    quality_status: '',
    product_type: '',
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
  }, [filters, selectedProjectId]);

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
    setSelectedItem(item);
    setShowForm(true);
  };

  const handleItemSaved = () => {
    setShowForm(false);
    setSelectedItem(null);
    fetchData();
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
            <Shield className="h-8 w-8 text-purple-600 dark:text-purple-400" />
            Quality Management
          </h1>
          <button
            onClick={handleCreateItem}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            <Plus className="h-5 w-5" />
            Add Quality Item
          </button>
        </div>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Manage quality register, reviews, inspections, and defects
        </p>
      </div>

      {/* Quality Metrics Dashboard */}
      <div className="mb-6">
        <QualityMetricsDashboard projectId={selectedProjectId || null} />
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

      {/* Filters */}
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
        </div>
      </div>

      {/* Quality Register */}
      <QualityRegister
        items={items}
        onEdit={handleEditItem}
        onView={handleEditItem}
        onRefresh={fetchData}
      />

      {/* Quality Register Form Modal */}
      {showForm && (
        <QualityRegisterForm
          item={selectedItem}
          projectId={selectedProjectId || null}
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


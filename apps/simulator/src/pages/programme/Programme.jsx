import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Target, TrendingUp, AlertTriangle, DollarSign, Search } from 'lucide-react';
import DashboardStatCard from '@nidus/ui/DashboardStatCard';
import { getProgrammes } from '../../services/programmeService';
import ProgrammeList from '../../components/programme/ProgrammeList';
import ProgrammeForm from '../../components/programme/ProgrammeForm';
import ExportListMenu from '@nidus/ui/ExportListMenu';
import { useViewMode } from '@nidus/shared/hooks/useViewMode';
import ViewToggle from '@nidus/ui/ViewToggle';

const PROGRAMME_COLUMNS = [
  { key: 'programme_name', label: 'Name' },
  { key: 'programme_code', label: 'Code' },
  { key: 'programme_status', label: 'Status' }
];

export default function Programme() {
  const navigate = useNavigate();
  const [programmeViewMode, setProgrammeViewMode] = useViewMode('programme', 'grid');
  const [programmes, setProgrammes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showProgrammeForm, setShowProgrammeForm] = useState(false);
  const [selectedProgramme, setSelectedProgramme] = useState(null);
  const [filters, setFilters] = useState({
    status: '',
    type: '',
    owner_id: '',
    search: '',
  });

  useEffect(() => {
    fetchProgrammes();
  }, [filters]);

  const fetchProgrammes = async () => {
    try {
      setLoading(true);
      const data = await getProgrammes(filters);
      setProgrammes(data || []);
    } catch (error) {
      console.error('Error fetching programmes:', error);
      alert('Error loading programmes: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProgramme = () => {
    setSelectedProgramme(null);
    setShowProgrammeForm(true);
  };

  const handleEditProgramme = (programme) => {
    navigate(`/programme/${programme.id}/edit`);
  };

  const handleProgrammeSaved = () => {
    setShowProgrammeForm(false);
    setSelectedProgramme(null);
    fetchProgrammes();
  };

  const stats = {
    total: programmes.length,
    active: programmes.filter(p => p.programme_status === 'active').length,
    planning: programmes.filter(p => p.programme_status === 'planning').length,
    completed: programmes.filter(p => p.programme_status === 'completed').length,
    totalProjects: programmes.reduce((sum, p) => sum + (p.total_projects_count || 0), 0),
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
        <div className="flex items-center justify-between mb-2 flex-wrap gap-3">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Programme Management
          </h1>
          <div className="flex flex-wrap gap-2 items-center">
            <ExportListMenu columns={PROGRAMME_COLUMNS} data={programmes} baseFilename="Programmes" disabled={!programmes.length} />
            <ViewToggle value={programmeViewMode} onChange={setProgrammeViewMode} ariaLabel="Programme list layout" />
            <button
              onClick={handleCreateProgramme}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              <Plus className="h-5 w-5" />
              Create Programme
            </button>
          </div>
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          Coordinate related projects to deliver strategic benefits
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <DashboardStatCard label="Total Programmes" value={stats.total} icon={Target} iconClassName="text-blue-500" />
        <DashboardStatCard label="Active" value={stats.active} icon={TrendingUp} accentClassName="text-green-600 dark:text-green-400" iconClassName="text-green-500" borderClassName="border-green-200 dark:border-green-800" />
        <DashboardStatCard label="Planning" value={stats.planning} icon={Target} accentClassName="text-blue-600 dark:text-blue-400" iconClassName="text-blue-500" borderClassName="border-blue-200 dark:border-blue-800" />
        <DashboardStatCard label="Completed" value={stats.completed} icon={TrendingUp} iconClassName="text-gray-500" />
        <DashboardStatCard label="Total Projects" value={stats.totalProjects} icon={Target} accentClassName="text-purple-600 dark:text-purple-400" iconClassName="text-purple-500" borderClassName="border-purple-200 dark:border-purple-800" />
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <Search className="h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search programmes..."
              value={filters.search || ''}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>
          <select
            value={filters.status || ''}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="">All Status</option>
            <option value="planning">Planning</option>
            <option value="active">Active</option>
            <option value="on-hold">On Hold</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select
            value={filters.type || ''}
            onChange={(e) => setFilters({ ...filters, type: e.target.value })}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="">All Types</option>
            <option value="business_transformation">Business Transformation</option>
            <option value="technology">Technology</option>
            <option value="infrastructure">Infrastructure</option>
            <option value="product">Product</option>
            <option value="regulatory">Regulatory</option>
            <option value="mixed">Mixed</option>
          </select>
        </div>
      </div>

      {/* Programme List */}
      <ProgrammeList programmes={programmes} onRefresh={fetchProgrammes} viewMode={programmeViewMode} />

      {/* Programme Form Modal */}
      {showProgrammeForm && (
        <ProgrammeForm
          programme={selectedProgramme}
          onSave={handleProgrammeSaved}
          onCancel={() => {
            setShowProgrammeForm(false);
            setSelectedProgramme(null);
          }}
        />
      )}
    </div>
  );
}


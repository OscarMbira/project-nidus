import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Plus, Search, Target, MessageSquare, BarChart3, FileText, Table2, ListTodo, GitBranch, Triangle, Upload, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getStakeholders, saveStakeholderAnalysis, getStakeholderAssessmentMatrix } from '../services/stakeholderService';
import { mapAssessmentRowToSeamDisplay } from '../utils/stakeholderSEAMUtils';
import StakeholderRegister from '../components/stakeholders/StakeholderRegister';
import StakeholderForm from '../components/stakeholders/StakeholderForm';
import PowerInterestMatrix from '../components/stakeholders/PowerInterestMatrix';
import EngagementTracker from '../components/stakeholders/EngagementTracker';
import StakeholderSEAM from '../components/stakeholders/StakeholderSEAM';
import EngagementActions from '../components/stakeholders/EngagementActions';
import CommunicationPlan from '../components/stakeholders/CommunicationPlan';
import CommunicationLog from '../components/stakeholders/CommunicationLog';
import StakeholderMonitoringDashboard from '../components/stakeholders/StakeholderMonitoringDashboard';
import StakeholderRelationships from '../components/stakeholders/StakeholderRelationships';
import SalienceModel from '../components/stakeholders/SalienceModel';
import StakeholderImportModal from '../components/stakeholders/StakeholderImportModal';
import { supabase } from '../services/supabaseClient';
import ExportListMenu from '../components/ui/ExportListMenu';
import { useViewMode } from '../hooks/useViewMode';
import ViewToggle from '../components/ui/ViewToggle';

const STAKEHOLDER_COLUMNS = [
  { key: 'stakeholder_reference', label: 'Reference' },
  { key: 'stakeholder_name', label: 'Name' },
  { key: 'stakeholder_title', label: 'Title' },
  { key: 'stakeholder_organization', label: 'Organization' },
  { key: 'stakeholder_department', label: 'Department' },
  { key: 'stakeholder_type', label: 'Type' },
  { key: 'stakeholder_category', label: 'Category' },
  { key: 'project_role', label: 'Project Role' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'organization_level', label: 'Organization Level' },
  { key: 'is_decision_maker', label: 'Decision Maker' },
  { key: 'is_influencer', label: 'Influencer' },
  { key: 'stakeholder_status', label: 'Status' },
  { key: 'notes', label: 'Notes' },
  { key: 'special_requirements', label: 'Special Requirements' },
  { key: 'expectations', label: 'Expectations' },
];

export default function StakeholderManagement() {
  const navigate = useNavigate();
  const [stakeholders, setStakeholders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedStakeholder, setSelectedStakeholder] = useState(null);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [projects, setProjects] = useState([]);
  const [activeTab, setActiveTab] = useState('register');
  const [seamRows, setSeamRows] = useState([]);
  const [seamLoading, setSeamLoading] = useState(false);
  const [matrixRefreshTrigger, setMatrixRefreshTrigger] = useState(0);
  const [showImportModal, setShowImportModal] = useState(false);
  const [stakeholderViewMode, setStakeholderViewMode] = useViewMode('stakeholder-register', 'grid');
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

  useEffect(() => {
    if (activeTab !== 'seam' || !selectedProjectId) {
      setSeamRows([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setSeamLoading(true);
      try {
        const data = await getStakeholderAssessmentMatrix({ project_id: selectedProjectId });
        if (!cancelled) setSeamRows((data || []).map(mapAssessmentRowToSeamDisplay));
      } catch (e) {
        console.error(e);
        if (!cancelled) setSeamRows([]);
      } finally {
        if (!cancelled) setSeamLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeTab, selectedProjectId]);

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

  const handleViewStakeholder = (stakeholder) => {
    navigate(`/platform/stakeholders/register/view/${stakeholder.id}`);
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
        <div className="flex items-center justify-between mb-2 flex-wrap gap-3">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Users className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            Stakeholder Management
          </h1>
          <div className="flex gap-2">
            <ExportListMenu columns={STAKEHOLDER_COLUMNS} data={stakeholders} baseFilename="Stakeholders" disabled={!stakeholders.length} />
            <button
              type="button"
              onClick={() => setShowImportModal(true)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <Upload className="h-5 w-5" />
              Import
            </button>
            <Link
              to="/platform/stakeholders/on-hold"
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <Clock className="h-5 w-5" />
              Draft queue
            </Link>
            <button
              onClick={handleCreateStakeholder}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              <Plus className="h-5 w-5" />
              Add Stakeholder
            </button>
          </div>
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
        <nav className="-mb-px flex space-x-8 overflow-x-auto">
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
          <button
            onClick={() => setActiveTab('seam')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'seam'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <Table2 className="h-4 w-4 inline mr-2" />
            SEAM
          </button>
          <button
            onClick={() => setActiveTab('actions')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'actions'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <ListTodo className="h-4 w-4 inline mr-2" />
            Engagement Actions
          </button>
          <button
            onClick={() => setActiveTab('communication')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'communication'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <FileText className="h-4 w-4 inline mr-2" />
            Communication Plans
          </button>
          <button
            onClick={() => setActiveTab('relationships')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'relationships'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <GitBranch className="h-4 w-4 inline mr-2" />
            Relationships
          </button>
          <button
            onClick={() => setActiveTab('salience')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'salience'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <Triangle className="h-4 w-4 inline mr-2" />
            Salience
          </button>
          <button
            onClick={() => setActiveTab('monitoring')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'monitoring'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <BarChart3 className="h-4 w-4 inline mr-2" />
            Monitoring
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
              <ViewToggle
                value={stakeholderViewMode}
                onChange={setStakeholderViewMode}
                ariaLabel="Stakeholder register layout"
              />
            </div>
          </div>

          {/* Stakeholder Register */}
          <StakeholderRegister
            stakeholders={stakeholders}
            onEdit={handleEditStakeholder}
            onView={handleViewStakeholder}
            onRefresh={fetchData}
            viewMode={stakeholderViewMode}
          />
        </>
      )}

      {activeTab === 'matrix' && (
        <PowerInterestMatrix
          projectId={selectedProjectId || null}
          stakeholders={stakeholders}
          refreshTrigger={matrixRefreshTrigger}
          onStakeholderClick={(id) => navigate(`/platform/stakeholders/register/view/${id}`)}
          onEditAnalysis={({ projectId: pid, stakeholderId: sid }) => navigate('/platform/stakeholders/analysis', { state: { projectId: pid, stakeholderId: sid } })}
          onReposition={async (item, { power_level, interest_level, matrix_quadrant }) => {
            try {
              const payload = {
                project_id: selectedProjectId,
                stakeholder_id: item.stakeholder_id || item.stakeholder?.id,
                power_level,
                interest_level,
                matrix_quadrant,
                ...(item.id && {
                  current_attitude: item.current_attitude,
                  desired_attitude: item.desired_attitude,
                  legitimacy_level: item.legitimacy_level,
                  urgency_level: item.urgency_level,
                  salience_class: item.salience_class,
                }),
              };
              await saveStakeholderAnalysis(payload, item.id);
              setMatrixRefreshTrigger((t) => t + 1);
            } catch (e) {
              console.error(e);
              alert(e?.message || 'Failed to update position');
            }
          }}
        />
      )}

      {activeTab === 'engagement' && (
        <EngagementTracker
          projectId={selectedProjectId || null}
          stakeholders={stakeholders}
        />
      )}

      {activeTab === 'seam' && (
        <StakeholderSEAM
          rows={seamRows}
          loading={seamLoading}
          emptyMessage="No assessments yet. Use Stakeholder Assessment Matrix in the sidebar to add C/D levels."
          onEdit={() =>
            navigate('/platform/stakeholders/assessment-matrix', {
              state: { projectId: selectedProjectId },
            })
          }
        />
      )}

      {activeTab === 'actions' && (
        <EngagementActions projectId={selectedProjectId || null} />
      )}

      {activeTab === 'communication' && (
        <div className="space-y-6">
          {!selectedProjectId && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center text-gray-500 dark:text-gray-400">
              Select a project above to manage communication plans and view the communication log.
            </div>
          )}
          {selectedProjectId && (
            <>
              <CommunicationPlan projectId={selectedProjectId} />
              <div className="mt-8">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  Communication Log
                </h3>
                <CommunicationLog projectId={selectedProjectId} />
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'relationships' && (
        <StakeholderRelationships projectId={selectedProjectId || null} />
      )}

      {activeTab === 'salience' && (
        <SalienceModel projectId={selectedProjectId || null} />
      )}

      {activeTab === 'monitoring' && (
        <StakeholderMonitoringDashboard projectId={selectedProjectId || null} />
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

      {showImportModal && (
        <StakeholderImportModal
          projectId={selectedProjectId || null}
          onClose={() => setShowImportModal(false)}
          onImportComplete={() => {
            setShowImportModal(false);
            fetchData();
          }}
        />
      )}
    </div>
  );
}


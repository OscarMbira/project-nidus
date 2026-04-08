import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Edit2, Target, TrendingUp, AlertTriangle, Activity, Calendar, CheckCircle, Link2 } from 'lucide-react';
import {
  getProgramme,
  deleteProgramme,
  getProgrammeProjects,
  getProgrammeDependencies,
  getProgrammeBenefits,
  getProgrammeMilestones,
  getProgrammeReports,
} from '../../services/programmeService';
import ProgrammeDashboard from '../../components/programme/ProgrammeDashboard';
import DependencyMapVisualization from '../../components/programme/DependencyMapVisualization';
import BenefitsRealizationChart from '../../components/programme/BenefitsRealizationChart';
import ProgrammeTimelineView from '../../components/programme/ProgrammeTimelineView';
import ProgrammeForm from '../../components/programme/ProgrammeForm';
import ExportRecordButtons from '../../components/ui/ExportRecordButtons';
import { exportRecordToExcel, exportRecordToWord, exportRecordToPPT, exportRecordToCSV, exportRecordToXML, exportRecordToJSON, exportRecordToPrint } from '../../utils/exportUtils';

const PROGRAMME_VIEW_SECTIONS = [
  { title: 'Programme', fields: [
    { key: 'programme_name', label: 'Name' },
    { key: 'programme_code', label: 'Code' },
    { key: 'programme_status', label: 'Status' },
    { key: 'programme_description', label: 'Description' }
  ]}
];

function ProgrammeProjectsTab({ programmeId }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getProgrammeProjects(programmeId);
        setProjects(data || []);
      } catch (err) {
        console.error('Error loading programme projects:', err);
        setError(err.message || 'Failed to load projects');
      } finally {
        setLoading(false);
      }
    };
    if (programmeId) load();
  }, [programmeId]);

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3" />
        <p className="text-gray-500 dark:text-gray-400 text-sm">Loading programme projects...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <p className="text-sm text-red-800 dark:text-red-200">Error loading projects: {error}</p>
      </div>
    );
  }

  if (!projects.length) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 text-center">
        <p className="text-gray-500 dark:text-gray-400">No projects have been assigned to this programme yet.</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
            <th className="py-2 pr-4">Project</th>
            <th className="py-2 pr-4">Code</th>
            <th className="py-2 pr-4">Status</th>
            <th className="py-2 pr-4">Programme Priority</th>
          </tr>
        </thead>
        <tbody>
          {projects.map((row) => (
            <tr key={row.id} className="border-b border-gray-100 dark:border-gray-700 last:border-0">
              <td className="py-2 pr-4 text-gray-900 dark:text-white">
                {row.project?.project_name || 'Unknown Project'}
              </td>
              <td className="py-2 pr-4 text-gray-700 dark:text-gray-300">
                {row.project?.project_code || ''}
              </td>
              <td className="py-2 pr-4">
                <span className="px-2 py-1 text-xs rounded-full bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200">
                  {row.project?.project_status || 'unknown'}
                </span>
              </td>
              <td className="py-2 pr-4 text-gray-700 dark:text-gray-300 capitalize">
                {row.programme_priority || 'normal'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ProgrammeDependenciesTab({ programmeId }) {
  const [dependencies, setDependencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getProgrammeDependencies(programmeId);
        setDependencies(data || []);
      } catch (err) {
        console.error('Error loading programme dependencies:', err);
        setError(err.message || 'Failed to load dependencies');
      } finally {
        setLoading(false);
      }
    };
    if (programmeId) load();
  }, [programmeId]);

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3" />
        <p className="text-gray-500 dark:text-gray-400 text-sm">Loading dependencies...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <p className="text-sm text-red-800 dark:text-red-200">Error loading dependencies: {error}</p>
      </div>
    );
  }

  return (
    <DependencyMapVisualization dependencies={dependencies} />
  );
}

function ProgrammeBenefitsTab({ programmeId }) {
  const [benefits, setBenefits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getProgrammeBenefits(programmeId);
        setBenefits(data || []);
      } catch (err) {
        console.error('Error loading programme benefits:', err);
        setError(err.message || 'Failed to load benefits');
      } finally {
        setLoading(false);
      }
    };
    if (programmeId) load();
  }, [programmeId]);

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3" />
        <p className="text-gray-500 dark:text-gray-400 text-sm">Loading benefits...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <p className="text-sm text-red-800 dark:text-red-200">Error loading benefits: {error}</p>
      </div>
    );
  }

  return <BenefitsRealizationChart benefits={benefits} />;
}

function ProgrammeTimelineTab({ programmeId, programme }) {
  const [milestones, setMilestones] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const [ms, proj] = await Promise.all([
          getProgrammeMilestones(programmeId),
          getProgrammeProjects(programmeId),
        ]);
        setMilestones(ms || []);
        setProjects(proj || []);
      } catch (err) {
        console.error('Error loading programme timeline:', err);
        setError(err.message || 'Failed to load timeline');
      } finally {
        setLoading(false);
      }
    };
    if (programmeId) load();
  }, [programmeId]);

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3" />
        <p className="text-gray-500 dark:text-gray-400 text-sm">Loading timeline...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <p className="text-sm text-red-800 dark:text-red-200">Error loading timeline: {error}</p>
      </div>
    );
  }

  return (
    <ProgrammeTimelineView
      programme={programme}
      milestones={milestones}
      projects={projects}
    />
  );
}

function ProgrammeReportsTab({ programmeId }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getProgrammeReports(programmeId);
        setReports(data || []);
      } catch (err) {
        console.error('Error loading programme reports:', err);
        setError(err.message || 'Failed to load reports');
      } finally {
        setLoading(false);
      }
    };
    if (programmeId) load();
  }, [programmeId]);

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3" />
        <p className="text-gray-500 dark:text-gray-400 text-sm">Loading reports...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <p className="text-sm text-red-800 dark:text-red-200">Error loading reports: {error}</p>
      </div>
    );
  }

  if (!reports.length) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 text-center">
        <p className="text-gray-500 dark:text-gray-400">No reports found for this programme.</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
            <th className="py-2 pr-4">Date</th>
            <th className="py-2 pr-4">Type</th>
            <th className="py-2 pr-4">Status</th>
            <th className="py-2 pr-4">Generated By</th>
            <th className="py-2 pr-4">Approved By</th>
          </tr>
        </thead>
        <tbody>
          {reports.map((r) => (
            <tr key={r.id} className="border-b border-gray-100 dark:border-gray-700 last:border-0">
              <td className="py-2 pr-4 text-gray-700 dark:text-gray-300">
                {r.report_date || '—'}
              </td>
              <td className="py-2 pr-4 text-gray-900 dark:text-white capitalize">
                {r.report_type || '—'}
              </td>
              <td className="py-2 pr-4 text-gray-700 dark:text-gray-300 capitalize">
                {r.report_status || '—'}
              </td>
              <td className="py-2 pr-4 text-gray-700 dark:text-gray-300">
                {r.generated_by?.full_name || r.generated_by?.email || '—'}
              </td>
              <td className="py-2 pr-4 text-gray-700 dark:text-gray-300">
                {r.approved_by?.full_name || r.approved_by?.email || '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ProgrammeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isPlatformContext = location.pathname.startsWith('/platform');
  const basePath = isPlatformContext ? '/platform/programme' : '/programme';
  const [programme, setProgramme] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showForm, setShowForm] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    if (id) {
      fetchProgramme();
    }
  }, [id]);

  const fetchProgramme = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getProgramme(id);
      setProgramme(data);
    } catch (err) {
      console.error('Error fetching programme:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteProgramme(id);
      navigate(basePath, { replace: true, state: { toast: { type: 'success', message: `Programme "${programme?.programme_name}" (${programme?.programme_code || id}) deleted successfully.` } } });
    } catch (error) {
      console.error('Error deleting programme:', error);
      alert('Error deleting programme: ' + error.message);
    }
  };

  const handleProgrammeSaved = () => {
    setShowForm(false);
    fetchProgramme();
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Loading programme...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-800 dark:text-red-300">
            <AlertTriangle className="h-5 w-5" />
            <span className="font-medium">Error loading programme: {error}</span>
          </div>
          <button
            onClick={() => navigate(basePath)}
            className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium"
          >
            Back to Programmes
          </button>
        </div>
      </div>
    );
  }

  if (!programme) {
    return null;
  }

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: Activity },
    { id: 'projects', label: 'Projects', icon: Target },
    { id: 'dependencies', label: 'Dependencies', icon: Link2 },
    { id: 'benefits', label: 'Benefits', icon: CheckCircle },
    { id: 'timeline', label: 'Timeline', icon: Calendar },
    { id: 'reports', label: 'Reports', icon: TrendingUp },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={() => navigate(basePath)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <Target className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  {programme.programme_name}
                </h1>
                {programme.programme_code && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {programme.programme_code}
                  </p>
                )}
              </div>
            </div>
            {programme.programme_description && (
              <p className="text-gray-600 dark:text-gray-400 mt-2 max-w-3xl">
                {programme.programme_description}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <ExportRecordButtons
              onExportPPT={() => exportRecordToPPT(PROGRAMME_VIEW_SECTIONS, programme, `Programme_${programme.programme_code || id}`)}
              onExportWord={() => exportRecordToWord(PROGRAMME_VIEW_SECTIONS, programme, `Programme_${programme.programme_code || id}`)}
              onExportExcel={() => exportRecordToExcel(PROGRAMME_VIEW_SECTIONS, programme, `Programme_${programme.programme_code || id}`)}
              onExportCSV={() => exportRecordToCSV(PROGRAMME_VIEW_SECTIONS, programme, `Programme_${programme.programme_code || id}`)}
              onExportXML={() => exportRecordToXML(PROGRAMME_VIEW_SECTIONS, programme, `Programme_${programme.programme_code || id}`)}
              onExportJSON={() => exportRecordToJSON(PROGRAMME_VIEW_SECTIONS, programme, `Programme_${programme.programme_code || id}`)}
              onExportPrint={() => exportRecordToPrint(PROGRAMME_VIEW_SECTIONS, programme, `Programme_${programme.programme_code || id}`)}
            />
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              <Edit2 className="h-4 w-4" />
              Edit
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <nav className="-mb-px flex space-x-8 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap
                  ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  }
                `}
              >
                <Icon className="h-5 w-5" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'dashboard' && (
          <ProgrammeDashboard programmeId={id} />
        )}

        {activeTab === 'projects' && (
          <ProgrammeProjectsTab programmeId={id} />
        )}

        {activeTab === 'dependencies' && (
          <ProgrammeDependenciesTab programmeId={id} />
        )}

        {activeTab === 'benefits' && (
          <ProgrammeBenefitsTab programmeId={id} />
        )}

        {activeTab === 'timeline' && (
          <ProgrammeTimelineTab programmeId={id} programme={programme} />
        )}

        {activeTab === 'reports' && (
          <ProgrammeReportsTab programmeId={id} />
        )}
      </div>

      {/* Edit Form Modal */}
      {showForm && (
        <ProgrammeForm
          programme={programme}
          onSave={handleProgrammeSaved}
          onCancel={() => setShowForm(false)}
        />
      )}
    </div>
  );
}


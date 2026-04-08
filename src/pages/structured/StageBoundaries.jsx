import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import { usePlatformProjectId } from '../../hooks/usePlatformProjectId.js'
import { supabase } from '../../services/supabaseClient';
import { FileText, AlertTriangle, ArrowRight, Settings, AlertCircle, ArrowLeft } from 'lucide-react';
import StageBoundaryDashboard from '../../components/structured/boundaries/StageBoundaryDashboard';
import EndStageReportList from '../../components/structured/boundaries/EndStageReportList';
import EndStageReportForm from '../../components/structured/boundaries/EndStageReportForm';
import ExceptionPlanList from '../../components/structured/boundaries/ExceptionPlanList';
import ExceptionPlanForm from '../../components/structured/boundaries/ExceptionPlanForm';
import NextStagePlanList from '../../components/structured/boundaries/NextStagePlanList';
import NextStagePlanForm from '../../components/structured/boundaries/NextStagePlanForm';
import {
  fetchEndStageReports,
  fetchExceptionPlans,
  fetchNextStagePlans
} from '../../services/stageBoundariesService';

export default function StageBoundaries() {
  const { projectId, routeKey } = usePlatformProjectId();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [projectBoard, setProjectBoard] = useState(null);
  const [endStageReports, setEndStageReports] = useState([]);
  const [exceptionPlans, setExceptionPlans] = useState([]);
  const [nextStagePlans, setNextStagePlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');

  const [showReportForm, setShowReportForm] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [showExceptionForm, setShowExceptionForm] = useState(false);
  const [selectedException, setSelectedException] = useState(null);
  const [showNextStageForm, setShowNextStageForm] = useState(false);
  const [selectedNextStage, setSelectedNextStage] = useState(null);

  useEffect(() => {
    if (projectId) {
      fetchData();
    }
  }, [projectId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch project
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('id, project_name, project_code, project_description')
        .eq('id', projectId)
        .eq('is_deleted', false)
        .single();

      if (projectError) throw projectError;
      setProject(projectData);

      // Fetch project board
      const { data: boardData, error: boardError } = await supabase
        .from('project_boards')
        .select('*')
        .eq('project_id', projectId)
        .eq('is_deleted', false)
        .maybeSingle();

      if (boardError && boardError.code !== 'PGRST116') throw boardError;
      setProjectBoard(boardData);

      // Fetch all stage boundary data
      await loadBoundaryData();

    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadBoundaryData = async () => {
    try {
      // Fetch end stage reports
      const reportsData = await fetchEndStageReports(projectId);
      setEndStageReports(reportsData || []);

      // Fetch exception plans
      const exceptionsData = await fetchExceptionPlans(projectId);
      setExceptionPlans(exceptionsData || []);

      // Fetch next stage plans
      const nextStageData = await fetchNextStagePlans(projectId);
      setNextStagePlans(nextStageData || []);

    } catch (err) {
      console.error('Error loading boundary data:', err);
    }
  };

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: Settings },
    { id: 'reports', label: 'End Stage Reports', icon: FileText, count: endStageReports.length },
    { id: 'exceptions', label: 'Exception Plans', icon: AlertTriangle, count: exceptionPlans.length },
    { id: 'nextstage', label: 'Next Stage Plans', icon: ArrowRight, count: nextStagePlans.length }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
              <div>
                <h3 className="text-lg font-semibold text-red-900 dark:text-red-300">
                  Error Loading Project
                </h3>
                <p className="text-sm text-red-700 dark:text-red-400 mt-1">{error}</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/projects')}
              className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium"
            >
              Back to Projects
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <button
            onClick={() => navigate(`/projects/${projectId}`)}
            className="mb-4 flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Project
          </button>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Managing Stage Boundaries
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                {project?.project_name} ({project?.project_code})
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="mt-6 flex gap-2 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-3 font-medium text-sm flex items-center gap-2 border-b-2 whitespace-nowrap transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                  {tab.count !== undefined && tab.count > 0 && (
                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                      activeTab === tab.id
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                        : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === 'dashboard' && <StageBoundaryDashboard projectId={projectId} />}

        {activeTab === 'reports' && (
          <EndStageReportList
            reports={endStageReports}
            onEdit={(report) => {
              // Navigate to edit page instead of modal
              navigate(`/app/projects/${projectId}/stage-boundaries/end-stage-reports/${report.id}/edit`);
            }}
            onView={(report) => {
              // Navigate to view page
              navigate(`/app/projects/${projectId}/stage-boundaries/end-stage-reports/${report.id}`);
            }}
            onRefresh={loadBoundaryData}
            onAdd={() => {
              // Navigate to create page
              navigate(`/app/projects/${projectId}/stage-boundaries/end-stage-reports/create`);
            }}
          />
        )}

        {activeTab === 'exceptions' && (
          <ExceptionPlanList
            plans={exceptionPlans}
            onEdit={(plan) => {
              setSelectedException(plan);
              setShowExceptionForm(true);
            }}
            onRefresh={loadBoundaryData}
            onAdd={() => {
              setSelectedException(null);
              setShowExceptionForm(true);
            }}
          />
        )}

        {activeTab === 'nextstage' && (
          <NextStagePlanList
            plans={nextStagePlans}
            onEdit={(plan) => {
              setSelectedNextStage(plan);
              setShowNextStageForm(true);
            }}
            onRefresh={loadBoundaryData}
            onAdd={() => {
              setSelectedNextStage(null);
              setShowNextStageForm(true);
            }}
          />
        )}
      </div>

      {/* Modals */}
      {showReportForm && (
        <EndStageReportForm
          projectId={projectId}
          boardId={projectBoard?.id}
          report={selectedReport}
          onClose={() => {
            setShowReportForm(false);
            setSelectedReport(null);
          }}
          onSuccess={loadBoundaryData}
        />
      )}

      {showExceptionForm && (
        <ExceptionPlanForm
          projectId={projectId}
          boardId={projectBoard?.id}
          plan={selectedException}
          onClose={() => {
            setShowExceptionForm(false);
            setSelectedException(null);
          }}
          onSuccess={loadBoundaryData}
        />
      )}

      {showNextStageForm && (
        <NextStagePlanForm
          projectId={projectId}
          plan={selectedNextStage}
          onClose={() => {
            setShowNextStageForm(false);
            setSelectedNextStage(null);
          }}
          onSuccess={loadBoundaryData}
        />
      )}
    </div>
  );
}

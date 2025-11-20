import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabaseClient';
import {
  FileX,
  LayoutDashboard,
  FileText,
  Lightbulb,
  ArrowRight,
  CheckCircle,
  ArrowLeft,
  Plus
} from 'lucide-react';
import {
  fetchProjectClosure,
  fetchEndProjectReport,
  fetchLessonsLearned,
  fetchFollowOnActions,
  fetchProjectHandover
} from '../../services/closingProjectService';
import ProjectClosureDashboard from '../../components/structured/closing/ProjectClosureDashboard';
import ProjectClosureForm from '../../components/structured/closing/ProjectClosureForm';
import EndProjectReportForm from '../../components/structured/closing/EndProjectReportForm';
import LessonsLearnedForm from '../../components/structured/closing/LessonsLearnedForm';
import LessonsLearnedList from '../../components/structured/closing/LessonsLearnedList';
import FollowOnActionsForm from '../../components/structured/closing/FollowOnActionsForm';
import FollowOnActionsList from '../../components/structured/closing/FollowOnActionsList';
import HandoverChecklist from '../../components/structured/closing/HandoverChecklist';

export default function ClosingProject() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);

  // Data states
  const [closure, setClosure] = useState(null);
  const [endReport, setEndReport] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [actions, setActions] = useState([]);
  const [handover, setHandover] = useState(null);

  // Modal states
  const [showClosureForm, setShowClosureForm] = useState(false);
  const [showEndReportForm, setShowEndReportForm] = useState(false);
  const [showLessonForm, setShowLessonForm] = useState(false);
  const [showActionForm, setShowActionForm] = useState(false);
  const [showHandoverChecklist, setShowHandoverChecklist] = useState(false);

  // Edit states
  const [editingLesson, setEditingLesson] = useState(null);
  const [editingAction, setEditingAction] = useState(null);

  useEffect(() => {
    if (projectId) {
      loadProjectData();
      loadClosingData();
    }
  }, [projectId]);

  const loadProjectData = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, project_name, project_code, project_status')
        .eq('id', projectId)
        .single();

      if (error) throw error;
      setProject(data);
    } catch (error) {
      console.error('Error loading project:', error);
    }
  };

  const loadClosingData = async () => {
    try {
      setLoading(true);
      const [closureData, reportData, lessonsData, actionsData, handoverData] = await Promise.all([
        fetchProjectClosure(projectId),
        fetchEndProjectReport(projectId),
        fetchLessonsLearned(projectId),
        fetchFollowOnActions(projectId),
        fetchProjectHandover(projectId)
      ]);

      setClosure(closureData);
      setEndReport(reportData);
      setLessons(lessonsData);
      setActions(actionsData);
      setHandover(handoverData);
    } catch (error) {
      console.error('Error loading closing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate(`/projects/${projectId}`);
  };

  const handleClosureSuccess = () => {
    loadClosingData();
    setShowClosureForm(false);
  };

  const handleEndReportSuccess = () => {
    loadClosingData();
    setShowEndReportForm(false);
  };

  const handleLessonSuccess = () => {
    loadClosingData();
    setShowLessonForm(false);
    setEditingLesson(null);
  };

  const handleActionSuccess = () => {
    loadClosingData();
    setShowActionForm(false);
    setEditingAction(null);
  };

  const handleHandoverSuccess = () => {
    loadClosingData();
    setShowHandoverChecklist(false);
  };

  const handleEditLesson = (lesson) => {
    setEditingLesson(lesson);
    setShowLessonForm(true);
  };

  const handleEditAction = (action) => {
    setEditingAction(action);
    setShowActionForm(true);
  };

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'closure', label: 'Closure', icon: FileX },
    { id: 'end-report', label: 'End Report', icon: FileText },
    { id: 'lessons', label: 'Lessons Learned', icon: Lightbulb },
    { id: 'actions', label: 'Follow-on Actions', icon: ArrowRight },
    { id: 'handover', label: 'Handover', icon: CheckCircle }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <ProjectClosureDashboard projectId={projectId} />;

      case 'closure':
        return (
          <div className="space-y-6">
            {closure ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                      Project Closure
                    </h3>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 capitalize">
                        {closure.closure_type.replace('-', ' ')}
                      </span>
                      <span className="px-3 py-1 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 capitalize">
                        {closure.closure_status.replace('-', ' ')}
                      </span>
                      <span className="px-3 py-1 rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 capitalize">
                        {closure.closure_phase.replace('-', ' ')}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowClosureForm(true)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
                  >
                    Edit Closure
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Closure Reason
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {closure.closure_reason}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Checklist Completion
                    </h4>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-green-600 dark:bg-green-400 h-2 rounded-full"
                          style={{ width: `${closure.checklist_completion_percentage}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        {closure.checklist_completion_percentage}%
                      </span>
                    </div>
                  </div>
                </div>

                {closure.performance_summary && (
                  <div className="mt-6">
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Performance Summary
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {closure.performance_summary}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
                <FileX className="h-16 w-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  No Closure Initiated
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Start the project closure process to formally close this project
                </p>
                <button
                  onClick={() => setShowClosureForm(true)}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium inline-flex items-center gap-2"
                >
                  <Plus className="h-5 w-5" />
                  Initiate Closure
                </button>
              </div>
            )}
          </div>
        );

      case 'end-report':
        return (
          <div className="space-y-6">
            {endReport ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                      {endReport.report_title}
                    </h3>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-gray-600 dark:text-gray-400">
                        {new Date(endReport.report_date).toLocaleDateString()}
                      </span>
                      <span className={`px-3 py-1 rounded-full capitalize ${
                        endReport.report_status === 'final'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                          : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                      }`}>
                        {endReport.report_status}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowEndReportForm(true)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
                  >
                    Edit Report
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Executive Summary
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {endReport.executive_summary}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
                <FileText className="h-16 w-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  No End Project Report
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Create a comprehensive end project report
                </p>
                <button
                  onClick={() => setShowEndReportForm(true)}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium inline-flex items-center gap-2"
                >
                  <Plus className="h-5 w-5" />
                  Create Report
                </button>
              </div>
            )}
          </div>
        );

      case 'lessons':
        return (
          <LessonsLearnedList
            lessons={lessons}
            onEdit={handleEditLesson}
            onRefresh={loadClosingData}
            onAdd={() => {
              setEditingLesson(null);
              setShowLessonForm(true);
            }}
          />
        );

      case 'actions':
        return (
          <FollowOnActionsList
            actions={actions}
            onEdit={handleEditAction}
            onRefresh={loadClosingData}
            onAdd={() => {
              setEditingAction(null);
              setShowActionForm(true);
            }}
          />
        );

      case 'handover':
        return (
          <div className="space-y-6">
            {handover ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                      Project Handover
                    </h3>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 capitalize">
                        {handover.handover_type}
                      </span>
                      <span className={`px-3 py-1 rounded-full capitalize ${
                        handover.handover_status === 'completed'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                          : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                      }`}>
                        {handover.handover_status.replace('-', ' ')}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowHandoverChecklist(true)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
                  >
                    Edit Handover
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <div className="flex items-center gap-3">
                    <CheckCircle className={`h-5 w-5 ${
                      handover.documentation_complete
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-gray-400 dark:text-gray-500'
                    }`} />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Documentation
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className={`h-5 w-5 ${
                      handover.training_complete
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-gray-400 dark:text-gray-500'
                    }`} />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Training
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className={`h-5 w-5 ${
                      handover.knowledge_transfer_complete
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-gray-400 dark:text-gray-500'
                    }`} />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Knowledge Transfer
                    </span>
                  </div>
                </div>

                {handover.support_arrangements && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Support Arrangements
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {handover.support_arrangements}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
                <CheckCircle className="h-16 w-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  No Handover Documented
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Create a handover checklist to transition to operations
                </p>
                <button
                  onClick={() => setShowHandoverChecklist(true)}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium inline-flex items-center gap-2"
                >
                  <Plus className="h-5 w-5" />
                  Create Handover
                </button>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={handleBack}
                className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Closing Project
                </h1>
                {project && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {project.project_name} ({project.project_code})
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-1 py-4 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderTabContent()}
      </div>

      {/* Modals */}
      {showClosureForm && (
        <ProjectClosureForm
          projectId={projectId}
          closure={closure}
          onClose={() => setShowClosureForm(false)}
          onSuccess={handleClosureSuccess}
        />
      )}

      {showEndReportForm && (
        <EndProjectReportForm
          projectId={projectId}
          report={endReport}
          onClose={() => setShowEndReportForm(false)}
          onSuccess={handleEndReportSuccess}
        />
      )}

      {showLessonForm && (
        <LessonsLearnedForm
          projectId={projectId}
          lesson={editingLesson}
          onClose={() => {
            setShowLessonForm(false);
            setEditingLesson(null);
          }}
          onSuccess={handleLessonSuccess}
        />
      )}

      {showActionForm && (
        <FollowOnActionsForm
          projectId={projectId}
          action={editingAction}
          onClose={() => {
            setShowActionForm(false);
            setEditingAction(null);
          }}
          onSuccess={handleActionSuccess}
        />
      )}

      {showHandoverChecklist && (
        <HandoverChecklist
          projectId={projectId}
          onClose={() => setShowHandoverChecklist(false)}
          onSuccess={handleHandoverSuccess}
        />
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import {
  FileEdit,
  LayoutDashboard,
  List,
  ArrowLeft
} from 'lucide-react';
import {
  fetchChangeRequests
} from '../services/changeManagementService';
import ChangeManagementDashboard from '../components/change/ChangeManagementDashboard';
import ChangeRequestForm from '../components/change/ChangeRequestForm';
import ChangeRequestList from '../components/change/ChangeRequestList';
import ChangeAssessmentForm from '../components/change/ChangeAssessmentForm';

export default function ChangeManagement() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);

  // Data states
  const [requests, setRequests] = useState([]);

  // Modal states
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [showAssessmentForm, setShowAssessmentForm] = useState(false);

  // Edit states
  const [editingRequest, setEditingRequest] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);

  useEffect(() => {
    if (projectId) {
      loadProjectData();
      loadChangeData();
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

  const loadChangeData = async () => {
    try {
      setLoading(true);
      const requestsData = await fetchChangeRequests(projectId);
      setRequests(requestsData);
    } catch (error) {
      console.error('Error loading change data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate(`/projects/${projectId}`);
  };

  const handleRequestSuccess = () => {
    loadChangeData();
    setShowRequestForm(false);
    setEditingRequest(null);
  };

  const handleAssessmentSuccess = () => {
    loadChangeData();
    setShowAssessmentForm(false);
    setSelectedRequest(null);
  };

  const handleEditRequest = (request) => {
    setEditingRequest(request);
    setShowRequestForm(true);
  };

  const handleSelectRequest = (request) => {
    setSelectedRequest(request);
    // Could navigate to a detail page or open assessment form
    setShowAssessmentForm(true);
  };

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'requests', label: 'Change Requests', icon: List }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <ChangeManagementDashboard projectId={projectId} />;

      case 'requests':
        return (
          <ChangeRequestList
            requests={requests}
            onEdit={handleEditRequest}
            onRefresh={loadChangeData}
            onAdd={() => {
              setEditingRequest(null);
              setShowRequestForm(true);
            }}
            onSelect={handleSelectRequest}
          />
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
                  Change Management
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
      {showRequestForm && (
        <ChangeRequestForm
          projectId={projectId}
          request={editingRequest}
          onClose={() => {
            setShowRequestForm(false);
            setEditingRequest(null);
          }}
          onSuccess={handleRequestSuccess}
        />
      )}

      {showAssessmentForm && selectedRequest && (
        <ChangeAssessmentForm
          projectId={projectId}
          changeRequestId={selectedRequest.id}
          onClose={() => {
            setShowAssessmentForm(false);
            setSelectedRequest(null);
          }}
          onSuccess={handleAssessmentSuccess}
        />
      )}
    </div>
  );
}

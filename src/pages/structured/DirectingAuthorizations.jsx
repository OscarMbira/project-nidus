import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import { usePlatformProjectId } from '../../hooks/usePlatformProjectId.js'
import { supabase } from '../../services/supabaseClient';
import { ArrowLeft, FileCheck, MessageSquare, AlertCircle } from 'lucide-react';
import AuthorizationList from '../../components/structured/directing/AuthorizationList';
import AdHocDirectionList from '../../components/structured/directing/AdHocDirectionList';
import AuthorizationForm from '../../components/structured/directing/AuthorizationForm';
import AdHocDirectionForm from '../../components/structured/directing/AdHocDirectionForm';
import {
  fetchProjectAuthorizations,
  fetchAdHocDirections
} from '../../services/directingProjectService';

export default function DirectingAuthorizations() {
  const { projectId, routeKey } = usePlatformProjectId();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [projectBoard, setProjectBoard] = useState(null);
  const [authorizations, setAuthorizations] = useState([]);
  const [directions, setDirections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('authorizations'); // 'authorizations', 'adhoc'

  const [showAuthForm, setShowAuthForm] = useState(false);
  const [selectedAuth, setSelectedAuth] = useState(null);
  const [showDirectionForm, setShowDirectionForm] = useState(false);
  const [selectedDirection, setSelectedDirection] = useState(null);

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
        .select('id, project_name, project_code')
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

      // Fetch authorizations
      const authData = await fetchProjectAuthorizations(projectId);
      setAuthorizations(authData || []);

      // Fetch ad-hoc directions
      const directionData = await fetchAdHocDirections(projectId);
      setDirections(directionData || []);

    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'authorizations', label: 'Authorizations', icon: FileCheck, count: authorizations.length },
    { id: 'adhoc', label: 'Ad-Hoc Directions', icon: MessageSquare, count: directions.length }
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
                  Error Loading Data
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
                Authorizations & Direction
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                {project?.project_name} ({project?.project_code})
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="mt-6 flex gap-2 border-b border-gray-200 dark:border-gray-700">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                  {tab.count > 0 && (
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
        {activeTab === 'authorizations' && (
          <AuthorizationList
            authorizations={authorizations}
            onEdit={(auth) => {
              setSelectedAuth(auth);
              setShowAuthForm(true);
            }}
            onRefresh={fetchData}
            onAdd={() => {
              setSelectedAuth(null);
              setShowAuthForm(true);
            }}
          />
        )}

        {activeTab === 'adhoc' && (
          <AdHocDirectionList
            directions={directions}
            onEdit={(direction) => {
              setSelectedDirection(direction);
              setShowDirectionForm(true);
            }}
            onRefresh={fetchData}
            onAdd={() => {
              setSelectedDirection(null);
              setShowDirectionForm(true);
            }}
          />
        )}
      </div>

      {/* Modals */}
      {showAuthForm && (
        <AuthorizationForm
          projectId={projectId}
          boardId={projectBoard?.id}
          authorization={selectedAuth}
          onClose={() => {
            setShowAuthForm(false);
            setSelectedAuth(null);
          }}
          onSuccess={fetchData}
        />
      )}

      {showDirectionForm && (
        <AdHocDirectionForm
          projectId={projectId}
          direction={selectedDirection}
          onClose={() => {
            setShowDirectionForm(false);
            setSelectedDirection(null);
          }}
          onSuccess={fetchData}
        />
      )}
    </div>
  );
}

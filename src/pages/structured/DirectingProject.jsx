import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabaseClient';
import { Users, Calendar, FileCheck, Settings, AlertCircle, ArrowLeft } from 'lucide-react';
import ProjectBoardDashboard from '../../components/structured/directing/ProjectBoardDashboard';
import BoardMemberList from '../../components/structured/directing/BoardMemberList';
import BoardMeetingList from '../../components/structured/directing/BoardMeetingList';
import BoardDecisionList from '../../components/structured/directing/BoardDecisionList';
import BoardMemberForm from '../../components/structured/directing/BoardMemberForm';
import BoardMeetingForm from '../../components/structured/directing/BoardMeetingForm';
import {
  fetchProjectBoard,
  fetchBoardMembers,
  fetchBoardMeetings,
  fetchBoardDecisions
} from '../../services/directingProjectService';

export default function DirectingProject() {
  const { projectId } = useParams();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [projectBoard, setProjectBoard] = useState(null);
  const [members, setMembers] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [decisions, setDecisions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard', 'members', 'meetings', 'decisions'
  const [showMemberForm, setShowMemberForm] = useState(false);
  const [showMeetingForm, setShowMeetingForm] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [selectedMeeting, setSelectedMeeting] = useState(null);

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

      // Check if project board exists
      const { data: boardData, error: boardError } = await supabase
        .from('project_boards')
        .select('*')
        .eq('project_id', projectId)
        .eq('is_deleted', false)
        .maybeSingle();

      if (boardError && boardError.code !== 'PGRST116') throw boardError;

      if (boardData) {
        setProjectBoard(boardData);
        await loadBoardData(boardData.id);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadBoardData = async (boardId) => {
    try {
      // Fetch board members
      const membersData = await fetchBoardMembers(boardId);
      setMembers(membersData || []);

      // Fetch board meetings
      const meetingsData = await fetchBoardMeetings(boardId);
      setMeetings(meetingsData || []);

      // Fetch board decisions for this project
      const decisionsData = await fetchBoardDecisions(null, projectId);
      setDecisions(decisionsData || []);
    } catch (err) {
      console.error('Error loading board data:', err);
    }
  };

  const handleCreateBoard = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('project_boards')
        .insert({
          project_id: projectId,
          board_name: `${project.project_name} Project Board`,
          board_description: `Project Board for ${project.project_name}`,
          is_active: true,
          created_by: user.id
        })
        .select()
        .single();

      if (error) throw error;

      setProjectBoard(data);
      await loadBoardData(data.id);
    } catch (err) {
      console.error('Error creating project board:', err);
      alert('Error creating project board: ' + err.message);
    }
  };

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: Settings },
    { id: 'members', label: 'Board Members', icon: Users },
    { id: 'meetings', label: 'Meetings', icon: Calendar },
    { id: 'decisions', label: 'Decisions', icon: FileCheck }
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

  if (!projectBoard) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => navigate(`/projects/${projectId}`)}
            className="mb-6 flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Project
          </button>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
            <Users className="h-20 w-20 text-gray-400 dark:text-gray-500 mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
              No Project Board Established
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-2">
              Create a project board to start directing and governing this project
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mb-8">
              Project: <span className="font-semibold">{project?.project_name}</span>
            </p>
            <button
              onClick={handleCreateBoard}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium inline-flex items-center gap-2"
            >
              <Users className="h-5 w-5" />
              Create Project Board
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
                Directing a Project
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                {project?.project_name} • {projectBoard?.board_name}
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
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === 'dashboard' && <ProjectBoardDashboard boardId={projectBoard.id} />}

        {activeTab === 'members' && (
          <BoardMemberList
            members={members}
            onEdit={(member) => {
              setSelectedMember(member);
              setShowMemberForm(true);
            }}
            onRefresh={() => loadBoardData(projectBoard.id)}
            onAdd={() => {
              setSelectedMember(null);
              setShowMemberForm(true);
            }}
          />
        )}

        {activeTab === 'meetings' && (
          <BoardMeetingList
            meetings={meetings}
            onEdit={(meeting) => {
              setSelectedMeeting(meeting);
              setShowMeetingForm(true);
            }}
            onRefresh={() => loadBoardData(projectBoard.id)}
            onAdd={() => {
              setSelectedMeeting(null);
              setShowMeetingForm(true);
            }}
            onViewDetails={(meeting) => {
              setSelectedMeeting(meeting);
              setShowMeetingForm(true);
            }}
          />
        )}

        {activeTab === 'decisions' && (
          <BoardDecisionList
            decisions={decisions}
            onEdit={(decision) => {
              // TODO: Open decision edit modal
              console.log('Edit decision:', decision);
            }}
            onRefresh={() => loadBoardData(projectBoard.id)}
          />
        )}
      </div>

      {/* Modals */}
      {showMemberForm && (
        <BoardMemberForm
          boardId={projectBoard.id}
          member={selectedMember}
          onClose={() => {
            setShowMemberForm(false);
            setSelectedMember(null);
          }}
          onSuccess={() => loadBoardData(projectBoard.id)}
        />
      )}

      {showMeetingForm && (
        <BoardMeetingForm
          boardId={projectBoard.id}
          meeting={selectedMeeting}
          onClose={() => {
            setShowMeetingForm(false);
            setSelectedMeeting(null);
          }}
          onSuccess={() => loadBoardData(projectBoard.id)}
        />
      )}
    </div>
  );
}

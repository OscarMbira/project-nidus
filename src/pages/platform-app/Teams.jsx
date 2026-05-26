/**
 * Teams Module
 * Team and resource management
 * Route: /platform/teams
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, UserPlus, Search, Plus, Building2, Calendar, BarChart3, UserSearch } from 'lucide-react';
import { platformDb } from '../../services/supabase/supabaseClient';
import { getAllTeams, getResourceDirectory } from '../../services/teamService';
import { TableRowNumberHeader, TableRowNumberCell } from '../../components/ui/Table'
import { getDisplayRowNumber } from '../../utils/tableRowNumberUtils'

export default function Teams() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [organizationId, setOrganizationId] = useState(null);
  const [teams, setTeams] = useState([]);
  const [resources, setResources] = useState([]);
  const [activeTab, setActiveTab] = useState('teams'); // 'teams', 'directory', 'skills', 'capacity', 'leaves'
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadOrganization();
  }, []);

  useEffect(() => {
    if (organizationId) {
      if (activeTab === 'teams') {
        loadTeams();
      } else if (activeTab === 'directory') {
        loadResources();
      }
    }
  }, [organizationId, activeTab]);

  const loadOrganization = async () => {
    try {
      const { data: { user } } = await platformDb.auth.getUser();
      if (!user) {
        navigate('/auth/login');
        return;
      }

      // Get user's account
      const { data: userRecord } = await platformDb
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .single();

      if (userRecord) {
        // Get account from accounts table
        const { data: account } = await platformDb
          .from('accounts')
          .select('id')
          .eq('owner_user_id', userRecord.id)
          .single();

        if (account) {
          setOrganizationId(account.id);
        } else {
          // Try through projects
          const { data: project } = await platformDb
            .from('projects')
            .select('account_id')
            .eq('owner_user_id', userRecord.id)
            .eq('is_deleted', false)
            .limit(1)
            .single();

          if (project?.account_id) {
            setOrganizationId(project.account_id);
          }
        }
      }
    } catch (error) {
      console.error('Error loading organization:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTeams = async () => {
    if (!organizationId) return;
    
    try {
      setLoading(true);
      const result = await getAllTeams(organizationId);
      if (result.success) {
        setTeams(result.data || []);
      }
    } catch (error) {
      console.error('Error loading teams:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadResources = async () => {
    if (!organizationId) return;
    
    try {
      setLoading(true);
      const result = await getResourceDirectory(organizationId, { search: searchTerm });
      if (result.success) {
        setResources(result.data || []);
      }
    } catch (error) {
      console.error('Error loading resources:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTeams = teams.filter(team =>
    team.team_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    team.team_description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    team.projects?.project_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredResources = resources.filter(resource =>
    resource.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    resource.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    resource.job_title?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading && !organizationId) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading teams...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-purple-400" />
              <h1 className="text-3xl font-bold text-gray-100">Teams</h1>
            </div>
            {activeTab === 'teams' && (
              <button
                onClick={() => navigate('/platform/teams/create')}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              >
                <Plus className="h-5 w-5" />
                Create Team
              </button>
            )}
          </div>
          <p className="text-gray-400">
            Manage organization teams, resources, and capacity planning
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-700">
          <nav className="flex space-x-8">
            {[
              { id: 'teams', label: 'All Teams', icon: Users },
              { id: 'directory', label: 'Resource Directory', icon: UserSearch },
              { id: 'skills', label: 'Skill Matrix', icon: BarChart3 },
              { id: 'capacity', label: 'Capacity Planning', icon: Calendar },
              { id: 'leaves', label: 'Leave Calendar', icon: Calendar }
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-purple-500 text-purple-400'
                      : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-600'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Search */}
        {(activeTab === 'teams' || activeTab === 'directory') && (
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder={activeTab === 'teams' ? 'Search teams...' : 'Search resources...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>
        )}

        {/* Content */}
        {activeTab === 'teams' && (
          <div>
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400 mx-auto mb-4"></div>
                <p className="text-gray-400">Loading teams...</p>
              </div>
            ) : filteredTeams.length === 0 ? (
              <div className="bg-gray-800 rounded-lg border border-gray-700 p-12 text-center">
                <Users className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-300 mb-2">No Teams Found</h3>
                <p className="text-gray-500 mb-6">
                  {searchTerm ? 'No teams match your search.' : 'Get started by creating your first team.'}
                </p>
                {!searchTerm && (
                  <button
                    onClick={() => navigate('/platform/teams/create')}
                    className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                  >
                    Create Team
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTeams.map(team => (
                  <div
                    key={team.id}
                    onClick={() =>
                      navigate(
                        `/platform/teams/${encodeURIComponent(
                          (team.team_code && String(team.team_code).trim()) || team.id,
                        )}`,
                      )
                    }
                    className="bg-gray-800 rounded-lg border border-gray-700 p-6 hover:border-purple-500 transition-colors cursor-pointer"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-100 mb-1">{team.team_name}</h3>
                        {team.projects && (
                          <p className="text-sm text-gray-400">{team.projects.project_name}</p>
                        )}
                      </div>
                      {team.team_type && (
                        <span className="px-2 py-1 text-xs bg-purple-900/30 text-purple-300 rounded">
                          {team.team_type}
                        </span>
                      )}
                    </div>
                    {team.team_description && (
                      <p className="text-sm text-gray-400 mb-4 line-clamp-2">{team.team_description}</p>
                    )}
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <span>{team.max_team_size ? `Max: ${team.max_team_size}` : 'Unlimited size'}</span>
                      <span className={team.is_active ? 'text-green-400' : 'text-gray-600'}>
                        {team.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'directory' && (
          <div>
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400 mx-auto mb-4"></div>
                <p className="text-gray-400">Loading resources...</p>
              </div>
            ) : filteredResources.length === 0 ? (
              <div className="bg-gray-800 rounded-lg border border-gray-700 p-12 text-center">
                <UserSearch className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-300 mb-2">No Resources Found</h3>
                <p className="text-gray-500">
                  {searchTerm ? 'No resources match your search.' : 'No resources available in your organization.'}
                </p>
              </div>
            ) : (
              <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-700/50">
                      <tr>
                <TableRowNumberHeader className="!normal-case" />
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Email</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Job Title</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Department</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {filteredResources.map(resource => (
                        <tr key={resource.id} className="hover:bg-gray-700/30 cursor-pointer">
                    <TableRowNumberCell number={getDisplayRowNumber(index)} />
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              {resource.avatar_url ? (
                                <img src={resource.avatar_url} alt={resource.full_name} className="h-10 w-10 rounded-full mr-3" />
                              ) : (
                                <div className="h-10 w-10 rounded-full bg-purple-600 flex items-center justify-center text-white font-semibold mr-3">
                                  {resource.full_name?.charAt(0) || '?'}
                                </div>
                              )}
                              <span className="text-gray-100 font-medium">{resource.full_name || 'Unknown'}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-gray-400">{resource.email}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-gray-400">{resource.job_title || '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-gray-400">{resource.department || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {(activeTab === 'skills' || activeTab === 'capacity' || activeTab === 'leaves') && (
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-12">
            <div className="text-center max-w-2xl mx-auto">
              <Building2 className="h-20 w-20 text-purple-400 mx-auto mb-4 opacity-50" />
              <h2 className="text-2xl font-bold text-gray-100 mb-3">
                {activeTab === 'skills' && 'Skill Matrix'}
                {activeTab === 'capacity' && 'Capacity Planning'}
                {activeTab === 'leaves' && 'Leave Calendar'}
              </h2>
              <p className="text-gray-400 mb-6">
                This feature is coming soon. We're working on implementing comprehensive {activeTab === 'skills' ? 'skill matrix' : activeTab === 'capacity' ? 'capacity planning' : 'leave management'} functionality.
              </p>
              <button
                onClick={() => navigate('/platform/dashboard')}
                className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

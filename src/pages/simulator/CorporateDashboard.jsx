import React, { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { Users, TrendingUp, Award, Clock, UserPlus, Download } from 'lucide-react';
import { getCorporateLicense, getTeamMembers, getCorporateAnalytics } from '../../services/corporateService';
import { simDb } from '../../services/supabase/supabaseClient';
import { TableRowNumberHeader, TableRowNumberCell } from '../../components/ui/Table'
import { getDisplayRowNumber } from '../../utils/tableRowNumberUtils'

const CorporateDashboard = () => {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [license, setLicense] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [userId, setUserId] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('30days');

  useEffect(() => {
    getCurrentUser();
  }, []);

  useEffect(() => {
    if (userId) {
      loadData();
    }
  }, [userId, selectedPeriod]);

  const getCurrentUser = async () => {
    try {
      const { data: { user } } = await simDb.auth.getUser();
      setUserId(user?.id);
    } catch (error) {
      console.error('Error getting user:', error);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Get user's corporate license
      const { data: corporateUser } = await simDb
        .from('corporate_users')
        .select('license_id')
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();

      if (!corporateUser) {
        setLoading(false);
        return;
      }

      const licenseData = await getCorporateLicense(corporateUser.license_id);
      setLicense(licenseData);

      const members = await getTeamMembers(corporateUser.license_id);
      setTeamMembers(members);

      // Calculate period dates
      const endDate = new Date();
      const startDate = new Date();
      if (selectedPeriod === '7days') {
        startDate.setDate(endDate.getDate() - 7);
      } else if (selectedPeriod === '30days') {
        startDate.setDate(endDate.getDate() - 30);
      } else if (selectedPeriod === '90days') {
        startDate.setDate(endDate.getDate() - 90);
      }

      const analyticsData = await getCorporateAnalytics(
        corporateUser.license_id,
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      );
      setAnalytics(analyticsData);
    } catch (error) {
      console.error('Error loading corporate data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!license) {
    return (
      <div className={`rounded-xl p-12 text-center ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
        <Users className="w-16 h-16 mx-auto mb-4 text-gray-400" />
        <h3 className="text-lg font-medium mb-2">No Corporate License</h3>
        <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
          You are not part of a corporate license
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className={`rounded-xl p-6 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow`}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">{license.company_name}</h1>
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Corporate License Dashboard
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className={`px-4 py-2 rounded-lg border ${
                theme === 'dark'
                  ? 'bg-gray-700 border-gray-600 text-gray-200'
                  : 'bg-white border-gray-300'
              }`}
            >
              <option value="7days">Last 7 days</option>
              <option value="30days">Last 30 days</option>
              <option value="90days">Last 90 days</option>
            </select>
            <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center space-x-2">
              <Download className="w-4 h-4" />
              <span>Export Report</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className={`rounded-xl p-6 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow`}>
          <div className="flex items-center justify-between mb-4">
            <Users className="w-8 h-8 text-blue-500" />
            <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Team Members
            </span>
          </div>
          <p className="text-3xl font-bold">{analytics?.active_users || teamMembers.length}</p>
          <p className={`text-sm mt-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            of {license.max_users} max
          </p>
        </div>

        <div className={`rounded-xl p-6 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow`}>
          <div className="flex items-center justify-between mb-4">
            <TrendingUp className="w-8 h-8 text-green-500" />
            <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Simulations
            </span>
          </div>
          <p className="text-3xl font-bold">{analytics?.completed_simulations || 0}</p>
          <p className={`text-sm mt-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            {analytics?.total_simulations || 0} total
          </p>
        </div>

        <div className={`rounded-xl p-6 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow`}>
          <div className="flex items-center justify-between mb-4">
            <Award className="w-8 h-8 text-yellow-500" />
            <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Certificates
            </span>
          </div>
          <p className="text-3xl font-bold">{analytics?.certificates_earned || 0}</p>
          <p className={`text-sm mt-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            Earned by team
          </p>
        </div>

        <div className={`rounded-xl p-6 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow`}>
          <div className="flex items-center justify-between mb-4">
            <Clock className="w-8 h-8 text-purple-500" />
            <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Avg Score
            </span>
          </div>
          <p className="text-3xl font-bold">
            {analytics?.average_score ? Math.round(analytics.average_score) : 0}%
          </p>
          <p className={`text-sm mt-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            Team average
          </p>
        </div>
      </div>

      {/* Team Members */}
      <div className={`rounded-xl p-6 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Team Members</h2>
          <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center space-x-2">
            <UserPlus className="w-4 h-4" />
            <span>Invite Member</span>
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className={`border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                <TableRowNumberHeader className="!normal-case" />
                <th className="text-left py-3 px-4">Member</th>
                <th className="text-left py-3 px-4">Role</th>
                <th className="text-left py-3 px-4">Status</th>
                <th className="text-left py-3 px-4">Joined</th>
              </tr>
            </thead>
            <tbody>
              {teamMembers.map((member, index) => (
                <tr
                  key={member.id}
                  className={`border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}
                >
                    <TableRowNumberCell number={getDisplayRowNumber(index)} />
                  <td className="py-3 px-4">
                    {member.user?.email || 'Unknown'}
                  </td>
                  <td className="py-3 px-4 capitalize">{member.role}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        member.status === 'active'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {member.status}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {member.joined_at
                      ? new Date(member.joined_at).toLocaleDateString()
                      : 'Pending'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CorporateDashboard;


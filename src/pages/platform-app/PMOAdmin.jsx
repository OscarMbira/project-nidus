/**
 * PMO Admin Module
 * Organization-wide administration and settings
 * Route: /platform/pmo-admin
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Settings, Users, Database, Building2, Key, Bell, FileText, UserCheck } from 'lucide-react';
import { platformDb } from '../../services/supabase/supabaseClient';
import { getAccountById } from '../../services/accountService';

export default function PMOAdmin() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [organizationId, setOrganizationId] = useState(null);
  const [account, setAccount] = useState(null);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'users', 'settings', 'security', 'billing', 'data'

  useEffect(() => {
    loadOrganization();
  }, []);

  useEffect(() => {
    if (organizationId) {
      loadAccount();
    }
  }, [organizationId]);

  const loadOrganization = async () => {
    try {
      const { data: { user } } = await platformDb.auth.getUser();
      if (!user) {
        navigate('/auth/login');
        return;
      }

      const { data: userRecord } = await platformDb
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .single();

      if (userRecord) {
        const { data: accountData } = await platformDb
          .from('accounts')
          .select('id')
          .eq('owner_user_id', userRecord.id)
          .single();

        if (accountData) {
          setOrganizationId(accountData.id);
        } else {
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

  const loadAccount = async () => {
    if (!organizationId) return;

    try {
      const accountData = await getAccountById(organizationId);
      setAccount(accountData);
    } catch (error) {
      console.error('Error loading account:', error);
    }
  };

  if (loading && !organizationId) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading PMO admin...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="h-8 w-8 text-purple-400" />
            <h1 className="text-3xl font-bold text-gray-100">PMO Admin</h1>
          </div>
          <p className="text-gray-400">Organization-wide administration and configuration</p>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-700">
          <nav className="flex space-x-8">
            {[
              { id: 'overview', label: 'Overview', icon: Building2 },
              { id: 'users', label: 'Users & Roles', icon: Users },
              { id: 'settings', label: 'Settings', icon: Settings },
              { id: 'security', label: 'Security', icon: Key },
              { id: 'billing', label: 'Billing', icon: FileText },
              { id: 'data', label: 'Data Management', icon: Database }
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

        {/* Content */}
        {activeTab === 'overview' && (
          <div>
            {account && (
              <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 mb-6">
                <h2 className="text-xl font-semibold text-gray-100 mb-4">Account Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Account Name</p>
                    <p className="text-gray-100">{account.account_name || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Account Code</p>
                    <p className="text-gray-100">{account.account_code || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Account Type</p>
                    <p className="text-gray-100">{account.account_type || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Status</p>
                    <span className={`px-2 py-1 text-xs rounded ${
                      account.is_active ? 'bg-green-900/30 text-green-300' : 'bg-gray-700 text-gray-300'
                    }`}>
                      {account.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
                <UserCheck className="h-8 w-8 text-purple-400 mb-3" />
                <h3 className="text-lg font-semibold text-gray-100 mb-2">Manager assignments</h3>
                <p className="text-gray-400 text-sm mb-4">Assign portfolio, programme, and project managers</p>
                <button
                  type="button"
                  onClick={() => navigate('/platform/pmo-admin/manager-assignments')}
                  className="text-purple-400 hover:text-purple-300 text-sm font-medium"
                >
                  Open assignments →
                </button>
              </div>

              <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
                <Users className="h-8 w-8 text-purple-400 mb-3" />
                <h3 className="text-lg font-semibold text-gray-100 mb-2">User Management</h3>
                <p className="text-gray-400 text-sm mb-4">Manage users, roles, and permissions</p>
                <button
                  onClick={() => setActiveTab('users')}
                  className="text-purple-400 hover:text-purple-300 text-sm font-medium"
                >
                  Manage Users →
                </button>
              </div>

              <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
                <Settings className="h-8 w-8 text-purple-400 mb-3" />
                <h3 className="text-lg font-semibold text-gray-100 mb-2">Organization Settings</h3>
                <p className="text-gray-400 text-sm mb-4">Configure organization preferences</p>
                <button
                  onClick={() => setActiveTab('settings')}
                  className="text-purple-400 hover:text-purple-300 text-sm font-medium"
                >
                  Configure →
                </button>
              </div>

              <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
                <Key className="h-8 w-8 text-purple-400 mb-3" />
                <h3 className="text-lg font-semibold text-gray-100 mb-2">Security</h3>
                <p className="text-gray-400 text-sm mb-4">Manage security settings and access</p>
                <button
                  onClick={() => setActiveTab('security')}
                  className="text-purple-400 hover:text-purple-300 text-sm font-medium"
                >
                  Security Settings →
                </button>
              </div>
            </div>
          </div>
        )}

        {(activeTab === 'users' || activeTab === 'settings' || activeTab === 'security' || activeTab === 'billing' || activeTab === 'data') && (
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-12">
            <div className="text-center max-w-2xl mx-auto">
              <Shield className="h-20 w-20 text-purple-400 mx-auto mb-4 opacity-50" />
              <h2 className="text-2xl font-bold text-gray-100 mb-3">
                {activeTab === 'users' && 'User Management'}
                {activeTab === 'settings' && 'Organization Settings'}
                {activeTab === 'security' && 'Security Settings'}
                {activeTab === 'billing' && 'Billing & Subscription'}
                {activeTab === 'data' && 'Data Management'}
              </h2>
              <p className="text-gray-400 mb-6">
                This feature is being enhanced with full functionality. Basic management is available through individual project settings.
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

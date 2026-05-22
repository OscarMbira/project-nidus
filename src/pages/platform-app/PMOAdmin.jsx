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

const cardClass =
  'rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm';

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
      <div className="min-h-[40vh] flex items-center justify-center text-gray-600 dark:text-gray-400">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 dark:border-emerald-400 mx-auto mb-4" />
          <p>Loading PMO admin...</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Building2 },
    { id: 'users', label: 'Users & Roles', icon: Users },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'security', label: 'Security', icon: Key },
    { id: 'billing', label: 'Billing', icon: FileText },
    { id: 'data', label: 'Data Management', icon: Database },
  ];

  return (
    <div className="min-h-full bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="h-8 w-8 text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">PMO Admin</h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Organization-wide administration and configuration
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
          <nav className="flex flex-wrap gap-x-6 gap-y-1 -mb-px" aria-label="PMO Admin sections">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    isActive
                      ? 'border-emerald-600 text-emerald-700 dark:border-emerald-400 dark:text-emerald-400'
                      : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:border-gray-600'
                  }`}
                >
                  <Icon className={`h-5 w-5 ${isActive ? 'text-emerald-600 dark:text-emerald-400' : ''}`} />
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
              <div className={`${cardClass} p-6 mb-6`}>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  Account Information
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Account Name</p>
                    <p className="text-gray-900 dark:text-gray-100">{account.account_name || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Account Code</p>
                    <p className="text-gray-900 dark:text-gray-100">{account.account_code || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Account Type</p>
                    <p className="text-gray-900 dark:text-gray-100">{account.account_type || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Status</p>
                    <span
                      className={`inline-block px-2 py-1 text-xs font-medium rounded ${
                        account.is_active
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                          : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {account.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  icon: UserCheck,
                  title: 'Manager assignments',
                  description: 'Assign portfolio, programme, and project managers',
                  action: 'Open assignments →',
                  onClick: () => navigate('/platform/pmo-admin/manager-assignments'),
                },
                {
                  icon: Users,
                  title: 'User Management',
                  description: 'Manage users, roles, and permissions',
                  action: 'Manage Users →',
                  onClick: () => setActiveTab('users'),
                },
                {
                  icon: Settings,
                  title: 'Organization Settings',
                  description: 'Configure organization preferences',
                  action: 'Configure →',
                  onClick: () => setActiveTab('settings'),
                },
                {
                  icon: Key,
                  title: 'Security',
                  description: 'Manage security settings and access',
                  action: 'Security Settings →',
                  onClick: () => setActiveTab('security'),
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.title} className={`${cardClass} p-6 flex flex-col`}>
                    <Icon className="h-8 w-8 text-emerald-600 dark:text-emerald-400 mb-3" aria-hidden />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{item.title}</h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 flex-1">{item.description}</p>
                    <button
                      type="button"
                      onClick={item.onClick}
                      className="text-left text-sm font-medium text-emerald-700 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300 transition-colors"
                    >
                      {item.action}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {(activeTab === 'users' ||
          activeTab === 'settings' ||
          activeTab === 'security' ||
          activeTab === 'billing' ||
          activeTab === 'data') && (
          <div className={`${cardClass} p-12`}>
            <div className="text-center max-w-2xl mx-auto">
              <Shield
                className="h-20 w-20 text-emerald-600 dark:text-emerald-400 mx-auto mb-4 opacity-50"
                aria-hidden
              />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                {activeTab === 'users' && 'User Management'}
                {activeTab === 'settings' && 'Organization Settings'}
                {activeTab === 'security' && 'Security Settings'}
                {activeTab === 'billing' && 'Billing & Subscription'}
                {activeTab === 'data' && 'Data Management'}
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                This feature is being enhanced with full functionality. Basic management is available
                through individual project settings.
              </p>
              <button
                type="button"
                onClick={() => navigate('/platform/dashboard')}
                className="px-6 py-3 rounded-lg font-medium bg-gray-200 text-gray-900 hover:bg-gray-300 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600 transition-colors"
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

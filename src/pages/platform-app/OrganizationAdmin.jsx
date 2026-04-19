/**
 * Organization Admin Module
 * Organization-wide administration and settings
 * Route: /platform/organization-admin
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Settings, Users, Database, Building2, Key, Bell, FileText, Bot } from 'lucide-react';
import { platformDb } from '../../services/supabase/supabaseClient';
import { getAccountById } from '../../services/accountService';
import { getSettings, updateSettings } from '../../services/aiSettingsService';
import AIPrivacyModal from '../../components/ai/AIPrivacyModal';

export default function OrganizationAdmin() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [organizationId, setOrganizationId] = useState(null);
  const [account, setAccount] = useState(null);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'users', 'settings', 'security', 'billing', 'data'
  const [aiSettings, setAiSettings] = useState(null);
  const [aiMode, setAiMode] = useState('template');
  const [aiPrivacyAccepted, setAiPrivacyAccepted] = useState(false);
  const [aiSaving, setAiSaving] = useState(false);
  const [aiSaveSuccess, setAiSaveSuccess] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [pendingAiMode, setPendingAiMode] = useState(null);
  const [insightsEnabled, setInsightsEnabled] = useState(true);
  const [insightsMode, setInsightsMode] = useState('template');

  useEffect(() => {
    loadOrganization();
  }, []);

  useEffect(() => {
    if (organizationId) {
      loadAccount();
    }
  }, [organizationId]);

  useEffect(() => {
    if (organizationId && activeTab === 'settings') {
      getSettings(organizationId).then((s) => {
        if (s) {
          setAiSettings(s);
          setAiMode(s.data_answer_mode || 'template');
          setAiPrivacyAccepted(!!s.data_privacy_accepted_at);
          setInsightsEnabled(s.insights_enabled !== false);
          setInsightsMode(s.insights_mode || 'template');
        }
      });
    }
  }, [organizationId, activeTab]);

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

  const handleSaveAiSettings = async (withPrivacyAccept = false) => {
    if (!organizationId || aiSaving) return;
    const mode = pendingAiMode ?? aiMode;
    const needsAccept = (mode === 'claude' || mode === 'gemini') && !aiSettings?.data_privacy_accepted_at && !withPrivacyAccept;
    if (needsAccept) {
      setPendingAiMode(mode);
      setShowPrivacyModal(true);
      return;
    }
    setAiSaving(true);
    setAiSaveSuccess(false);
    try {
      await updateSettings(organizationId, {
        data_answer_mode: mode,
        ...(withPrivacyAccept && { set_privacy_accepted: true }),
        insights_enabled: insightsEnabled,
        insights_mode: insightsMode,
      });
      setAiMode(mode);
      setPendingAiMode(null);
      setShowPrivacyModal(false);
      setAiPrivacyAccepted(true);
      const updated = await getSettings(organizationId);
      setAiSettings(updated);
      setAiSaveSuccess(true);
      setTimeout(() => setAiSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save AI settings:', err);
    } finally {
      setAiSaving(false);
    }
  };

  const handlePrivacyModalConfirm = () => {
    handleSaveAiSettings(true);
  };

  if (loading && !organizationId) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading organization admin...</p>
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
            <h1 className="text-3xl font-bold text-gray-100">Organization Admin</h1>
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

        {activeTab === 'settings' && (
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-8">
            <h2 className="text-xl font-bold text-gray-100 mb-6">Organization Settings</h2>

            {/* AI Data Answer Mode (Phase 4.1) */}
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-3">
                <Bot className="h-5 w-5 text-purple-400" />
                <h3 className="text-lg font-semibold text-gray-100">AI Data Answer Mode</h3>
              </div>
              <p className="text-sm text-gray-400 mb-4">
                Choose how the AI Assistant summarizes your project data when you ask questions. This applies to both the Quick Ask widget and the AI Workspace.
              </p>
              <div className="space-y-4">
                <label className="flex items-start gap-3 p-4 rounded-lg border border-gray-600 hover:border-gray-500 cursor-pointer">
                  <input
                    type="radio"
                    name="aiMode"
                    checked={aiMode === 'template'}
                    onChange={() => setAiMode('template')}
                    className="mt-1 text-purple-500"
                  />
                  <div>
                    <span className="font-medium text-gray-200">Template only (private)</span>
                    <p className="text-sm text-gray-400 mt-0.5">No data is sent externally. You get a short count-based summary only. Maximum privacy.</p>
                  </div>
                </label>
                <label className="flex items-start gap-3 p-4 rounded-lg border border-gray-600 hover:border-gray-500 cursor-pointer">
                  <input
                    type="radio"
                    name="aiMode"
                    checked={aiMode === 'claude'}
                    onChange={() => setAiMode('claude')}
                    className="mt-1 text-purple-500"
                  />
                  <div>
                    <span className="font-medium text-gray-200">Claude Haiku (recommended)</span>
                    <p className="text-sm text-gray-400 mt-0.5">A data snippet is sent to Anthropic to generate a richer prose summary. One-time privacy acceptance required.</p>
                  </div>
                </label>
                <label className="flex items-start gap-3 p-4 rounded-lg border border-gray-600 hover:border-gray-500 cursor-pointer">
                  <input
                    type="radio"
                    name="aiMode"
                    checked={aiMode === 'gemini'}
                    onChange={() => setAiMode('gemini')}
                    className="mt-1 text-purple-500"
                  />
                  <div>
                    <span className="font-medium text-gray-200">Gemini Flash (free tier)</span>
                    <p className="text-sm text-gray-400 mt-0.5">A data snippet is sent to Google to generate a short summary. One-time privacy acceptance required.</p>
                  </div>
                </label>
              </div>
              {(aiMode === 'claude' || aiMode === 'gemini') && aiSettings?.data_privacy_accepted_at && (
                <p className="text-xs text-gray-500 mt-2">Privacy acceptance recorded. You can change mode or revoke by switching to Template only.</p>
              )}
              <div className="mt-4 flex items-center gap-3">
                <button
                  onClick={() => handleSaveAiSettings(false)}
                  disabled={aiSaving}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium"
                >
                  {aiSaving ? 'Saving…' : 'Save'}
                </button>
                {aiSaveSuccess && <span className="text-sm text-green-400">Saved.</span>}
              </div>
            </div>

            {/* Phase 6.5: Proactive dashboard insights toggle + insights_mode */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-100 mb-3">Proactive Dashboard Insights</h3>
              <p className="text-sm text-gray-400 mb-4">
                Show &quot;Today&apos;s Insights&quot; on the Platform Dashboard. Insights are rule-based from your data (risks, issues, mandates). Optional Gemini narrative sends aggregated summary to Google.
              </p>
              <label className="flex items-center gap-3 p-4 rounded-lg border border-gray-600 hover:border-gray-500 cursor-pointer mb-4">
                <input
                  type="checkbox"
                  checked={insightsEnabled}
                  onChange={(e) => setInsightsEnabled(e.target.checked)}
                  className="rounded text-purple-500"
                />
                <span className="text-gray-200">Enable proactive dashboard insights</span>
              </label>
              <div className="space-y-2 mb-4">
                <p className="text-sm text-gray-400">Insights narrative</p>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="insightsMode" checked={insightsMode === 'template'} onChange={() => setInsightsMode('template')} className="text-purple-500" />
                  <span className="text-gray-200">Rule-based only (no data sent externally)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="insightsMode" checked={insightsMode === 'gemini'} onChange={() => setInsightsMode('gemini')} className="text-purple-500" />
                  <span className="text-gray-200">Gemini (aggregated summary sent to Google)</span>
                </label>
              </div>
              <button
                onClick={() => handleSaveAiSettings(false)}
                disabled={aiSaving}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium"
              >
                {aiSaving ? 'Saving…' : 'Save'}
              </button>
            </div>

            <button
              onClick={() => navigate('/platform/dashboard')}
              className="text-gray-400 hover:text-gray-300 text-sm"
            >
              ← Back to Dashboard
            </button>
          </div>
        )}

        {(activeTab === 'users' || activeTab === 'security' || activeTab === 'billing' || activeTab === 'data') && (
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-12">
            <div className="text-center max-w-2xl mx-auto">
              <Shield className="h-20 w-20 text-purple-400 mx-auto mb-4 opacity-50" />
              <h2 className="text-2xl font-bold text-gray-100 mb-3">
                {activeTab === 'users' && 'User Management'}
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

        <AIPrivacyModal
          open={showPrivacyModal}
          mode={pendingAiMode ?? aiMode}
          onConfirm={handlePrivacyModalConfirm}
          onCancel={() => { setShowPrivacyModal(false); setPendingAiMode(null); }}
        />
      </div>
    </div>
  );
}

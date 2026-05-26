import React, { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { Settings, Palette, Link2, Key, Shield, Download, CheckCircle } from 'lucide-react';
import {
  getWhiteLabelConfig,
  updateWhiteLabelConfig,
  getLMSIntegrations,
  createLMSIntegration,
  getAPIKeys,
  createAPIKey,
  getSSOConfigurations,
  createSSOConfiguration,
} from '../../services/enterpriseService';
import { simDb } from '../../services/supabase/supabaseClient';

const EnterpriseSettings = () => {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState('white-label');
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const [organizationId, setOrganizationId] = useState(null);
  const [whiteLabelConfig, setWhiteLabelConfig] = useState(null);
  const [lmsIntegrations, setLmsIntegrations] = useState([]);
  const [apiKeys, setApiKeys] = useState([]);
  const [ssoConfigs, setSsoConfigs] = useState([]);

  useEffect(() => {
    getCurrentUser();
  }, []);

  useEffect(() => {
    if (userId && organizationId) {
      loadData();
    }
  }, [userId, organizationId]);

  const getCurrentUser = async () => {
    try {
      const { data: { user } } = await simDb.auth.getUser();
      setUserId(user?.id);
      
      // Get user's organization
      const { data: corporateUser } = await simDb
        .from('corporate_users')
        .select('license_id')
        .eq('user_id', user?.id)
        .eq('status', 'active')
        .single();

      if (corporateUser) {
        setOrganizationId(corporateUser.license_id);
      }
    } catch (error) {
      console.error('Error getting user:', error);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      
      if (organizationId) {
        const [config, lms, keys, sso] = await Promise.all([
          getWhiteLabelConfig(organizationId).catch(() => null),
          getLMSIntegrations(organizationId).catch(() => []),
          getAPIKeys(organizationId).catch(() => []),
          getSSOConfigurations(organizationId).catch(() => []),
        ]);

        setWhiteLabelConfig(config);
        setLmsIntegrations(lms);
        setApiKeys(keys);
        setSsoConfigs(sso);
      }
    } catch (error) {
      console.error('Error loading enterprise data:', error);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'white-label', name: 'White-Label', icon: Palette },
    { id: 'lms', name: 'LMS Integration', icon: Link2 },
    { id: 'api', name: 'API Keys', icon: Key },
    { id: 'sso', name: 'SSO', icon: Shield },
    { id: 'analytics', name: 'Analytics', icon: Download },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!organizationId) {
    return (
      <div className={`rounded-xl p-12 text-center ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
        <Settings className="w-16 h-16 mx-auto mb-4 text-gray-400" />
        <h3 className="text-lg font-medium mb-2">Enterprise Features Unavailable</h3>
        <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
          Enterprise features are only available for corporate license holders
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className={`rounded-xl p-6 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow`}>
        <h1 className="text-2xl font-bold mb-2">Enterprise Settings</h1>
        <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
          Configure white-label, LMS integration, API access, SSO, and analytics exports
        </p>
      </div>

      {/* Tabs */}
      <div className={`rounded-xl p-1 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow`}>
        <div className="flex space-x-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2 ${
                  activeTab === tab.id
                    ? 'bg-blue-500 text-white'
                    : theme === 'dark'
                    ? 'text-gray-300 hover:bg-gray-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{tab.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className={`rounded-xl p-6 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow`}>
        {activeTab === 'white-label' && (
          <WhiteLabelTab config={whiteLabelConfig} organizationId={organizationId} onUpdate={loadData} />
        )}
        {activeTab === 'lms' && (
          <LMSTab integrations={lmsIntegrations} organizationId={organizationId} onUpdate={loadData} />
        )}
        {activeTab === 'api' && (
          <APITab keys={apiKeys} organizationId={organizationId} userId={userId} onUpdate={loadData} />
        )}
        {activeTab === 'sso' && (
          <SSOTab configs={ssoConfigs} organizationId={organizationId} onUpdate={loadData} />
        )}
        {activeTab === 'analytics' && (
          <AnalyticsTab organizationId={organizationId} userId={userId} />
        )}
      </div>
    </div>
  );
};

// White-Label Tab Component
const WhiteLabelTab = ({ config, organizationId, onUpdate }) => {
  const { theme } = useTheme();
  const [formData, setFormData] = useState({
    organization_name: '',
    logo_url: '',
    primary_color: '#3B82F6',
    secondary_color: '#8B5CF6',
    custom_domain: '',
    email_from_name: '',
    support_email: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (config) {
      setFormData({
        organization_name: config.organization_name || '',
        logo_url: config.logo_url || '',
        primary_color: config.primary_color || '#3B82F6',
        secondary_color: config.secondary_color || '#8B5CF6',
        custom_domain: config.custom_domain || '',
        email_from_name: config.email_from_name || '',
        support_email: config.support_email || '',
      });
    }
  }, [config]);

  const handleSave = async () => {
    try {
      setSaving(true);
      await updateWhiteLabelConfig(organizationId, formData);
      await onUpdate();
      alert('White-label configuration saved successfully!');
    } catch (error) {
      console.error('Error saving white-label config:', error);
      alert('Error saving configuration: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">White-Label Configuration</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block mb-2 font-medium">Organization Name</label>
          <input
            type="text"
            value={formData.organization_name}
            onChange={(e) => setFormData({ ...formData, organization_name: e.target.value })}
            className={`w-full px-4 py-2 rounded-lg border ${
              theme === 'dark' ? 'bg-gray-700 border-gray-600 text-gray-200' : 'bg-white border-gray-300'
            }`}
          />
        </div>

        <div>
          <label className="block mb-2 font-medium">Logo URL</label>
          <input
            type="url"
            value={formData.logo_url}
            onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
            className={`w-full px-4 py-2 rounded-lg border ${
              theme === 'dark' ? 'bg-gray-700 border-gray-600 text-gray-200' : 'bg-white border-gray-300'
            }`}
          />
        </div>

        <div>
          <label className="block mb-2 font-medium">Primary Color</label>
          <input
            type="color"
            value={formData.primary_color}
            onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
            className="w-full h-10 rounded-lg"
          />
        </div>

        <div>
          <label className="block mb-2 font-medium">Secondary Color</label>
          <input
            type="color"
            value={formData.secondary_color}
            onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
            className="w-full h-10 rounded-lg"
          />
        </div>

        <div>
          <label className="block mb-2 font-medium">Custom Domain</label>
          <input
            type="text"
            value={formData.custom_domain}
            onChange={(e) => setFormData({ ...formData, custom_domain: e.target.value })}
            placeholder="app.yourcompany.com"
            className={`w-full px-4 py-2 rounded-lg border ${
              theme === 'dark' ? 'bg-gray-700 border-gray-600 text-gray-200' : 'bg-white border-gray-300'
            }`}
          />
        </div>

        <div>
          <label className="block mb-2 font-medium">Support Email</label>
          <input
            type="email"
            value={formData.support_email}
            onChange={(e) => setFormData({ ...formData, support_email: e.target.value })}
            className={`w-full px-4 py-2 rounded-lg border ${
              theme === 'dark' ? 'bg-gray-700 border-gray-600 text-gray-200' : 'bg-white border-gray-300'
            }`}
          />
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
      >
        {saving ? 'Saving...' : 'Save Configuration'}
      </button>
    </div>
  );
};

// LMS Tab Component
const LMSTab = ({ integrations, organizationId, onUpdate }) => {
  const { theme } = useTheme();
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    lms_type: 'scorm',
    lms_name: '',
    scorm_version: '1.2',
  });
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    try {
      setSaving(true);
      await createLMSIntegration(organizationId, formData);
      await onUpdate();
      setShowAddModal(false);
      setFormData({ lms_type: 'scorm', lms_name: '', scorm_version: '1.2' });
      alert('LMS integration created successfully!');
    } catch (error) {
      console.error('Error creating LMS integration:', error);
      alert('Error creating integration: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">LMS Integrations</h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          Add Integration
        </button>
      </div>

      {integrations.length === 0 ? (
        <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
          No LMS integrations configured. Add one to get started.
        </p>
      ) : (
        <div className="space-y-4">
          {integrations.map((integration, index) => (
            <div
              key={integration.id}
              className={`p-4 rounded-lg border ${
                theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">{integration.lms_name || integration.lms_type}</h3>
                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    Type: {integration.lms_type} {integration.scorm_version ? `(${integration.scorm_version})` : ''}
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs ${
                    integration.is_active
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                  }`}
                >
                  {integration.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`rounded-xl p-6 max-w-md w-full mx-4 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
            <h3 className="text-lg font-bold mb-4">Add LMS Integration</h3>
            <div className="space-y-4">
              <div>
                <label className="block mb-2 font-medium">LMS Type</label>
                <select
                  value={formData.lms_type}
                  onChange={(e) => setFormData({ ...formData, lms_type: e.target.value })}
                  className={`w-full px-4 py-2 rounded-lg border ${
                    theme === 'dark' ? 'bg-gray-700 border-gray-600 text-gray-200' : 'bg-white border-gray-300'
                  }`}
                >
                  <option value="scorm">SCORM</option>
                  <option value="xapi">xAPI (Tin Can)</option>
                  <option value="lti">LTI</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
              <div>
                <label className="block mb-2 font-medium">LMS Name</label>
                <input
                  type="text"
                  value={formData.lms_name}
                  onChange={(e) => setFormData({ ...formData, lms_name: e.target.value })}
                  className={`w-full px-4 py-2 rounded-lg border ${
                    theme === 'dark' ? 'bg-gray-700 border-gray-600 text-gray-200' : 'bg-white border-gray-300'
                  }`}
                />
              </div>
              {formData.lms_type === 'scorm' && (
                <div>
                  <label className="block mb-2 font-medium">SCORM Version</label>
                  <select
                    value={formData.scorm_version}
                    onChange={(e) => setFormData({ ...formData, scorm_version: e.target.value })}
                    className={`w-full px-4 py-2 rounded-lg border ${
                      theme === 'dark' ? 'bg-gray-700 border-gray-600 text-gray-200' : 'bg-white border-gray-300'
                    }`}
                  >
                    <option value="1.2">SCORM 1.2</option>
                    <option value="2004">SCORM 2004</option>
                  </select>
                </div>
              )}
              <div className="flex space-x-2">
                <button
                  onClick={handleAdd}
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                >
                  {saving ? 'Creating...' : 'Create'}
                </button>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// API Tab Component
const APITab = ({ keys, organizationId, userId, onUpdate }) => {
  const { theme } = useTheme();
  const [showAddModal, setShowAddModal] = useState(false);
  const [newKey, setNewKey] = useState(null);
  const [formData, setFormData] = useState({
    key_name: '',
    scopes: [],
    rate_limit_per_minute: 60,
    rate_limit_per_hour: 1000,
  });

  const handleCreate = async () => {
    try {
      const result = await createAPIKey(organizationId, userId, formData);
      setNewKey(result);
      await onUpdate();
      alert('API key created! Make sure to copy it now - you won\'t be able to see it again.');
    } catch (error) {
      console.error('Error creating API key:', error);
      alert('Error creating API key: ' + error.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">API Keys</h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          Create API Key
        </button>
      </div>

      {newKey && (
        <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-green-900' : 'bg-green-50'} border border-green-500`}>
          <p className="font-semibold mb-2">API Key Created!</p>
          <p className="text-sm mb-2">Copy this key now - you won't be able to see it again:</p>
          <code className="block p-2 bg-black text-green-400 rounded break-all">{newKey.api_key}</code>
        </div>
      )}

      {keys.length === 0 ? (
        <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
          No API keys created yet.
        </p>
      ) : (
        <div className="space-y-4">
          {keys.map((key, index) => (
            <div
              key={key.id}
              className={`p-4 rounded-lg border ${
                theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">{key.key_name}</h3>
                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    Created: {new Date(key.created_at).toLocaleDateString()}
                    {key.last_used_at && ` • Last used: ${new Date(key.last_used_at).toLocaleDateString()}`}
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs ${
                    key.is_active
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                  }`}
                >
                  {key.is_active ? 'Active' : 'Revoked'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`rounded-xl p-6 max-w-md w-full mx-4 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
            <h3 className="text-lg font-bold mb-4">Create API Key</h3>
            <div className="space-y-4">
              <div>
                <label className="block mb-2 font-medium">Key Name</label>
                <input
                  type="text"
                  value={formData.key_name}
                  onChange={(e) => setFormData({ ...formData, key_name: e.target.value })}
                  className={`w-full px-4 py-2 rounded-lg border ${
                    theme === 'dark' ? 'bg-gray-700 border-gray-600 text-gray-200' : 'bg-white border-gray-300'
                  }`}
                />
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={handleCreate}
                  disabled={!formData.key_name}
                  className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                >
                  Create
                </button>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// SSO Tab Component
const SSOTab = ({ configs, organizationId, onUpdate }) => {
  const { theme } = useTheme();
  const [showAddModal, setShowAddModal] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">SSO Configurations</h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          Add SSO Provider
        </button>
      </div>

      {configs.length === 0 ? (
        <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
          No SSO configurations. Add one to enable single sign-on.
        </p>
      ) : (
        <div className="space-y-4">
          {configs.map((config, index) => (
            <div
              key={config.id}
              className={`p-4 rounded-lg border ${
                theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">{config.provider_name}</h3>
                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    Type: {config.sso_type.toUpperCase()}
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs ${
                    config.is_active
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                  }`}
                >
                  {config.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Analytics Tab Component
const AnalyticsTab = ({ organizationId, userId }) => {
  const { theme } = useTheme();
  const [exportType, setExportType] = useState('csv');

  const handleExport = async () => {
    try {
      const { createAnalyticsExport } = await import('../../services/enterpriseService');
      await createAnalyticsExport(organizationId, userId, {
        type: exportType,
        format: {},
        filters: {},
      });
      alert('Export job created! You will be notified when it\'s ready.');
    } catch (error) {
      console.error('Error creating export:', error);
      alert('Error creating export: ' + error.message);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Analytics Exports</h2>
      
      <div>
        <label className="block mb-2 font-medium">Export Format</label>
        <select
          value={exportType}
          onChange={(e) => setExportType(e.target.value)}
          className={`w-full px-4 py-2 rounded-lg border ${
            theme === 'dark' ? 'bg-gray-700 border-gray-600 text-gray-200' : 'bg-white border-gray-300'
          }`}
        >
          <option value="csv">CSV</option>
          <option value="excel">Excel</option>
          <option value="json">JSON</option>
          <option value="pdf">PDF</option>
        </select>
      </div>

      <button
        onClick={handleExport}
        className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
      >
        Create Export
      </button>
    </div>
  );
};

export default EnterpriseSettings;


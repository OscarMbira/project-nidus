/**
 * Governance Module
 * Governance and compliance management
 * Route: /platform/governance
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, FileText, CheckCircle2, ClipboardList, Search, Filter, FileCheck, AlertTriangle } from 'lucide-react';
import { platformDb } from '../../services/supabase/supabaseClient';
import { getFramework, getPolicies, getComplianceStatus, getDecisions, getAuditLog } from '../../services/governanceService';

export default function Governance() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [organizationId, setOrganizationId] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard', 'framework', 'policies', 'compliance', 'decisions', 'audit'
  const [auditLogs, setAuditLogs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadOrganization();
  }, []);

  useEffect(() => {
    if (organizationId && activeTab === 'audit') {
      loadAuditLog();
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
        // Get account
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

  const loadAuditLog = async () => {
    if (!organizationId) return;

    try {
      setLoading(true);
      const result = await getAuditLog({ search: searchTerm });
      if (result.success) {
        setAuditLogs(result.data || []);
      }
    } catch (error) {
      console.error('Error loading audit log:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !organizationId) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading governance...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <ShieldCheck className="h-8 w-8 text-purple-400" />
            <h1 className="text-3xl font-bold text-gray-100">Governance</h1>
          </div>
          <p className="text-gray-400">
            Project governance, compliance tracking, and decision management
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-700">
          <nav className="flex space-x-8">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: ShieldCheck },
              { id: 'framework', label: 'Framework', icon: FileText },
              { id: 'policies', label: 'Policies', icon: FileCheck },
              { id: 'compliance', label: 'Compliance', icon: CheckCircle2 },
              { id: 'decisions', label: 'Decision Log', icon: ClipboardList },
              { id: 'audit', label: 'Audit Trail', icon: AlertTriangle }
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
        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
              <FileText className="h-8 w-8 text-purple-400 mb-3" />
              <h3 className="text-lg font-semibold text-gray-100 mb-2">Governance Framework</h3>
              <p className="text-gray-400 text-sm mb-4">
                Define and manage your governance model
              </p>
              <button
                onClick={() => setActiveTab('framework')}
                className="text-purple-400 hover:text-purple-300 text-sm font-medium"
              >
                Configure →
              </button>
            </div>

            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
              <FileCheck className="h-8 w-8 text-purple-400 mb-3" />
              <h3 className="text-lg font-semibold text-gray-100 mb-2">Policies</h3>
              <p className="text-gray-400 text-sm mb-4">
                Manage organizational policies and standards
              </p>
              <button
                onClick={() => setActiveTab('policies')}
                className="text-purple-400 hover:text-purple-300 text-sm font-medium"
              >
                View Policies →
              </button>
            </div>

            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
              <CheckCircle2 className="h-8 w-8 text-purple-400 mb-3" />
              <h3 className="text-lg font-semibold text-gray-100 mb-2">Compliance</h3>
              <p className="text-gray-400 text-sm mb-4">
                Track compliance with requirements
              </p>
              <button
                onClick={() => setActiveTab('compliance')}
                className="text-purple-400 hover:text-purple-300 text-sm font-medium"
              >
                View Status →
              </button>
            </div>
          </div>
        )}

        {activeTab === 'audit' && (
          <div>
            {/* Search */}
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search audit log..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            {/* Audit Log Table */}
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400 mx-auto mb-4"></div>
                <p className="text-gray-400">Loading audit log...</p>
              </div>
            ) : auditLogs.length === 0 ? (
              <div className="bg-gray-800 rounded-lg border border-gray-700 p-12 text-center">
                <AlertTriangle className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-300 mb-2">No Audit Log Entries</h3>
                <p className="text-gray-500">
                  Audit log entries will appear here as system activity occurs.
                </p>
              </div>
            ) : (
              <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-700/50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Date/Time</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">User</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Action</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Entity</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {auditLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-gray-700/30">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                            {new Date(log.created_at).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                            {log.user_name || 'System'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 py-1 text-xs bg-purple-900/30 text-purple-300 rounded">
                              {log.action_type || 'Unknown'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                            {log.entity_type || '-'}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-400">
                            {log.description || log.action_description || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {(activeTab === 'framework' || activeTab === 'policies' || activeTab === 'compliance' || activeTab === 'decisions') && (
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-12">
            <div className="text-center max-w-2xl mx-auto">
              <ShieldCheck className="h-20 w-20 text-purple-400 mx-auto mb-4 opacity-50" />
              <h2 className="text-2xl font-bold text-gray-100 mb-3">
                {activeTab === 'framework' && 'Governance Framework'}
                {activeTab === 'policies' && 'Policy Management'}
                {activeTab === 'compliance' && 'Compliance Tracking'}
                {activeTab === 'decisions' && 'Decision Log'}
              </h2>
              <p className="text-gray-400 mb-6">
                This feature is coming soon. We're working on implementing comprehensive governance functionality.
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

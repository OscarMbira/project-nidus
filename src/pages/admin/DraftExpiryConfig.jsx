/**
 * DraftExpiryConfig Page
 *
 * PMO Admin page for configuring draft expiration settings.
 * Allows setting default expiry per entity type and project type.
 *
 * @version v201
 * @created 2026-01-31
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  RefreshCw,
  Clock,
  AlertTriangle,
  Plus,
  Trash2,
  Settings,
  Folder,
  FileText,
  AlertCircle,
  CheckSquare
} from 'lucide-react';
import { supabase } from '../../services/supabaseClient';
import { getExpiryConfigs, updateExpiryConfig } from '../../services/draftQueueService';
import { getEntityLabel, ENTITY_CATEGORIES } from '../../config/draftQueueConfig';

export function DraftExpiryConfig() {
  const [configs, setConfigs] = useState([]);
  const [projectTypes, setProjectTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Form state for new config
  const [newConfig, setNewConfig] = useState({
    entity_type: '',
    project_type_id: '',
    expiry_days: 14,
    warning_days: 3
  });

  // Load configurations
  const loadConfigs = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [configsData, projectTypesRes] = await Promise.all([
        getExpiryConfigs(),
        supabase.from('project_types').select('id, type_name').eq('is_active', true)
      ]);

      setConfigs(configsData);
      setProjectTypes(projectTypesRes.data || []);
    } catch (err) {
      console.error('Error loading configs:', err);
      setError('Failed to load configuration');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfigs();
  }, [loadConfigs]);

  // Handle update
  const handleUpdate = async (configId, field, value) => {
    setSaving(prev => ({ ...prev, [configId]: true }));
    setError(null);
    setSuccess(null);

    try {
      await updateExpiryConfig(configId, { [field]: value });
      setConfigs(prev =>
        prev.map(c => (c.id === configId ? { ...c, [field]: value } : c))
      );
      setSuccess('Configuration updated');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error updating config:', err);
      setError('Failed to update configuration');
    } finally {
      setSaving(prev => ({ ...prev, [configId]: false }));
    }
  };

  // Handle create new config
  const handleCreate = async () => {
    if (!newConfig.entity_type && !newConfig.project_type_id) {
      setError('Please select an entity type or project type');
      return;
    }

    setSaving(prev => ({ ...prev, new: true }));
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error: insertError } = await supabase
        .from('draft_expiry_config')
        .insert({
          entity_type: newConfig.entity_type || null,
          project_type_id: newConfig.project_type_id || null,
          expiry_days: newConfig.expiry_days,
          warning_days: newConfig.warning_days,
          priority: newConfig.project_type_id ? 2 : (newConfig.entity_type ? 1 : 0),
          created_by: user?.id
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setConfigs(prev => [...prev, data]);
      setNewConfig({
        entity_type: '',
        project_type_id: '',
        expiry_days: 14,
        warning_days: 3
      });
      setSuccess('Configuration added');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error creating config:', err);
      setError('Failed to create configuration');
    } finally {
      setSaving(prev => ({ ...prev, new: false }));
    }
  };

  // Handle delete
  const handleDelete = async (configId) => {
    if (!window.confirm('Delete this configuration?')) return;

    setSaving(prev => ({ ...prev, [configId]: true }));

    try {
      const { error: deleteError } = await supabase
        .from('draft_expiry_config')
        .update({ is_active: false })
        .eq('id', configId);

      if (deleteError) throw deleteError;

      setConfigs(prev => prev.filter(c => c.id !== configId));
      setSuccess('Configuration deleted');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error deleting config:', err);
      setError('Failed to delete configuration');
    } finally {
      setSaving(prev => ({ ...prev, [configId]: false }));
    }
  };

  // Get all entity types for dropdown
  const allEntityTypes = Object.values(ENTITY_CATEGORIES).flat();

  // Group configs
  const globalConfigs = configs.filter(c => !c.entity_type && !c.project_type_id);
  const entityConfigs = configs.filter(c => c.entity_type && !c.project_type_id);
  const projectTypeConfigs = configs.filter(c => c.project_type_id);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-blue-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                to="/platform/pmo-admin"
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-white">Draft Expiry Settings</h1>
                <p className="text-gray-400 mt-1">
                  Configure how long drafts remain active before expiring
                </p>
              </div>
            </div>
            <button
              onClick={loadConfigs}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span className="text-sm text-red-400">{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-green-400" />
            <span className="text-sm text-green-400">{success}</span>
          </div>
        )}

        {/* Global Default */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 mb-6">
          <div className="px-6 py-4 border-b border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Settings className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">System Default</h2>
                <p className="text-sm text-gray-400">Applies to all drafts unless overridden</p>
              </div>
            </div>
          </div>
          <div className="p-6">
            {globalConfigs.length === 0 ? (
              <p className="text-gray-400">No global default configured. Using 14 days.</p>
            ) : (
              globalConfigs.map(config => (
                <ConfigRow
                  key={config.id}
                  config={config}
                  saving={saving[config.id]}
                  onUpdate={handleUpdate}
                  onDelete={handleDelete}
                  showDelete={false}
                />
              ))
            )}
          </div>
        </div>

        {/* Entity Type Overrides */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 mb-6">
          <div className="px-6 py-4 border-b border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/20 rounded-lg">
                <FileText className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Entity Type Overrides</h2>
                <p className="text-sm text-gray-400">Different expiry per entity type</p>
              </div>
            </div>
          </div>
          <div className="p-6 space-y-3">
            {entityConfigs.length === 0 ? (
              <p className="text-gray-400 text-sm">No entity-specific overrides configured.</p>
            ) : (
              entityConfigs.map(config => (
                <ConfigRow
                  key={config.id}
                  config={config}
                  saving={saving[config.id]}
                  onUpdate={handleUpdate}
                  onDelete={handleDelete}
                  label={getEntityLabel(config.entity_type)}
                />
              ))
            )}
          </div>
        </div>

        {/* Project Type Overrides */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 mb-6">
          <div className="px-6 py-4 border-b border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <Folder className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Project Type Overrides</h2>
                <p className="text-sm text-gray-400">Different expiry per project type</p>
              </div>
            </div>
          </div>
          <div className="p-6 space-y-3">
            {projectTypeConfigs.length === 0 ? (
              <p className="text-gray-400 text-sm">No project type overrides configured.</p>
            ) : (
              projectTypeConfigs.map(config => {
                const projectType = projectTypes.find(pt => pt.id === config.project_type_id);
                return (
                  <ConfigRow
                    key={config.id}
                    config={config}
                    saving={saving[config.id]}
                    onUpdate={handleUpdate}
                    onDelete={handleDelete}
                    label={projectType?.type_name || 'Unknown Project Type'}
                  />
                );
              })
            )}
          </div>
        </div>

        {/* Add New Configuration */}
        <div className="bg-gray-800 rounded-xl border border-gray-700">
          <div className="px-6 py-4 border-b border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Plus className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Add Configuration</h2>
                <p className="text-sm text-gray-400">Create a new expiry override</p>
              </div>
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Entity Type (optional)
                </label>
                <select
                  value={newConfig.entity_type}
                  onChange={(e) => setNewConfig(prev => ({ ...prev, entity_type: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white"
                >
                  <option value="">-- Select Entity Type --</option>
                  {allEntityTypes.map(type => (
                    <option key={type} value={type}>
                      {getEntityLabel(type)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Project Type (optional)
                </label>
                <select
                  value={newConfig.project_type_id}
                  onChange={(e) => setNewConfig(prev => ({ ...prev, project_type_id: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white"
                >
                  <option value="">-- Select Project Type --</option>
                  {projectTypes.map(pt => (
                    <option key={pt.id} value={pt.id}>
                      {pt.type_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Expiry Days
                </label>
                <input
                  type="number"
                  min="1"
                  max="90"
                  value={newConfig.expiry_days}
                  onChange={(e) => setNewConfig(prev => ({ ...prev, expiry_days: parseInt(e.target.value) || 14 }))}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Warning Days (before expiry)
                </label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={newConfig.warning_days}
                  onChange={(e) => setNewConfig(prev => ({ ...prev, warning_days: parseInt(e.target.value) || 3 }))}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white"
                />
              </div>
            </div>

            <button
              onClick={handleCreate}
              disabled={saving.new}
              className="inline-flex items-center gap-2 px-4 py-2
                bg-blue-600 hover:bg-blue-700
                text-white font-medium rounded-lg
                transition-colors disabled:opacity-50"
            >
              {saving.new ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              <span>Add Configuration</span>
            </button>
          </div>
        </div>

        {/* Info Section */}
        <div className="mt-6 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
          <h3 className="text-sm font-medium text-gray-300 mb-2">Priority Order</h3>
          <ol className="text-sm text-gray-400 list-decimal list-inside space-y-1">
            <li>Entity + Project Type specific (highest priority)</li>
            <li>Entity type specific</li>
            <li>Project type default</li>
            <li>System default (14 days)</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

/**
 * ConfigRow Component
 */
function ConfigRow({ config, saving, onUpdate, onDelete, label, showDelete = true }) {
  return (
    <div className="flex items-center gap-4 p-3 bg-gray-900/50 rounded-lg">
      {label && (
        <span className="text-white font-medium min-w-[150px]">{label}</span>
      )}

      <div className="flex items-center gap-2">
        <Clock className="w-4 h-4 text-gray-400" />
        <input
          type="number"
          min="1"
          max="90"
          value={config.expiry_days}
          onChange={(e) => onUpdate(config.id, 'expiry_days', parseInt(e.target.value) || 14)}
          disabled={saving}
          className="w-16 px-2 py-1 bg-gray-800 border border-gray-600 rounded text-white text-sm text-center"
        />
        <span className="text-sm text-gray-400">days</span>
      </div>

      <div className="flex items-center gap-2">
        <AlertCircle className="w-4 h-4 text-amber-400" />
        <input
          type="number"
          min="1"
          max="30"
          value={config.warning_days}
          onChange={(e) => onUpdate(config.id, 'warning_days', parseInt(e.target.value) || 3)}
          disabled={saving}
          className="w-16 px-2 py-1 bg-gray-800 border border-gray-600 rounded text-white text-sm text-center"
        />
        <span className="text-sm text-gray-400">warning</span>
      </div>

      {saving && <RefreshCw className="w-4 h-4 text-blue-400 animate-spin" />}

      {showDelete && (
        <button
          onClick={() => onDelete(config.id)}
          disabled={saving}
          className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded transition-colors ml-auto"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

export default DraftExpiryConfig;

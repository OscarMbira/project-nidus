import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Edit2, EyeOff, Trash2, BookOpen, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getModules,
  getDocumentationGuides,
  deactivateGuide,
  deleteGuide,
  deleteDocumentationFile,
} from '../../services/documentationService';
import { platformDb } from '@nidus/supabase';

const MODULE_DISPLAY_NAMES = {
  'general':               'General',
  'planning-hub':          'Planning Hub',
  'risk-module':           'Risk Management',
  'quality-module':        'Quality Management',
  'financial-module':      'Financial Management',
  'change-module':         'Change Management',
  'stakeholder-module':    'Stakeholder Management',
  'delays-module':         'Delays',
  'stage-gates-module':    'Stage Gates',
  'pmo-module':            'PMO',
  'portfolio-module':      'Portfolio',
  'programme-module':      'Programme',
  'benefits-module':       'Benefits',
  'issues-module':         'Issues',
  'communications-module': 'Communications',
  'reports-module':        'Reports',
  'admin-module':          'Administration',
  'sim-planning-module':   'Sim Planning',
  'sim-risk-module':       'Sim Risk',
  'sim-quality-module':    'Sim Quality',
  'sim-pmo-module':        'Sim PMO',
  'sim-scenarios-module':  'Sim Scenarios',
  'sim-leaderboard-module':'Sim Leaderboard',
  'sim-admin-module':      'Sim Administration',
};

const modName = s => MODULE_DISPLAY_NAMES[s] || s;

export default function DocumentationAdminList() {
  const navigate      = useNavigate();
  const [params, setParams] = useSearchParams();
  const system = params.get('system') || 'platform';

  const [modules, setModules]   = useState([]);
  const [guides, setGuides]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [selectedMod, setSelectedMod] = useState('');

  const [deleteTarget, setDeleteTarget] = useState(null); // guide row for confirm dialog
  const [deleting, setDeleting]         = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [mods, gs] = await Promise.all([
        getModules(system),
        getDocumentationGuides(system),
      ]);
      // Also load inactive guides for admin view
      const { data } = await platformDb
        .from('documentation_guides')
        .select('*')
        .eq('system', system)
        .order('sort_order', { ascending: true });
      setModules(mods);
      setGuides(data || gs);
    } catch (err) {
      toast.error('Failed to load guides');
    } finally {
      setLoading(false);
    }
  }, [system]);

  useEffect(() => { load(); }, [load]);

  const setSystem = (s) => {
    setParams({ system: s });
    setSelectedMod('');
  };

  const handleDeactivate = async (guide) => {
    try {
      await deactivateGuide(guide.id);
      toast.success(`"${guide.title}" deactivated`);
      load();
    } catch {
      toast.error('Failed to deactivate guide');
    }
  };

  const handleActivate = async (guide) => {
    const { error } = await platformDb
      .from('documentation_guides')
      .update({ is_active: true })
      .eq('id', guide.id);
    if (error) { toast.error('Failed to activate guide'); return; }
    toast.success(`"${guide.title}" activated`);
    load();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteDocumentationFile(deleteTarget.system, deleteTarget.module, deleteTarget.file_name);
      await deleteGuide(deleteTarget.id);
      toast.success(`"${deleteTarget.title}" deleted`);
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast.error(`Delete failed: ${err.message}`);
    } finally {
      setDeleting(false);
    }
  };

  const visibleGuides = selectedMod
    ? guides.filter(g => g.module === selectedMod)
    : guides;

  const groupedByModule = modules.reduce((acc, mod) => {
    acc[mod] = visibleGuides.filter(g => g.module === mod);
    return acc;
  }, {});
  // also bucket unrecognised modules
  const knownMods = new Set(modules);
  const unknown = visibleGuides.filter(g => !knownMods.has(g.module));

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Documentation Manager</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Manage documentation guides for Platform and Simulator systems
            </p>
          </div>
          <button
            onClick={() => navigate(`/app/admin/documentation/new?system=${system}`)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="h-4 w-4" /> New Guide
          </button>
        </div>

        {/* System toggle */}
        <div className="flex gap-2 mb-6">
          {['platform', 'simulator'].map(s => (
            <button key={s} onClick={() => setSystem(s)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
                system === s
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}>
              {s}
            </button>
          ))}
        </div>

        {/* Module filter */}
        {!loading && (
          <div className="flex flex-wrap gap-2 mb-6">
            <button onClick={() => setSelectedMod('')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                !selectedMod ? 'bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}>
              All modules
            </button>
            {modules.map(m => (
              <button key={m} onClick={() => setSelectedMod(m)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  selectedMod === m ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}>
                {modName(m)}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
          </div>
        ) : (
          <div className="space-y-6">
            {[...modules, ...(unknown.length ? ['__unknown__'] : [])].map(mod => {
              const gs = mod === '__unknown__' ? unknown : (groupedByModule[mod] || []);
              if (gs.length === 0 && selectedMod && selectedMod !== mod) return null;
              if (gs.length === 0 && !selectedMod) return null;

              return (
                <div key={mod} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                  {/* Module header */}
                  <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                    <BookOpen className="h-4 w-4 text-blue-500" />
                    <span className="font-semibold text-sm text-gray-700 dark:text-gray-200">
                      {mod === '__unknown__' ? 'Other' : modName(mod)}
                    </span>
                    <span className="ml-auto text-xs text-gray-400">{gs.length} guide{gs.length !== 1 ? 's' : ''}</span>
                  </div>

                  {/* Guide rows */}
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-gray-700">
                        <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 w-8">#</th>
                        <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 dark:text-gray-400">Title</th>
                        <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 hidden md:table-cell">Category</th>
                        <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 hidden lg:table-cell">File</th>
                        <th className="text-center px-4 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 w-16">Order</th>
                        <th className="text-center px-4 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 w-16">Active</th>
                        <th className="text-right px-4 py-2 text-xs font-medium text-gray-500 dark:text-gray-400">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {gs.map((guide, idx) => (
                        <tr key={guide.id}
                          className={`border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors ${
                            !guide.is_active ? 'opacity-50' : ''
                          }`}>
                          <td className="px-4 py-3 text-gray-400 text-xs">{idx + 1}</td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => navigate(`/app/admin/documentation/edit/${guide.id}?system=${system}`)}
                              className="font-medium text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 text-left">
                              {guide.title}
                            </button>
                            <div className="text-xs text-gray-400 mt-0.5">{guide.guide_id}</div>
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell text-gray-500 dark:text-gray-400">{guide.category}</td>
                          <td className="px-4 py-3 hidden lg:table-cell text-gray-400 text-xs font-mono">{guide.file_name}</td>
                          <td className="px-4 py-3 text-center text-gray-500 dark:text-gray-400">{guide.sort_order}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-block w-2 h-2 rounded-full ${guide.is_active ? 'bg-green-500' : 'bg-gray-300'}`} />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => navigate(`/app/admin/documentation/edit/${guide.id}?system=${system}`)}
                                title="Edit"
                                className="p-1.5 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-500 hover:text-blue-600 transition-colors">
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => guide.is_active ? handleDeactivate(guide) : handleActivate(guide)}
                                title={guide.is_active ? 'Deactivate' : 'Activate'}
                                className="p-1.5 rounded hover:bg-yellow-50 dark:hover:bg-yellow-900/20 text-gray-500 hover:text-yellow-600 transition-colors">
                                <EyeOff className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => setDeleteTarget(guide)}
                                title="Delete"
                                className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-500 hover:text-red-600 transition-colors">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })}

            {visibleGuides.length === 0 && (
              <div className="text-center py-20 text-gray-400 dark:text-gray-500">
                <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p>No guides found. Create one to get started.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Delete confirmation dialog */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-start gap-3 mb-4">
              <AlertTriangle className="h-6 w-6 text-red-500 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Delete guide permanently?</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  This will remove <strong>"{deleteTarget.title}"</strong> from the database and delete{' '}
                  <code className="text-xs bg-gray-100 dark:bg-gray-700 px-1 rounded">{deleteTarget.file_name}</code> from Storage. This cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteTarget(null)} disabled={deleting}
                className="px-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                Cancel
              </button>
              <button onClick={handleDelete} disabled={deleting}
                className="px-4 py-2 text-sm rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-50">
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

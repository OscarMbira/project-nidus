import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { X, Save, Link2, FolderKanban, Target, AlertTriangle, ArrowLeft } from 'lucide-react';
import { saveInterProjectDependency, checkCircularDependency } from '../../services/dependencyService';
import { platformDb } from '@nidus/supabase';
import { useCurrentProject } from '../../context/CurrentProjectContext';
import DetailAuditTabList from '@nidus/ui/DetailAuditTabList';
import AuditDetailsPanel from '@nidus/ui/AuditDetailsPanel';
import AuditCard from '@nidus/ui/AuditCard';
import AuditField from '@nidus/ui/AuditField';
import AuditTimestampPair from '@nidus/ui/AuditTimestampPair';
import { humanizeAuditToken, resolveAuditUserLabels } from '@nidus/shared/utils/auditDisplayUtils';
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal';
import SelectField from '../ui/SelectField';
import MultiLineListInput from '@nidus/ui/MultiLineListInput';
import {
  addExternalDependencyItem,
  listExternalDependencyItems,
  resolveExternalDependencyAccountId,
} from '../../services/externalDependencyCatalogueService';

function byLabel(rows, labelKey) {
  return [...rows].sort((a, b) =>
    String(a[labelKey] || '').localeCompare(String(b[labelKey] || ''), undefined, { sensitivity: 'base' }),
  );
}

function membershipRows(rows, nestedKey) {
  const byId = new Map();
  for (const row of rows || []) {
    const item = row[nestedKey];
    if (!item?.id || item.is_deleted) continue;
    byId.set(item.id, item);
  }
  return [...byId.values()];
}

function withCurrentProject(rows, currentProject) {
  if (!currentProject?.projectId) return rows;
  if (rows.some((row) => row.id === currentProject.projectId)) return rows;
  return [
    {
      id: currentProject.projectId,
      project_name: currentProject.projectName,
      project_code: currentProject.projectCode,
    },
    ...rows,
  ];
}

export default function DependencyForm({ dependency, onSave, onCancel, onEdit, usePageLayout = false, readOnly = false, backToList = '' }) {
  const navigate = useNavigate();
  const { currentProjectId, currentProject } = useCurrentProject();
  const { showSuccess, modal: partySavedModal } = useSuccessModal();
  const appliedHeaderProject = useRef(false);
  const [formTab, setFormTab] = useState('details');
  const [auditUserLabels, setAuditUserLabels] = useState({});
  const [formData, setFormData] = useState({
    dependency_code: '',
    dependency_name: '',
    dependency_description: '',
    portfolio_id: '',
    programme_id: '',
    source_project_id: '',
    target_project_id: '',
    dependency_type: 'finish-to-start',
    dependency_strength: 'hard',
    dependency_criticality: 'medium',
    is_critical_path: false,
    lag_days: 0,
    lead_days: 0,
    expected_impact_days: null,
    impact_description: '',
    dependency_status: 'identified',
    resolution_status: '',
    risk_level: '',
    probability_of_failure: null,
    risk_description: '',
    mitigation_plan: '',
    notes: '',
    external_dependency: '',
  });

  const [projects, setProjects] = useState([]);
  const [portfolios, setPortfolios] = useState([]);
  const [programmes, setProgrammes] = useState([]);
  const [externalItems, setExternalItems] = useState([]);
  const [externalAccountId, setExternalAccountId] = useState(null);
  const [pendingPartyKind, setPendingPartyKind] = useState('');
  const [saving, setSaving] = useState(false);
  const [loadingLookup, setLoadingLookup] = useState(true);
  const [lookupError, setLookupError] = useState(null);
  const [circularCheck, setCircularCheck] = useState(null);
  const [checkingCircular, setCheckingCircular] = useState(false);

  useEffect(() => {
    if (dependency) {
      setFormData({
        dependency_code: dependency.dependency_code || '',
        dependency_name: dependency.dependency_name || '',
        dependency_description: dependency.dependency_description || '',
        portfolio_id: dependency.portfolio_id || '',
        programme_id: dependency.programme_id || '',
        source_project_id: dependency.source_project_id || '',
        target_project_id: dependency.target_project_id || '',
        dependency_type: dependency.dependency_type || 'finish-to-start',
        dependency_strength: dependency.dependency_strength || 'hard',
        dependency_criticality: dependency.dependency_criticality || 'medium',
        is_critical_path: dependency.is_critical_path || false,
        lag_days: dependency.lag_days || 0,
        lead_days: dependency.lead_days || 0,
        expected_impact_days: dependency.expected_impact_days || null,
        impact_description: dependency.impact_description || '',
        dependency_status: dependency.dependency_status || 'identified',
        resolution_status: dependency.resolution_status || '',
        risk_level: dependency.risk_level || '',
        probability_of_failure: dependency.probability_of_failure || null,
        risk_description: dependency.risk_description || '',
        mitigation_plan: dependency.mitigation_plan || '',
        notes: dependency.notes || '',
        external_dependency: dependency.external_dependency || '',
      });
    }
    fetchLookupData();
  }, [dependency]);

  useEffect(() => {
    if (dependency || appliedHeaderProject.current || !currentProjectId) return;
    appliedHeaderProject.current = true;
    setFormData((prev) => (
      prev.target_project_id ? prev : { ...prev, target_project_id: currentProjectId }
    ));
  }, [dependency, currentProjectId]);

  useEffect(() => {
    const projectId = currentProjectId || formData.target_project_id || formData.source_project_id;
    if (!projectId) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const accountId = await resolveExternalDependencyAccountId(projectId);
        const rows = await listExternalDependencyItems(accountId);
        if (cancelled) return;
        setExternalAccountId(accountId);
        setExternalItems(rows);
      } catch (err) {
        if (!cancelled) console.error('Error loading dependency parties:', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentProjectId, formData.target_project_id, formData.source_project_id]);

  useEffect(() => {
    if (formTab !== 'audit' || !dependency) return;
    (async () => {
      const labels = await resolveAuditUserLabels(platformDb, [dependency.created_by, dependency.updated_by]);
      setAuditUserLabels(labels);
    })();
  }, [formTab, dependency]);

  useEffect(() => {
    // Check for circular dependencies when source/target changes
    if (formData.source_project_id && formData.target_project_id && formData.source_project_id !== formData.target_project_id) {
      checkForCircularDependency();
    } else {
      setCircularCheck(null);
    }
  }, [formData.source_project_id, formData.target_project_id]);

  const fetchLookupData = async () => {
    setLoadingLookup(true);
    setLookupError(null);
    try {
      const { data: { user } } = await platformDb.auth.getUser();
      if (!user) throw new Error('Not signed in');
      const { data: userRow, error: userErr } = await platformDb
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .maybeSingle();
      if (userErr) throw userErr;
      if (!userRow?.id) throw new Error('Could not resolve your user record');

      const [projectsRes, portfoliosRes, programmesRes] = await Promise.all([
        platformDb
          .from('project_memberships')
          .select('project_id, projects:project_id (id, project_name, project_code, is_deleted)')
          .eq('user_id', userRow.id)
          .eq('is_active', true)
          .or('invitation_status.eq.accepted,invitation_status.is.null'),
        platformDb
          .from('portfolio_memberships')
          .select('portfolio_id, portfolios:portfolio_id (id, portfolio_name, portfolio_code, is_deleted)')
          .eq('user_id', userRow.id)
          .eq('is_active', true)
          .eq('invitation_status', 'accepted'),
        platformDb
          .from('programme_memberships')
          .select('programme_id, programmes:programme_id (id, programme_name, programme_code, is_deleted)')
          .eq('user_id', userRow.id)
          .eq('is_active', true)
          .eq('invitation_status', 'accepted'),
      ]);
      if (projectsRes.error) throw projectsRes.error;
      if (portfoliosRes.error) throw portfoliosRes.error;
      if (programmesRes.error) throw programmesRes.error;

      setProjects(byLabel(membershipRows(projectsRes.data, 'projects'), 'project_name'));
      setPortfolios(byLabel(membershipRows(portfoliosRes.data, 'portfolios'), 'portfolio_name'));
      setProgrammes(byLabel(membershipRows(programmesRes.data, 'programmes'), 'programme_name'));
    } catch (error) {
      console.error('Error fetching lookup data:', error);
      setLookupError(error?.message || 'Failed to load form data');
    } finally {
      setLoadingLookup(false);
    }
  };

  const checkForCircularDependency = async () => {
    if (!formData.source_project_id || !formData.target_project_id || formData.source_project_id === formData.target_project_id) {
      return;
    }

    try {
      setCheckingCircular(true);
      const isCircular = await checkCircularDependency(
        formData.source_project_id,
        formData.target_project_id
      );
      setCircularCheck(isCircular);
    } catch (error) {
      console.error('Error checking circular dependency:', error);
      setCircularCheck(null);
    } finally {
      setCheckingCircular(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (type === 'number' ? (value ? parseFloat(value) : (value === '' ? null : 0)) : value),
    }));
  };

  const partyRecord = (name) => externalItems.find(
    (item) => item.item_name.toLowerCase() === String(name || '').trim().toLowerCase(),
  );

  const partyIsFlagged = (name) => {
    const kind = partyRecord(name)?.party_kind;
    return kind === 'internal' || kind === 'external';
  };

  const handleExternalChange = (value) => {
    const next = String(value || '').trim();
    handleChange({ target: { name: 'external_dependency', value: next } });
    if (partyIsFlagged(next)) setPendingPartyKind('');
  };

  const addNamedParty = async (name, kind) => {
    const next = String(name || '').trim();
    if (!kind || !next || !externalAccountId || readOnly) return;
    setPendingPartyKind(kind);
    try {
      const created = await addExternalDependencyItem(externalAccountId, next, kind);
      const itemName = created?.item_name || next;
      const itemKind = created?.party_kind || kind;
      const rows = await listExternalDependencyItems(externalAccountId);
      setExternalItems(rows.some((item) => item.item_name.toLowerCase() === itemName.toLowerCase())
        ? rows
        : [...rows, { id: created?.id, item_name: itemName, party_kind: itemKind }].sort((a, b) =>
          String(a.item_name).localeCompare(String(b.item_name), undefined, { sensitivity: 'base' }),
        ));
      handleChange({ target: { name: 'external_dependency', value: itemName } });
      setPendingPartyKind('');
      showSuccess({
        recordId: itemName,
        operation: 'created',
        message: `Saved ${itemName} for this organisation. Every project in the organisation can select it.`,
      });
    } catch (err) {
      alert(err?.message || 'Could not add that dependency party');
      setPendingPartyKind('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const sourceId = formData.source_project_id || null;
      const targetId = formData.target_project_id || null;
      const externalDependency = String(formData.external_dependency || '').trim();

      if (!sourceId && !targetId) {
        alert('Select the project this dependency affects.');
        setSaving(false);
        return;
      }

      if (sourceId && targetId && sourceId === targetId) {
        alert('Source and target projects must be different');
        setSaving(false);
        return;
      }

      if (!(sourceId && targetId) && !externalDependency) {
        alert('Select the other project, or choose a dependency party.');
        setSaving(false);
        return;
      }

      if (externalDependency && !partyIsFlagged(externalDependency)) {
        alert('Choose whether this party is internal or external before saving.');
        setSaving(false);
        return;
      }

      // Validate circular dependency
      if (circularCheck) {
        alert('Cannot create dependency: This would create a circular dependency');
        setSaving(false);
        return;
      }

      const submitData = {
        ...formData,
        portfolio_id: formData.portfolio_id || null,
        programme_id: formData.programme_id || null,
        source_project_id: sourceId,
        target_project_id: targetId,
        external_dependency: externalDependency || null,
        lag_days: formData.lag_days ? parseInt(formData.lag_days) : 0,
        lead_days: formData.lead_days ? parseInt(formData.lead_days) : 0,
        expected_impact_days: formData.expected_impact_days ? parseInt(formData.expected_impact_days) : null,
        probability_of_failure: formData.probability_of_failure ? parseFloat(formData.probability_of_failure) : null,
        resolution_status: formData.resolution_status || null,
        risk_level: formData.risk_level || null,
      };

      const saved = await saveInterProjectDependency(submitData, dependency?.id);
      onSave(saved);
    } catch (error) {
      console.error('Error saving dependency:', error);
      alert('Error saving dependency: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loadingLookup) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mx-auto mb-4" />
          <p className="text-gray-400">Loading form...</p>
        </div>
      </div>
    );
  }

  if (lookupError) {
    return (
      <div className="bg-gray-800 rounded-lg border border-red-800 p-6 text-center">
        <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-3" />
        <p className="text-red-200 mb-4">{lookupError}</p>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
        >
          Back
        </button>
      </div>
    );
  }

  const selectableProjects = withCurrentProject(projects, currentProject);
  const projectOption = (project) => ({
    value: project.id,
    label: `${project.project_name}${project.project_code ? ` (${project.project_code})` : ''}`,
  });
  const partyKindLabel = (kind) => (
    kind === 'internal' ? 'Internal' : kind === 'external' ? 'External' : 'Choose a type'
  );
  const externalOptions = externalItems.map((item) => ({
    value: item.item_name,
    label: item.item_name,
    description: partyKindLabel(item.party_kind),
  }));
  if (
    formData.external_dependency
    && !externalOptions.some((option) => option.value === formData.external_dependency)
  ) {
    externalOptions.unshift({
      value: formData.external_dependency,
      label: formData.external_dependency,
      description: 'Choose a type',
    });
  }
  const pendingParty = Boolean(formData.external_dependency) && !partyIsFlagged(formData.external_dependency);
  const partyCustomActions = [
    { key: 'internal', label: (term) => `Add "${term}" as internal`, onSelect: (term) => addNamedParty(term, 'internal') },
    { key: 'external', label: (term) => `Add "${term}" as external`, onSelect: (term) => addNamedParty(term, 'external') },
  ];

  const formContent = (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 z-10">
          {(backToList || usePageLayout) && (
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="mb-3 inline-flex items-center gap-2 text-base font-semibold text-gray-900 underline decoration-2 underline-offset-4 hover:text-blue-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-white dark:decoration-gray-300 dark:hover:text-blue-200"
            >
              <ArrowLeft className="h-5 w-5" aria-hidden="true" />
              Back to Dependency Register
            </button>
          )}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link2 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {readOnly ? 'View Dependency' : dependency ? 'Edit Dependency' : 'Create Dependency'}
              </h2>
            </div>
            <button
              type="button"
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              aria-label="Close"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className="px-6 pt-4 border-b border-gray-200 dark:border-gray-700">
          <DetailAuditTabList activeTab={formTab} onChange={setFormTab} />
        </div>

        {formTab === 'audit' && !dependency && (
          <div className="p-6">
            <p className="text-sm text-gray-500 dark:text-gray-400">Audit details appear after this dependency is saved.</p>
          </div>
        )}

        {formTab === 'audit' && dependency && (
          <div className="p-6">
            <AuditDetailsPanel description="Who created or changed this dependency, and how it is classified.">
              <AuditCard title="Identity" description="How this dependency is labelled and tracked.">
                <AuditField label="Code" value={dependency.dependency_code} />
                <AuditField label="Name" value={dependency.dependency_name} />
                <AuditField label="Status" value={humanizeAuditToken(dependency.dependency_status)} />
              </AuditCard>
              <AuditCard title="Classification" description="How this dependency is structured.">
                <AuditField label="Type" value={humanizeAuditToken(dependency.dependency_type)} />
                <AuditField label="Strength" value={humanizeAuditToken(dependency.dependency_strength)} />
                <AuditField label="Criticality" value={humanizeAuditToken(dependency.dependency_criticality)} />
              </AuditCard>
              <AuditCard title="Record history" description="When this dependency was created and last changed.">
                <AuditField label="Created by" value={dependency.created_by ? auditUserLabels[dependency.created_by] || null : null} />
                <AuditTimestampPair dateLabel="Created at" value={dependency.created_at} />
                <AuditField label="Updated by" value={dependency.updated_by ? auditUserLabels[dependency.updated_by] || null : null} />
                <AuditTimestampPair dateLabel="Last updated" value={dependency.updated_at} />
              </AuditCard>
            </AuditDetailsPanel>
          </div>
        )}

        {formTab === 'details' && (
        <form onSubmit={readOnly ? (event) => event.preventDefault() : handleSubmit} className="p-6 space-y-6">
          <fieldset disabled={readOnly} className="min-w-0 space-y-6 border-0 p-0 m-0">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
              Basic Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Dependency Code
                </label>
                <input
                  type="text"
                  name="dependency_code"
                  value={formData.dependency_code}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Leave blank to assign automatically"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Dependency Name *
                </label>
                <input
                  type="text"
                  name="dependency_name"
                  value={formData.dependency_name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Project A depends on Project B deliverable"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  name="dependency_description"
                  value={formData.dependency_description}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Describe the dependency relationship..."
                />
              </div>
            </div>
          </div>

          {/* Projects */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2 flex items-center gap-2">
              <FolderKanban className="h-5 w-5" />
              Projects
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Source Project (Provides)
                </label>
                <SelectField
                  name="source_project_id"
                  value={formData.source_project_id}
                  onChange={(value) => handleChange({ target: { name: 'source_project_id', value } })}
                  placeholder="None"
                  disabled={readOnly || loadingLookup}
                  options={(() => {
                    const opts = selectableProjects
                      .filter((project) => project.id !== formData.target_project_id)
                      .map(projectOption);
                    if (opts.length >= 12) opts.unshift({ value: '', label: 'None' });
                    return opts;
                  })()}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Target Project (Depends On)
                </label>
                <SelectField
                  name="target_project_id"
                  value={formData.target_project_id}
                  onChange={(value) => handleChange({ target: { name: 'target_project_id', value } })}
                  placeholder="None"
                  disabled={readOnly || loadingLookup}
                  options={(() => {
                    const opts = selectableProjects
                      .filter((project) => project.id !== formData.source_project_id)
                      .map(projectOption);
                    if (opts.length >= 12) opts.unshift({ value: '', label: 'None' });
                    return opts;
                  })()}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Select at least one project. The project open in the header is the one this dependency is recorded against. Party names are stored once for that project’s organisation, so every project in the organisation can select them.
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Dependency party
                {!(formData.source_project_id && formData.target_project_id) ? ' *' : ''}
              </label>
              <SelectField
                name="external_dependency"
                value={formData.external_dependency}
                onChange={handleExternalChange}
                placeholder="Search or add a party"
                forceSearchable
                allowCustom={!readOnly}
                customValueActions={readOnly ? [] : partyCustomActions}
                descriptionColumnLabel="Party Type"
                descriptionColumnBeside
                disabled={readOnly}
                options={externalOptions}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {!readOnly && pendingParty && (
                <div className="mt-3">
                  <p className="mb-2 text-sm text-gray-700 dark:text-gray-200">
                    Flag &quot;{formData.external_dependency}&quot; as internal or external.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => addNamedParty(formData.external_dependency, 'internal')}
                      className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600"
                    >
                      Internal
                    </button>
                    <button
                      type="button"
                      onClick={() => addNamedParty(formData.external_dependency, 'external')}
                      className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600"
                    >
                      External
                    </button>
                  </div>
                </div>
              )}
              {!readOnly && (
                <Link to="/platform/dependency-parties" className="mt-2 inline-block text-sm text-blue-600 dark:text-blue-400">
                  Pre-create or manage the list
                </Link>
              )}
            </div>
          </div>

          {/* Context */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
              Context (Optional)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Portfolio
                </label>
                <SelectField
                  name="portfolio_id"
                  value={formData.portfolio_id}
                  onChange={(value) => handleChange({ target: { name: 'portfolio_id', value } })}
                  placeholder="None"
                  disabled={readOnly || loadingLookup}
                  options={portfolios.map((portfolio) => ({
                    value: portfolio.id,
                    label: `${portfolio.portfolio_name}${portfolio.portfolio_code ? ` (${portfolio.portfolio_code})` : ''}`,
                  }))}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Programme
                </label>
                <SelectField
                  name="programme_id"
                  value={formData.programme_id}
                  onChange={(value) => handleChange({ target: { name: 'programme_id', value } })}
                  placeholder="None"
                  disabled={readOnly || loadingLookup}
                  options={programmes.map((programme) => ({
                    value: programme.id,
                    label: `${programme.programme_name}${programme.programme_code ? ` (${programme.programme_code})` : ''}`,
                  }))}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Dependency Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
              Dependency Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Dependency Type *
                </label>
                <select
                  name="dependency_type"
                  value={formData.dependency_type}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="finish-to-start">Finish-to-Start (FS)</option>
                  <option value="start-to-start">Start-to-Start (SS)</option>
                  <option value="finish-to-finish">Finish-to-Finish (FF)</option>
                  <option value="start-to-finish">Start-to-Finish (SF)</option>
                  <option value="logical">Logical</option>
                  <option value="resource">Resource</option>
                  <option value="benefit">Benefit</option>
                  <option value="deliverable">Deliverable</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Strength *
                </label>
                <select
                  name="dependency_strength"
                  value={formData.dependency_strength}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="hard">Hard</option>
                  <option value="soft">Soft</option>
                  <option value="logical">Logical</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Criticality *
                </label>
                <select
                  name="dependency_criticality"
                  value={formData.dependency_criticality}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Lag Days
                </label>
                <input
                  type="number"
                  name="lag_days"
                  value={formData.lag_days || ''}
                  onChange={handleChange}
                  min="0"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Days between source and target</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Lead Days
                </label>
                <input
                  type="number"
                  name="lead_days"
                  value={formData.lead_days || ''}
                  onChange={handleChange}
                  min="0"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Negative lag (overlap)</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Status *
                </label>
                <select
                  name="dependency_status"
                  value={formData.dependency_status}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="identified">Identified</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="active">Active</option>
                  <option value="at_risk">At Risk</option>
                  <option value="blocked">Blocked</option>
                  <option value="resolved">Resolved</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div className="flex items-center pt-6">
                <input
                  type="checkbox"
                  name="is_critical_path"
                  checked={formData.is_critical_path}
                  onChange={handleChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                  On Critical Path
                </label>
              </div>
            </div>
          </div>

          {/* Risk Assessment */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
              Risk Assessment
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Risk Level
                </label>
                <select
                  name="risk_level"
                  value={formData.risk_level || ''}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">None</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Probability of Failure (%)
                </label>
                <input
                  type="number"
                  name="probability_of_failure"
                  value={formData.probability_of_failure || ''}
                  onChange={handleChange}
                  min="0"
                  max="100"
                  step="0.1"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Expected Impact (Days)
                </label>
                <input
                  type="number"
                  name="expected_impact_days"
                  value={formData.expected_impact_days || ''}
                  onChange={handleChange}
                  min="0"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Risk Description
                </label>
                <textarea
                  name="risk_description"
                  value={formData.risk_description}
                  onChange={handleChange}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Describe the risk..."
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Impact Description
                </label>
                <textarea
                  name="impact_description"
                  value={formData.impact_description}
                  onChange={handleChange}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Describe the impact if dependency fails..."
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Mitigation Plan
                </label>
                <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
                  Add one mitigation step per line. Press Enter or click Add after each.
                </p>
                <MultiLineListInput
                  viewModeId="dependency-mitigation-plan"
                  id="dependency_mitigation_plan"
                  value={formData.mitigation_plan}
                  onChange={(value) => handleChange({ target: { name: 'mitigation_plan', value } })}
                  placeholder="Add a mitigation step..."
                  ariaLabelPrefix="mitigation step"
                  itemColumnLabel="Mitigation step"
                  disabled={readOnly}
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
              Notes
            </h3>
            <div>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Additional notes..."
              />
            </div>
          </div>

          {/* Circular Dependency Check */}
          {checkingCircular && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-center gap-2 text-blue-800 dark:text-blue-300">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="text-sm">Checking for circular dependencies...</span>
              </div>
            </div>
          )}

          {circularCheck && !checkingCircular && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-center gap-2 text-red-800 dark:text-red-300">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <div className="flex-1">
                  <div className="font-medium">Circular Dependency Detected!</div>
                  <div className="text-sm mt-1">
                    Creating this dependency would create a circular dependency. Please review the dependency chain.
                  </div>
                </div>
              </div>
            </div>
          )}

          </fieldset>

          {/* Form Actions */}
          <div className="flex justify-end gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              {readOnly ? 'Back' : 'Cancel'}
            </button>
            {readOnly && onEdit && (
              <button
                type="button"
                onClick={onEdit}
                className="px-6 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium transition-colors"
              >
                Edit
              </button>
            )}
            {!readOnly && (
            <button
              type="submit"
              disabled={saving || circularCheck || (Boolean(formData.source_project_id) && formData.source_project_id === formData.target_project_id)}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : dependency ? 'Update Dependency' : 'Create Dependency'}
            </button>
            )}
          </div>
        </form>
        )}
      </div>
  );

  if (usePageLayout) {
    return <div className="bg-gray-800 dark:bg-gray-900 rounded-lg border border-gray-700">{formContent}{partySavedModal}</div>;
  }
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      {formContent}
      {partySavedModal}
    </div>
  );
}


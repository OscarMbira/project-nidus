import { useState, useEffect, useMemo, useCallback } from 'react';
import { X, Save, User, Mail, Target, ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { saveStakeholder } from '../../services/stakeholderService';
import { platformDb } from '../../services/supabaseClient';
import SearchableSelect from '../ui/SearchableSelect';
import { useDraftQueue } from '../../hooks/useDraftQueue';
import { buildIanaTimezoneSelectOptions } from '../../utils/ianaTimezoneOptions';

const DEFAULT_FORM_DATA = {
  stakeholder_reference: '',
  stakeholder_name: '',
  stakeholder_title: '',
  stakeholder_organization: '',
  stakeholder_department: '',
  stakeholder_type: 'internal',
  stakeholder_category: 'individual',
  stakeholder_role: '',
  email: '',
  phone: '',
  mobile: '',
  emails: [''],
  phones: [''],
  mobiles: [''],
  office_location: '',
  preferred_contact_method: 'email',
  reports_to_stakeholder_id: '',
  organization_level: '',
  project_role: '',
  is_decision_maker: false,
  is_influencer: false,
  is_powerful: false,
  is_negatively_affected: false,
  is_positively_affected: false,
  availability_hours_per_week: null,
  time_zone: '',
  availability_constraints: '',
  stakeholder_status: 'active',
  notes: '',
  special_requirements: '',
  expectations: '',
  identification_source: '',
  identification_date: '',
};

export default function StakeholderForm({ stakeholder, projectId, onSave, onCancel, embedded = true, readOnly = false, initialDraftData = null, formRoute = null }) {
  const [formData, setFormData] = useState(() => {
    if (initialDraftData && typeof initialDraftData === 'object') {
      const merged = { ...DEFAULT_FORM_DATA, ...initialDraftData };
      if (!Array.isArray(merged.emails) || merged.emails.length === 0) merged.emails = [''];
      if (!Array.isArray(merged.phones) || merged.phones.length === 0) merged.phones = [''];
      if (!Array.isArray(merged.mobiles) || merged.mobiles.length === 0) merged.mobiles = [''];
      return merged;
    }
    return { ...DEFAULT_FORM_DATA };
  });

  const { saveDraft, saveStatus, canCreateDraft, existingDraftInfo, dismissExistingDraft, resumeDraft } = useDraftQueue(
    'stakeholder',
    stakeholder?.id ?? null,
    { projectId: projectId || undefined, formRoute: formRoute || undefined }
  );
  const [savingDraft, setSavingDraft] = useState(false);

  const [projectIds, setProjectIds] = useState([]); // multi-select when creating independent stakeholder
  const [projects, setProjects] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [stakeholders, setStakeholders] = useState([]);
  const [roles, setRoles] = useState([]);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  const TAB_IDS = ['projects-basic', 'contact', 'project-role', 'availability', 'notes'];
  const TAB_LABELS = ['Assign & Basic Information', 'Contact Information', 'Project Role & Characteristics', 'Availability', 'Notes & Requirements'];
  const roleOptions = useMemo(
    () => roles.map((r) => ({ value: r.role_name, label: r.role_display_name || r.role_name })),
    [roles]
  );
  const selectedProjectIds = useMemo(() => new Set(projectIds), [projectIds]);

  const timezoneOptions = useMemo(() => buildIanaTimezoneSelectOptions(), []);

  const setTimeZone = useCallback((val) => {
    setFormData((prev) => ({ ...prev, time_zone: val || '' }));
  }, []);

  useEffect(() => {
    if (stakeholder) {
      setFormData({
        stakeholder_reference: stakeholder.stakeholder_reference || '',
        stakeholder_name: stakeholder.stakeholder_name || '',
        stakeholder_title: stakeholder.stakeholder_title || '',
        stakeholder_organization: stakeholder.stakeholder_organization || '',
        stakeholder_department: stakeholder.stakeholder_department || '',
        stakeholder_type: stakeholder.stakeholder_type || 'internal',
        stakeholder_category: stakeholder.stakeholder_category || 'individual',
        stakeholder_role: stakeholder.stakeholder_role || '',
        email: stakeholder.email || '',
        phone: stakeholder.phone || '',
        mobile: stakeholder.mobile || '',
        emails: Array.isArray(stakeholder.emails) && stakeholder.emails.length > 0
          ? stakeholder.emails
          : (stakeholder.email ? [stakeholder.email] : ['']),
        phones: Array.isArray(stakeholder.phones) && stakeholder.phones.length > 0
          ? stakeholder.phones
          : (stakeholder.phone ? [stakeholder.phone] : ['']),
        mobiles: Array.isArray(stakeholder.mobiles) && stakeholder.mobiles.length > 0
          ? stakeholder.mobiles
          : (stakeholder.mobile ? [stakeholder.mobile] : ['']),
        office_location: stakeholder.office_location || '',
        preferred_contact_method: stakeholder.preferred_contact_method || 'email',
        reports_to_stakeholder_id: stakeholder.reports_to_stakeholder_id || '',
        organization_level: stakeholder.organization_level || '',
        project_role: stakeholder.project_role || '',
        is_decision_maker: stakeholder.is_decision_maker || false,
        is_influencer: stakeholder.is_influencer || false,
        is_powerful: stakeholder.is_powerful || false,
        is_negatively_affected: stakeholder.is_negatively_affected || false,
        is_positively_affected: stakeholder.is_positively_affected ?? (stakeholder.is_affected_by_project ? true : false),
        availability_hours_per_week: stakeholder.availability_hours_per_week || null,
        time_zone: stakeholder.time_zone || '',
        availability_constraints: stakeholder.availability_constraints || '',
        stakeholder_status: stakeholder.stakeholder_status || 'active',
        notes: stakeholder.notes || '',
        special_requirements: stakeholder.special_requirements || '',
        expectations: stakeholder.expectations || '',
        identification_source: stakeholder.identification_source || '',
        identification_date: stakeholder.identification_date ? stakeholder.identification_date.slice(0, 10) : '',
      });
    }
    const nextProjectIds = stakeholder
      ? (stakeholder.project_id ? [stakeholder.project_id] : [])
      : projectId ? [projectId] : [];
    setProjectIds(prev => (
      prev.length === nextProjectIds.length && prev.every((id, i) => id === nextProjectIds[i])
        ? prev
        : nextProjectIds
    ));
    if (!stakeholder && projectId) {
      setFormData(prev => ({ ...prev, project_id: projectId }));
    }
    const effectiveProjectId = projectId || (stakeholder?.project_id);
    const isEditMode = !!stakeholder;
    const t = requestAnimationFrame(() => {
      fetchLookupData(effectiveProjectId, isEditMode);
    });
    return () => cancelAnimationFrame(t);
  }, [stakeholder, projectId]);

  useEffect(() => {
    if (stakeholder || !projectIds || projectIds.length !== 1) return;
    platformDb
      .from('stakeholders')
      .select('id, stakeholder_name, stakeholder_reference')
      .eq('project_id', projectIds[0])
      .eq('is_deleted', false)
      .order('stakeholder_name', { ascending: true })
      .then(({ data }) => { if (data) setStakeholders(data); });
  }, [stakeholder, projectIds]);

  const fetchLookupData = useCallback(async (effectiveProjectId, isEditMode) => {
    if (isEditMode) {
      setProjectsLoading(false);
      setProjects([]);
    } else {
      setProjectsLoading(true);
    }
    setRolesLoading(true);
    try {
      const rolesPromise = platformDb
        .from('roles')
        .select('id, role_name, role_display_name')
        .order('role_display_name', { ascending: true })
        .limit(200);

      const stakeholdersPromise = effectiveProjectId
        ? platformDb
            .from('stakeholders')
            .select('id, stakeholder_name, stakeholder_reference')
            .eq('project_id', effectiveProjectId)
            .eq('is_deleted', false)
            .neq('id', stakeholder?.id || '00000000-0000-0000-0000-000000000000')
            .order('stakeholder_name', { ascending: true })
            .limit(200)
        : Promise.resolve({ data: [] });

      if (isEditMode) {
        const [stakeholdersRes, rolesRes] = await Promise.all([stakeholdersPromise, rolesPromise]);
        if (stakeholdersRes?.data != null) setStakeholders(stakeholdersRes.data || []);
        if (rolesRes?.data != null) setRoles(rolesRes.data);
        else setRoles([]);
      } else {
        const projectsPromise = platformDb
          .from('projects')
          .select('id, project_name, project_code')
          .eq('is_deleted', false)
          .order('project_name', { ascending: true })
          .limit(300);
        const [projectsData, stakeholdersData, rolesData] = await Promise.all([
          projectsPromise,
          stakeholdersPromise,
          rolesPromise,
        ]);
        if (projectsData?.data != null) setProjects(projectsData.data);
        if (stakeholdersData?.data != null) setStakeholders(stakeholdersData.data || []);
        if (rolesData?.data != null) setRoles(rolesData.data);
        else setRoles([]);
      }
    } catch (error) {
      console.error('Error fetching lookup data:', error);
      if (!isEditMode) setProjects([]);
      setRoles([]);
    } finally {
      setProjectsLoading(false);
      setRolesLoading(false);
    }
  }, [stakeholder?.id]);

  const handleChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (type === 'number' ? (value ? parseFloat(value) : null) : value),
    }));
  }, []);

  const updateContactEntry = useCallback((field, index, value) => {
    setFormData(prev => {
      const arr = [...(prev[field] || [''])];
      arr[index] = value;
      return { ...prev, [field]: arr };
    });
  }, []);

  const addContactEntry = useCallback((field) => {
    setFormData(prev => ({
      ...prev,
      [field]: [...(prev[field] || []), ''],
    }));
  }, []);

  const removeContactEntry = useCallback((field, index) => {
    setFormData(prev => {
      const arr = [...(prev[field] || [])];
      if (arr.length <= 1) return prev;
      arr.splice(index, 1);
      return { ...prev, [field]: arr };
    });
  }, []);

  /** Failsafe: if the Supabase client never settles, still exit "Saving..." (timers can be throttled in background tabs). */
  const UI_SAVE_TIMEOUT_MS = 55000;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    let uiTimeoutId;
    const uiTimeoutPromise = new Promise((_, reject) => {
      uiTimeoutId = setTimeout(
        () =>
          reject(
            new Error(
              'Save timed out. Check your network, keep this tab in focus, then try again. If it persists, sign out and back in.'
            )
          ),
        UI_SAVE_TIMEOUT_MS
      );
    });

    try {
      await Promise.race([
        (async () => {
          const emailsList = (formData.emails || []).map(s => (s || '').trim()).filter(Boolean);
          const phonesList = (formData.phones || []).map(s => (s || '').trim()).filter(Boolean);
          const mobilesList = (formData.mobiles || []).map(s => (s || '').trim()).filter(Boolean);
          const baseData = {
            ...formData,
            email: emailsList[0] ?? formData.email ?? '',
            phone: phonesList[0] ?? formData.phone ?? '',
            mobile: mobilesList[0] ?? formData.mobile ?? '',
            emails: emailsList.length ? emailsList : null,
            phones: phonesList.length ? phonesList : null,
            mobiles: mobilesList.length ? mobilesList : null,
            reports_to_stakeholder_id: null,
            user_id: formData.user_id || null,
            availability_hours_per_week: formData.availability_hours_per_week ? parseFloat(formData.availability_hours_per_week) : null,
            is_affected_by_project: !!(formData.is_negatively_affected || formData.is_positively_affected),
            identification_source: formData.identification_source || null,
            identification_date: formData.identification_date || null,
          };

          if (stakeholder) {
            baseData.project_id = stakeholder.project_id || projectId || formData.project_id;
            baseData.reports_to_stakeholder_id = formData.reports_to_stakeholder_id || null;
            const saved = await saveStakeholder(baseData, stakeholder.id);
            onSave(saved);
            return;
          }

          const idsToUse = projectIds.length ? projectIds : (projectId ? [projectId] : [formData.project_id].filter(Boolean));

          if (idsToUse.length === 0) {
            const submitData = { ...baseData, project_id: null, reports_to_stakeholder_id: formData.reports_to_stakeholder_id || null };
            const saved = await saveStakeholder(submitData, null);
            onSave(saved);
            return;
          }

          if (idsToUse.length === 1) {
            const submitData = { ...baseData, project_id: idsToUse[0], reports_to_stakeholder_id: formData.reports_to_stakeholder_id || null };
            const saved = await saveStakeholder(submitData, null);
            onSave(saved);
            return;
          }

          const savedList = [];
          for (const pid of idsToUse) {
            const submitData = { ...baseData, project_id: pid };
            const saved = await saveStakeholder(submitData, null);
            savedList.push(saved);
          }
          onSave(savedList);
        })(),
        uiTimeoutPromise,
      ]);
    } catch (error) {
      console.error('Error saving stakeholder:', error);
      alert('Error saving stakeholder: ' + (error?.message || String(error)));
    } finally {
      clearTimeout(uiTimeoutId);
      setSaving(false);
    }
  };

  const header = (
    <div className={`flex items-center justify-between z-10 ${embedded ? 'sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6' : 'mb-6'}`}>
      <div className="flex items-center gap-3">
        {!embedded && onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}
        <User className="h-6 w-6 text-blue-600 dark:text-blue-400" />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          {readOnly ? 'View Stakeholder' : stakeholder ? 'Edit Stakeholder' : 'Add Stakeholder'}
        </h2>
      </div>
      {embedded && (
        <button
          type="button"
          onClick={onCancel}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-2"
          aria-label="Close"
        >
          <X className="h-6 w-6" />
        </button>
      )}
    </div>
  );

  const handleSaveAsDraft = async () => {
    if (readOnly || !canCreateDraft) return;
    setSavingDraft(true);
    try {
      await saveDraft(formData, { projectId: projectId || undefined, entityTitle: formData.stakeholder_name || 'Untitled stakeholder' });
    } catch (e) {
      console.error(e);
      alert(e?.message || 'Failed to save draft');
    } finally {
      setSavingDraft(false);
    }
  };

  const handleRestoreDraft = async () => {
    try {
      const data = await resumeDraft();
      if (data) setFormData((prev) => ({ ...prev, ...data }));
      dismissExistingDraft();
    } catch (e) {
      console.error(e);
    }
  };

  const formContent = (
    <form onSubmit={(e) => { if (readOnly) { e.preventDefault(); return; } handleSubmit(e); }} className="p-6 space-y-6">
      <fieldset disabled={readOnly} className={readOnly ? 'opacity-95' : ''}>
      {!readOnly && !stakeholder && existingDraftInfo && (
        <div className="mb-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 flex items-center justify-between gap-2 flex-wrap">
          <span className="text-sm text-amber-800 dark:text-amber-200">You have a saved draft. Restore it to continue editing.</span>
          <div className="flex gap-2">
            <button type="button" onClick={handleRestoreDraft} className="px-3 py-1.5 text-sm bg-amber-600 hover:bg-amber-700 text-white rounded-lg">Restore</button>
            <button type="button" onClick={dismissExistingDraft} className="px-3 py-1.5 text-sm border border-amber-600 text-amber-700 dark:text-amber-300 rounded-lg">Dismiss</button>
          </div>
        </div>
      )}
      {/* Tab navigation */}
      <div className="flex flex-wrap gap-1 border-b border-gray-200 dark:border-gray-700 pb-4">
        {TAB_LABELS.map((label, idx) => (
          <button
            key={TAB_IDS[idx]}
            type="button"
            onClick={() => setActiveTab(idx)}
            className={`px-3 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              activeTab === idx
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

          {/* Tab 0: Assign to project(s) + Basic Information (merged) */}
          <div className="space-y-6" style={{ display: activeTab === 0 ? 'block' : 'none' }}>
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
                {stakeholder ? 'Project' : 'Assign to project(s)'}
              </h3>
              {stakeholder ? (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {stakeholder.project?.project_name || 'This stakeholder is assigned to one project. Edit project-specific details below.'}
                </p>
              ) : (
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Select one or more projects <span className="text-red-500">*</span>
                  </label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Check each project this stakeholder will be assigned to. The same stakeholder (e.g. ICT Department) can be assigned to many projects.
                  </p>
                  <div className="rounded-lg border-2 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 focus-within:border-blue-500 dark:focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-500/20 transition-colors">
                    <div className="max-h-56 overflow-y-auto p-3 space-y-1">
                      {projectsLoading ? (
                        <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
                          Loading projects…
                        </p>
                      ) : projects.length === 0 ? (
                        <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
                          No projects available. Create a project first from the Projects section.
                        </p>
                      ) : (
                        projects.map((proj) => (
                          <label
                            key={proj.id}
                            className="flex items-center gap-3 cursor-pointer rounded-lg px-3 py-2.5 hover:bg-white dark:hover:bg-gray-700 border border-transparent hover:border-gray-200 dark:hover:border-gray-600 transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={selectedProjectIds.has(proj.id)}
                              onChange={() => {
                                setProjectIds((prev) =>
                                  prev.includes(proj.id) ? prev.filter((id) => id !== proj.id) : [...prev, proj.id]
                                );
                              }}
                              className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0"
                            />
                            <span className="text-sm font-medium text-gray-900 dark:text-white flex-1">
                              {proj.project_name}
                              {proj.project_code ? (
                                <span className="text-gray-500 dark:text-gray-400 font-normal ml-1">({proj.project_code})</span>
                              ) : null}
                            </span>
                          </label>
                        ))
                      )}
                    </div>
                    {projects.length > 0 && (
                      <div className="px-3 py-2 border-t border-gray-200 dark:border-gray-600 bg-gray-100/50 dark:bg-gray-800/50 rounded-b-lg text-sm text-gray-600 dark:text-gray-400">
                        {projectIds.length === 0 ? (
                          'No project selected — stakeholder will be created independently; you can assign to projects later.'
                        ) : (
                          <span className="font-medium text-gray-700 dark:text-gray-300">{projectIds.length} project{projectIds.length !== 1 ? 's' : ''} selected</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
                Basic Information
              </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Stakeholder Reference
                </label>
                <input
                  type="text"
                  name="stakeholder_reference"
                  value={formData.stakeholder_reference}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., SH-001"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Stakeholder Name *
                </label>
                <input
                  type="text"
                  name="stakeholder_name"
                  value={formData.stakeholder_name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., John Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Title
                </label>
                <input
                  type="text"
                  name="stakeholder_title"
                  value={formData.stakeholder_title}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Project Manager"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Organization
                </label>
                <input
                  type="text"
                  name="stakeholder_organization"
                  value={formData.stakeholder_organization}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Acme Corporation"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Department
                </label>
                <input
                  type="text"
                  name="stakeholder_department"
                  value={formData.stakeholder_department}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., IT Department"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Identification source
                </label>
                <select
                  name="identification_source"
                  value={formData.identification_source}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">—</option>
                  <option value="project-charter">Project charter</option>
                  <option value="procurement-docs">Procurement docs</option>
                  <option value="interview">Interview</option>
                  <option value="workshop">Workshop</option>
                  <option value="previous-project">Previous project</option>
                  <option value="referral">Referral</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Identification date
                </label>
                <input
                  type="date"
                  name="identification_date"
                  value={formData.identification_date}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Stakeholder Type *
                </label>
                <select
                  name="stakeholder_type"
                  value={formData.stakeholder_type}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="internal">Internal</option>
                  <option value="external">External</option>
                  <option value="customer">Customer</option>
                  <option value="supplier">Supplier</option>
                  <option value="partner">Partner</option>
                  <option value="regulator">Regulator</option>
                  <option value="community">Community</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Category
                </label>
                <select
                  name="stakeholder_category"
                  value={formData.stakeholder_category}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="individual">Individual</option>
                  <option value="group">Group</option>
                  <option value="organization">Organization</option>
                  <option value="community">Community</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Stakeholder Role
                </label>
                <SearchableSelect
                  options={roleOptions}
                  value={formData.stakeholder_role}
                  onChange={(val) => setFormData((prev) => ({ ...prev, stakeholder_role: val || '' }))}
                  placeholder="Select or type a role"
                  searchPlaceholder="Search roles..."
                  allowCustom
                  loading={rolesLoading}
                  openAbove
                  maxDropdownHeight={280}
                />
              </div>
            </div>
            </div>
          </div>

          {/* Tab 1: Contact Information */}
          <div className="space-y-4" style={{ display: activeTab === 1 ? 'block' : 'none' }}>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2 flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Contact Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email addresses
                </label>
                <div className="space-y-2">
                  {(formData.emails || ['']).map((val, idx) => (
                    <div key={`email-${idx}`} className="flex gap-2 items-center">
                      <input
                        type="email"
                        value={val}
                        onChange={(e) => updateContactEntry('emails', idx, e.target.value)}
                        className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="email@example.com"
                      />
                      <button
                        type="button"
                        onClick={() => removeContactEntry('emails', idx)}
                        disabled={(formData.emails || []).length <= 1}
                        className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
                        aria-label="Remove email"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => addContactEntry('emails')}
                    className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    <Plus className="h-4 w-4" />
                    Add another email
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Phone numbers
                </label>
                <div className="space-y-2">
                  {(formData.phones || ['']).map((val, idx) => (
                    <div key={`phone-${idx}`} className="flex gap-2 items-center">
                      <input
                        type="tel"
                        value={val}
                        onChange={(e) => updateContactEntry('phones', idx, e.target.value)}
                        className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="+1 (555) 123-4567"
                      />
                      <button
                        type="button"
                        onClick={() => removeContactEntry('phones', idx)}
                        disabled={(formData.phones || []).length <= 1}
                        className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
                        aria-label="Remove phone"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => addContactEntry('phones')}
                    className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    <Plus className="h-4 w-4" />
                    Add another phone
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Mobile numbers
                </label>
                <div className="space-y-2">
                  {(formData.mobiles || ['']).map((val, idx) => (
                    <div key={`mobile-${idx}`} className="flex gap-2 items-center">
                      <input
                        type="tel"
                        value={val}
                        onChange={(e) => updateContactEntry('mobiles', idx, e.target.value)}
                        className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="+1 (555) 987-6543"
                      />
                      <button
                        type="button"
                        onClick={() => removeContactEntry('mobiles', idx)}
                        disabled={(formData.mobiles || []).length <= 1}
                        className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
                        aria-label="Remove mobile"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => addContactEntry('mobiles')}
                    className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    <Plus className="h-4 w-4" />
                    Add another mobile
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Preferred Contact Method
                </label>
                <select
                  name="preferred_contact_method"
                  value={formData.preferred_contact_method}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="email">Email</option>
                  <option value="phone">Phone</option>
                  <option value="in-person">In-Person</option>
                  <option value="video-call">Video Call</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Office Location
                </label>
                <input
                  type="text"
                  name="office_location"
                  value={formData.office_location}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Building, Floor, Room, City"
                />
              </div>
            </div>
          </div>

          {/* Tab 2: Project Role & Characteristics */}
          <div className="space-y-4" style={{ display: activeTab === 2 ? 'block' : 'none' }}>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2 flex items-center gap-2">
              <Target className="h-5 w-5" />
              Project Role & Characteristics
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Project Role
                </label>
                <SearchableSelect
                  options={roleOptions}
                  value={formData.project_role}
                  onChange={(val) => setFormData((prev) => ({ ...prev, project_role: val || '' }))}
                  placeholder="Select or type their role in this project"
                  searchPlaceholder="Search roles..."
                  allowCustom
                  loading={rolesLoading}
                  openAbove
                  maxDropdownHeight={280}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Organization Level
                </label>
                <select
                  name="organization_level"
                  value={formData.organization_level}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Not specified</option>
                  <option value="executive">Executive</option>
                  <option value="senior-management">Senior Management</option>
                  <option value="middle-management">Middle Management</option>
                  <option value="staff">Staff</option>
                </select>
              </div>

              {stakeholders.length > 0 && projectIds.length <= 1 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Reports To
                  </label>
                  <select
                    name="reports_to_stakeholder_id"
                    value={formData.reports_to_stakeholder_id}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">None</option>
                    {stakeholders.map(sh => (
                      <option key={sh.id} value={sh.id}>
                        {sh.stakeholder_name} {sh.stakeholder_reference ? `(${sh.stakeholder_reference})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="md:col-span-2">
                <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="is_decision_maker"
                      checked={formData.is_decision_maker}
                      onChange={handleChange}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Decision Maker
                    </span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="is_influencer"
                      checked={formData.is_influencer}
                      onChange={handleChange}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Influencer
                    </span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="is_powerful"
                      checked={formData.is_powerful}
                      onChange={handleChange}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Powerful
                    </span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="is_negatively_affected"
                      checked={formData.is_negatively_affected}
                      onChange={handleChange}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Negatively affected
                    </span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="is_positively_affected"
                      checked={formData.is_positively_affected}
                      onChange={handleChange}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Positively affected
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Tab 3: Availability */}
          <div className="space-y-4" style={{ display: activeTab === 3 ? 'block' : 'none' }}>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
              Availability
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Hours per Week
                </label>
                <input
                  type="number"
                  name="availability_hours_per_week"
                  value={formData.availability_hours_per_week || ''}
                  onChange={handleChange}
                  min="0"
                  max="168"
                  step="0.5"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Time Zone
                </label>
                <SearchableSelect
                  options={timezoneOptions}
                  value={formData.time_zone}
                  onChange={setTimeZone}
                  placeholder="Select timezone…"
                  searchPlaceholder="Search timezones (e.g. London, Tokyo)…"
                  allowCustom
                  openAbove
                  maxDropdownHeight={280}
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Choose an IANA zone, or use a custom value if your legacy text does not appear in the list.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Status *
                </label>
                <select
                  name="stakeholder_status"
                  value={formData.stakeholder_status}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="departed">Departed</option>
                </select>
              </div>

              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Availability Constraints
                </label>
                <textarea
                  name="availability_constraints"
                  value={formData.availability_constraints}
                  onChange={handleChange}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Describe availability constraints..."
                />
              </div>
            </div>
          </div>

          {/* Tab 4: Notes, Requirements & Expectations */}
          <div className="space-y-4" style={{ display: activeTab === 4 ? 'block' : 'none' }}>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
              Notes, Requirements & Expectations
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Special Requirements
                </label>
                <textarea
                  name="special_requirements"
                  value={formData.special_requirements}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Specific requirements, constraints, or conditions for this stakeholder..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Expectations
                </label>
                <textarea
                  name="expectations"
                  value={formData.expectations}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="List key expectations the stakeholder has from this project..."
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Notes
              </label>
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

          {/* Form Actions */}
          <div className="flex justify-end gap-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex-wrap">
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              {readOnly ? 'Back' : 'Cancel'}
            </button>
            {!readOnly && formRoute && (
              <button
                type="button"
                onClick={handleSaveAsDraft}
                disabled={savingDraft || !canCreateDraft}
                className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {savingDraft ? 'Saving draft...' : 'Save as Draft'}
              </button>
            )}
            {!readOnly && (
              <button
                type="submit"
                disabled={saving || !formData.stakeholder_name}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                {saving ? 'Saving...' : stakeholder ? 'Update Stakeholder' : projectIds.length > 1 ? `Create & assign to ${projectIds.length} projects` : 'Create Stakeholder'}
              </button>
            )}
          </div>
      </fieldset>
        </form>
  );

  if (embedded) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          {header}
          {formContent}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8 flex justify-center">
      <div className="w-3/4 max-w-5xl bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-visible">
        {header}
        {formContent}
      </div>
    </div>
  );
}


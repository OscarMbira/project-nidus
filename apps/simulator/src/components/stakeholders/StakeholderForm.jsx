import { useState, useEffect, useMemo, useCallback } from 'react';
import { X, Save, User, Mail, Target, ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { saveStakeholder } from '../../services/stakeholderService';
import {
  addStakeholderDepartment,
  addStakeholderOrganisation,
  loadStakeholderCatalogues,
} from '../../services/stakeholderCatalogueService';
import SelectField from '@nidus/ui/SelectField';
import { platformDb } from '../../services/supabaseClient';
import StakeholderPhotoField from '@nidus/ui/StakeholderPhotoField';
import { saveStakeholderPhoto } from '@nidus/shared/services/stakeholderPhotoService';
import SearchableSelect from '@nidus/ui/SearchableSelect';
import { useDraftQueue } from '../../lib/useDraftQueue';
import { buildIanaTimezoneSelectOptions } from '@nidus/shared/utils/ianaTimezoneOptions';
import DetailAuditTabList from '@nidus/ui/DetailAuditTabList';
import AuditDetailsPanel from '@nidus/ui/AuditDetailsPanel';
import AuditCard from '@nidus/ui/AuditCard';
import AuditField from '@nidus/ui/AuditField';
import AuditTimestampPair from '@nidus/ui/AuditTimestampPair';
import { humanizeAuditToken, resolveAuditUserLabels } from '@nidus/shared/utils/auditDisplayUtils';
import MultiLineListInput, { joinMultiLineValue, parseMultiLineValue } from '@nidus/ui/MultiLineListInput';

function filledContactEntries(list) {
  return (list || [])
    .map((value, index) => ({ index, value: String(value || '').trim() }))
    .filter((entry) => entry.value);
}

function primaryIndexMissing(list, selectedIndex) {
  const filled = filledContactEntries(list);
  if (filled.length < 2) return false;
  return !filled.some((entry) => entry.index === selectedIndex);
}

function primaryValueAt(list, selectedIndex) {
  const filled = filledContactEntries(list);
  if (filled.length < 2) return filled[0]?.value || '';
  return filled.find((entry) => entry.index === selectedIndex)?.value || '';
}

function orderByPrimaryIndex(list, selectedIndex) {
  const filled = filledContactEntries(list);
  const chosen = filled.find((entry) => entry.index === selectedIndex);
  if (!chosen || filled.length < 2) return filled.map((entry) => entry.value);
  return [
    chosen.value,
    ...filled.filter((entry) => entry.index !== selectedIndex).map((entry) => entry.value),
  ];
}

function initialPrimaryIndex(list, primary) {
  const target = String(primary || '').trim();
  if (!target) return null;
  const index = (list || []).findIndex((value) => String(value || '').trim() === target);
  return index >= 0 ? index : null;
}

function appendUniqueLine(current, nextValue) {
  const next = String(nextValue || '').trim();
  if (!next) return current || '';
  const lines = parseMultiLineValue(current || '');
  if (lines.some((line) => line.toLowerCase() === next.toLowerCase())) return current || '';
  return joinMultiLineValue([...lines, next]);
}

function roleLabel(value, roleOptions) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const match = (roleOptions || []).find((opt) => opt.value === raw || opt.label === raw);
  return match?.label || raw;
}

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
  interest_level: '',
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
  const [organisationOptions, setOrganisationOptions] = useState([]);
  const [departmentOptions, setDepartmentOptions] = useState([]);
  const [catalogueAccountId, setCatalogueAccountId] = useState(null);
  const [catalogueError, setCatalogueError] = useState('');
  const [contactPrimaryError, setContactPrimaryError] = useState('');
  const [primaryContactIndex, setPrimaryContactIndex] = useState({
    emails: null,
    phones: null,
    mobiles: null,
  });
  const [saving, setSaving] = useState(false);
  const [pendingPhoto, setPendingPhoto] = useState(null);
  const [activeTab, setActiveTab] = useState('assign-projects');
  const [auditUserLabels, setAuditUserLabels] = useState({});

  const TAB_IDS = ['assign-projects', 'basic', 'contact', 'project-role', 'characteristics', 'availability', 'requirements', 'expectations', 'notes'];
  const TAB_LABELS = ['Assign to project(s)', 'Basic Information', 'Contact Information', 'Project Role', 'Characteristics', 'Availability', 'Requirements', 'Expectations', 'Notes'];

  useEffect(() => {
    if (activeTab !== 'audit' || !stakeholder) return;
    let cancelled = false;
    (async () => {
      const labels = await resolveAuditUserLabels(platformDb, [
        stakeholder.created_by,
        stakeholder.updated_by,
      ]);
      if (!cancelled) setAuditUserLabels(labels || {});
    })();
    return () => { cancelled = true; };
  }, [activeTab, stakeholder]);
  const roleOptions = useMemo(
    () => roles.map((r) => ({ value: r.role_name, label: r.role_display_name || r.role_name })),
    [roles]
  );

  useEffect(() => {
    if (!roleOptions.length) return;
    setFormData((prev) => {
      const lines = parseMultiLineValue(prev.project_role);
      if (!lines.length) return prev;
      const next = joinMultiLineValue(lines.map((line) => roleLabel(line, roleOptions)));
      if (next === (prev.project_role || '')) return prev;
      return { ...prev, project_role: next };
    });
  }, [roleOptions]);

  useEffect(() => {
    let cancelled = false;
    const projectKey = projectIds[0] || projectId || stakeholder?.project_id || null;
    (async () => {
      let accountId = null;
      if (projectKey) {
        const { data } = await platformDb.from('projects').select('account_id').eq('id', projectKey).maybeSingle();
        accountId = data?.account_id || null;
      }
      if (cancelled) return;
      setCatalogueAccountId(accountId);
      const catalogues = await loadStakeholderCatalogues(accountId);
      if (cancelled) return;
      setOrganisationOptions(catalogues.organisations);
      setDepartmentOptions(catalogues.departments);
    })();
    return () => { cancelled = true; };
  }, [projectIds, projectId, stakeholder?.project_id]);

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
        interest_level: stakeholder.interest_level || '',
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
      const loadedEmails = Array.isArray(stakeholder.emails) && stakeholder.emails.length > 0
        ? stakeholder.emails
        : (stakeholder.email ? [stakeholder.email] : ['']);
      const loadedPhones = Array.isArray(stakeholder.phones) && stakeholder.phones.length > 0
        ? stakeholder.phones
        : (stakeholder.phone ? [stakeholder.phone] : ['']);
      const loadedMobiles = Array.isArray(stakeholder.mobiles) && stakeholder.mobiles.length > 0
        ? stakeholder.mobiles
        : (stakeholder.mobile ? [stakeholder.mobile] : ['']);
      setPrimaryContactIndex({
        emails: initialPrimaryIndex(loadedEmails, stakeholder.email),
        phones: initialPrimaryIndex(loadedPhones, stakeholder.phone),
        mobiles: initialPrimaryIndex(loadedMobiles, stakeholder.mobile),
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
    setFormData((prev) => {
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

  const rememberOption = (setter, label) => {
    const next = String(label || '').trim();
    if (!next) return;
    setter((prev) => {
      if (prev.some((opt) => String(opt.value).toLowerCase() === next.toLowerCase())) return prev;
      return [...prev, { value: next, label: next }].sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));
    });
  };

  const withCurrentOption = (options, current) => {
    const value = String(current || '').trim();
    if (!value || options.some((opt) => opt.value === value)) return options;
    return [{ value, label: value }, ...options];
  };

  const addOrganisationName = async (name) => {
    setCatalogueError('');
    if (!catalogueAccountId) {
      setCatalogueError('Choose a project first so this organisation can be saved.');
      return;
    }
    try {
      const saved = await addStakeholderOrganisation(catalogueAccountId, name);
      setFormData((prev) => ({ ...prev, stakeholder_organization: saved }));
      rememberOption(setOrganisationOptions, saved);
    } catch (error) {
      setCatalogueError(error?.message || 'Could not add this organisation.');
    }
  };

  const addDepartmentName = async (name) => {
    setCatalogueError('');
    if (!catalogueAccountId) {
      setCatalogueError('Choose a project first so this department can be saved.');
      return;
    }
    try {
      const saved = await addStakeholderDepartment(catalogueAccountId, name);
      setFormData((prev) => ({ ...prev, stakeholder_department: saved }));
      rememberOption(setDepartmentOptions, saved);
    } catch (error) {
      setCatalogueError(error?.message || 'Could not add this department.');
    }
  };

  const removeContactEntry = useCallback((field, index) => {
    setFormData((prev) => {
      const arr = [...(prev[field] || [])];
      if (arr.length <= 1) return prev;
      arr.splice(index, 1);
      return { ...prev, [field]: arr };
    });
    setPrimaryContactIndex((prev) => {
      const current = prev[field];
      if (current == null) return prev;
      if (current === index) return { ...prev, [field]: null };
      if (current > index) return { ...prev, [field]: current - 1 };
      return prev;
    });
  }, []);

  const persistPendingPhoto = async (saved) => {
    if (!pendingPhoto || !saved?.id) return saved;
    const result = await saveStakeholderPhoto(platformDb, {
      id: saved.id,
      accountId: saved.account_id || catalogueAccountId,
      ownerUserId: saved.user_id,
      file: pendingPhoto,
      previousPath: saved.photo_path || null,
    });
    if (!result.success) {
      throw new Error(result.message || 'Stakeholder saved, but the picture could not be stored.');
    }
    return { ...saved, photo_path: result.data };
  };

  /** Failsafe: if the Supabase client never settles, still exit "Saving..." (timers can be throttled in background tabs). */
  const UI_SAVE_TIMEOUT_MS = 55000;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const missingPrimary = [
      primaryIndexMissing(formData.emails, primaryContactIndex.emails) ? 'email address' : '',
      primaryIndexMissing(formData.phones, primaryContactIndex.phones) ? 'phone number' : '',
      primaryIndexMissing(formData.mobiles, primaryContactIndex.mobiles) ? 'mobile number' : '',
    ].filter(Boolean);
    if (missingPrimary.length) {
      setActiveTab('contact');
      setContactPrimaryError(`Select a primary ${missingPrimary.join(', ')}.`);
      return;
    }
    setContactPrimaryError('');
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
          const emailsList = orderByPrimaryIndex(formData.emails, primaryContactIndex.emails);
          const phonesList = orderByPrimaryIndex(formData.phones, primaryContactIndex.phones);
          const mobilesList = orderByPrimaryIndex(formData.mobiles, primaryContactIndex.mobiles);
          const typedReference = String(formData.stakeholder_reference || '').trim();
          const baseData = {
            ...formData,
            stakeholder_reference: stakeholder
              ? (typedReference || stakeholder.stakeholder_reference || null)
              : (typedReference || null),
            email: primaryValueAt(formData.emails, primaryContactIndex.emails),
            phone: primaryValueAt(formData.phones, primaryContactIndex.phones),
            mobile: primaryValueAt(formData.mobiles, primaryContactIndex.mobiles),
            emails: emailsList.length ? emailsList : null,
            phones: phonesList.length ? phonesList : null,
            mobiles: mobilesList.length ? mobilesList : null,
            reports_to_stakeholder_id: null,
            user_id: formData.user_id || null,
            availability_hours_per_week: formData.availability_hours_per_week ? parseFloat(formData.availability_hours_per_week) : null,
            is_affected_by_project: !!(formData.is_negatively_affected || formData.is_positively_affected),
            interest_level: formData.interest_level || null,
            identification_source: formData.identification_source || null,
            identification_date: formData.identification_date || null,
          };

          if (stakeholder) {
            baseData.project_id = stakeholder.project_id ?? null;
            baseData.account_id = stakeholder.account_id || catalogueAccountId || null;
            baseData.reports_to_stakeholder_id = formData.reports_to_stakeholder_id || null;
            const saved = await persistPendingPhoto(await saveStakeholder(baseData, stakeholder.id));
            onSave(saved);
            return;
          }

          const idsToUse = projectIds.length ? projectIds : [];

          if (idsToUse.length === 0) {
            if (!catalogueAccountId) {
              alert('Open a project in the organisation before adding a stakeholder to every project.');
              return;
            }
            const submitData = {
              ...baseData,
              project_id: null,
              account_id: catalogueAccountId,
              reports_to_stakeholder_id: formData.reports_to_stakeholder_id || null,
            };
            const saved = await persistPendingPhoto(await saveStakeholder(submitData, null));
            onSave(saved);
            return;
          }

          if (idsToUse.length === 1) {
            const submitData = { ...baseData, project_id: idsToUse[0], reports_to_stakeholder_id: formData.reports_to_stakeholder_id || null };
            const saved = await persistPendingPhoto(await saveStakeholder(submitData, null));
            onSave(saved);
            return;
          }

          const savedList = [];
          for (const pid of idsToUse) {
            const submitData = { ...baseData, project_id: pid };
            const saved = await persistPendingPhoto(await saveStakeholder(submitData, null));
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
      let pendingPhotoDataUrl = null;
      if (pendingPhoto) {
        pendingPhotoDataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(pendingPhoto);
        });
      }
      await saveDraft(
        { ...formData, pendingPhotoDataUrl },
        { projectId: projectId || undefined, entityTitle: formData.stakeholder_name || 'Untitled stakeholder' }
      );
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
      if (data) {
        const { pendingPhotoDataUrl, ...rest } = data;
        setFormData((prev) => ({ ...prev, ...rest }));
        if (pendingPhotoDataUrl) {
          const blob = await (await fetch(pendingPhotoDataUrl)).blob();
          setPendingPhoto(new File([blob], 'photo.png', { type: blob.type || 'image/png' }));
        }
      }
      dismissExistingDraft();
    } catch (e) {
      console.error(e);
    }
  };

  const renderContactList = (field, { label, type, placeholder, addLabel, noun }) => {
    const values = formData[field] || [''];
    const showPrimary = values.length > 1;
    const selectedIndex = primaryContactIndex[field];
    const missing = primaryIndexMissing(values, selectedIndex);
    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {label}
        </label>
        {showPrimary && (
          <p className="mb-2 text-sm text-gray-800 dark:text-gray-100">
            More than one {noun}. Choose one primary.
          </p>
        )}
        <div className="space-y-3">
          {values.map((val, idx) => {
            const trimmed = String(val || '').trim();
            const isPrimary = selectedIndex === idx && Boolean(trimmed);
            return (
              <div key={`${field}-${idx}`} className="space-y-1">
                <div className="flex gap-2 items-center">
                  <input
                    type={type}
                    value={val}
                    onChange={(e) => updateContactEntry(field, idx, e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={placeholder}
                  />
                  <button
                    type="button"
                    onClick={() => removeContactEntry(field, idx)}
                    disabled={values.length <= 1}
                    className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
                    aria-label={`Remove ${noun}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                {showPrimary && (
                  <button
                    type="button"
                    disabled={!trimmed}
                    onClick={() => {
                      if (!trimmed) return;
                      setPrimaryContactIndex((prev) => ({ ...prev, [field]: idx }));
                      setContactPrimaryError('');
                    }}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border ${
                      isPrimary
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'bg-white dark:bg-gray-700 border-gray-400 dark:border-gray-300 text-gray-900 dark:text-white'
                    } disabled:opacity-40 disabled:cursor-not-allowed`}
                    aria-pressed={isPrimary}
                  >
                    {isPrimary ? 'Primary' : 'Set as primary'}
                  </button>
                )}
              </div>
            );
          })}
          <button
            type="button"
            onClick={() => addContactEntry(field)}
            className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            <Plus className="h-4 w-4" />
            {addLabel}
          </button>
          {missing && (
            <p className="text-sm text-red-700 dark:text-red-300">Select one primary {noun}.</p>
          )}
        </div>
      </div>
    );
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
      <DetailAuditTabList
        activeTab={activeTab}
        onChange={setActiveTab}
        ariaLabel="Stakeholder form sections"
        tabs={[
          ...TAB_IDS.map((id, idx) => ({ value: id, label: TAB_LABELS[idx] })),
          { value: 'audit', label: 'Audit details' },
        ]}
      />

      {activeTab === 'audit' && (
        !stakeholder?.id ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">Audit details appear after this stakeholder is saved.</p>
        ) : (
          <AuditDetailsPanel description="Who created or changed this stakeholder, and how it is classified.">
            <AuditCard title="Identity" description="How this stakeholder is labelled and tracked.">
              <AuditField label="Reference" value={stakeholder.stakeholder_reference} />
              <AuditField label="Name" value={formData.stakeholder_name || stakeholder.stakeholder_name} />
              <AuditField label="Type" value={humanizeAuditToken(formData.stakeholder_type || stakeholder.stakeholder_type)} />
              <AuditField label="Status" value={humanizeAuditToken(formData.stakeholder_status || stakeholder.stakeholder_status)} />
            </AuditCard>
            <AuditCard title="Classification" description="Where this stakeholder sits.">
              <AuditField label="Category" value={humanizeAuditToken(formData.stakeholder_category || stakeholder.stakeholder_category)} />
              <AuditField label="Organization" value={formData.stakeholder_organization || stakeholder.stakeholder_organization} />
              <AuditField label="Project role" value={parseMultiLineValue(formData.project_role || stakeholder.project_role || '').join(', ') || null} />
            </AuditCard>
            <AuditCard title="Record history" description="When this stakeholder was created and last changed.">
              <AuditField label="Created by" value={stakeholder.created_by ? auditUserLabels[stakeholder.created_by] || null : null} />
              <AuditTimestampPair dateLabel="Created at" value={stakeholder.created_at} />
              <AuditField label="Updated by" value={stakeholder.updated_by ? auditUserLabels[stakeholder.updated_by] || null : null} />
              <AuditTimestampPair dateLabel="Last updated" value={stakeholder.updated_at} />
              <AuditTimestampPair dateLabel="Identification date" value={stakeholder.identification_date || formData.identification_date} />
            </AuditCard>
          </AuditDetailsPanel>
        )
      )}

          {/* Tab: Assign to project(s) */}
          <div className="space-y-4" style={{ display: activeTab === 'assign-projects' ? 'block' : 'none' }}>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
                {stakeholder ? 'Project' : 'Assign to project(s)'}
              </h3>
              {stakeholder ? (
                <p className="text-sm text-gray-700 dark:text-gray-200">
                  {stakeholder.project_id
                    ? (stakeholder.project?.project_name || 'This stakeholder is assigned to one project.')
                    : 'This stakeholder is on every project in the organisation. A project can remove them if they are not needed there.'}
                </p>
              ) : (
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Select one or more projects
                  </label>
                  <p className="text-sm text-gray-700 dark:text-gray-200">
                    Check the projects this stakeholder belongs to. Leave every project unchecked to add them to all projects in the organisation. A PMO, project manager, team manager, or team member can later remove them from a project that does not need them.
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
                          'No project selected. This stakeholder will appear on every project in the organisation.'
                        ) : (
                          <span className="font-medium text-gray-700 dark:text-gray-300">{projectIds.length} project{projectIds.length !== 1 ? 's' : ''} selected</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
          </div>

          {/* Tab: Basic Information */}
          <div className="space-y-4" style={{ display: activeTab === 'basic' ? 'block' : 'none' }}>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
                Basic Information
              </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <StakeholderPhotoField
                db={platformDb}
                stakeholder={stakeholder
                  ? { ...stakeholder, stakeholder_name: formData.stakeholder_name }
                  : { stakeholder_name: formData.stakeholder_name }}
                category={formData.stakeholder_category}
                accountId={catalogueAccountId || stakeholder?.account_id}
                readOnly={readOnly}
                pendingFile={stakeholder ? null : pendingPhoto}
                onPendingFile={setPendingPhoto}
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Stakeholder Reference
                </label>
                <input
                  type="text"
                  name="stakeholder_reference"
                  value={formData.stakeholder_reference}
                  onChange={handleChange}
                  disabled={readOnly}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Leave blank to generate"
                />
                <p className="mt-1 text-xs text-gray-700 dark:text-gray-200">
                  Leave this blank and a reference is assigned when you save. Type one only if you already have a reference to keep.
                </p>
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
                  disabled={readOnly}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Project Manager"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Organization
                </label>
                <SelectField
                  value={formData.stakeholder_organization}
                  onChange={(value) => setFormData((prev) => ({ ...prev, stakeholder_organization: value || '' }))}
                  options={withCurrentOption(organisationOptions, formData.stakeholder_organization)}
                  placeholder="Search organisations"
                  searchPlaceholder="Search organisations..."
                  forceSearchable
                  allowCustom={!readOnly}
                  disabled={readOnly}
                  openAbove
                  customValueActions={readOnly ? [] : [{
                    key: 'add-organisation',
                    label: (term) => `Add "${term}" to organisations`,
                    onSelect: addOrganisationName,
                  }]}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Department
                </label>
                <SelectField
                  value={formData.stakeholder_department}
                  onChange={(value) => setFormData((prev) => ({ ...prev, stakeholder_department: value || '' }))}
                  options={withCurrentOption(departmentOptions, formData.stakeholder_department)}
                  placeholder="Search departments"
                  searchPlaceholder="Search departments..."
                  forceSearchable
                  allowCustom={!readOnly}
                  disabled={readOnly}
                  openAbove
                  customValueActions={readOnly ? [] : [{
                    key: 'add-department',
                    label: (term) => `Add "${term}" to departments`,
                    onSelect: addDepartmentName,
                  }]}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              {catalogueError && (
                <p className="md:col-span-2 text-sm text-red-700 dark:text-red-300">{catalogueError}</p>
              )}

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

          {/* Tab: Contact Information */}
          <div className="space-y-4" style={{ display: activeTab === 'contact' ? 'block' : 'none' }}>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2 flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Contact Information
            </h3>
            {contactPrimaryError && (
              <p className="text-sm text-red-700 dark:text-red-300">{contactPrimaryError}</p>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {renderContactList('emails', {
                label: 'Email addresses',
                type: 'email',
                placeholder: 'email@example.com',
                addLabel: 'Add another email',
                noun: 'email address',
              })}
              {renderContactList('phones', {
                label: 'Phone numbers',
                type: 'tel',
                placeholder: '+1 (555) 123-4567',
                addLabel: 'Add another phone',
                noun: 'phone number',
              })}
              {renderContactList('mobiles', {
                label: 'Mobile numbers',
                type: 'tel',
                placeholder: '+1 (555) 987-6543',
                addLabel: 'Add another mobile',
                noun: 'mobile number',
              })}

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

          <div className="space-y-4" style={{ display: activeTab === 'project-role' ? 'block' : 'none' }}>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2 flex items-center gap-2">
              <Target className="h-5 w-5" />
              Project Role
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Project roles
                </label>
                <SearchableSelect
                  options={roleOptions}
                  value=""
                  onChange={(val) => setFormData((prev) => ({
                    ...prev,
                    project_role: appendUniqueLine(prev.project_role, roleLabel(val, roleOptions)),
                  }))}
                  placeholder="Select or type a role, then add another"
                  searchPlaceholder="Search roles..."
                  allowCustom
                  loading={rolesLoading}
                  openAbove
                  maxDropdownHeight={280}
                />
                <div className="mt-3">
                  <MultiLineListInput
                    viewModeId="stakeholder-project-roles"
                    value={formData.project_role || ''}
                    onChange={(value) => setFormData((prev) => ({ ...prev, project_role: value }))}
                    itemColumnLabel="Project role"
                    placeholder="Or type a role"
                    ariaLabelPrefix="project role"
                    disabled={readOnly}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4" style={{ display: activeTab === 'characteristics' ? 'block' : 'none' }}>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2 flex items-center gap-2">
              <Target className="h-5 w-5" />
              Characteristics
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

              <div className="md:col-span-2 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {[
                  { name: 'is_decision_maker', label: 'Decision Maker' },
                  { name: 'is_influencer', label: 'Influencer' },
                  { name: 'is_powerful', label: 'Powerful' },
                  { name: 'is_negatively_affected', label: 'Negatively affected' },
                  { name: 'is_positively_affected', label: 'Positively affected' },
                ].map((item, index) => (
                  <label key={item.name} className="flex items-center gap-3 px-4 py-3">
                    <span className="w-6 shrink-0 text-sm tabular-nums text-gray-700 dark:text-gray-200">{index + 1}</span>
                    <input
                      type="checkbox"
                      name={item.name}
                      checked={formData[item.name]}
                      onChange={handleChange}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {item.label}
                    </span>
                  </label>
                ))}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
                  <span className="w-6 shrink-0 text-sm tabular-nums text-gray-700 dark:text-gray-200">6</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Interest</span>
                  {[
                    { value: 'high', label: 'High' },
                    { value: 'medium', label: 'Medium' },
                    { value: 'low', label: 'Low' },
                  ].map((option) => (
                    <label key={option.value} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="interest_level"
                        value={option.value}
                        checked={formData.interest_level === option.value}
                        onChange={handleChange}
                        className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-900 dark:text-gray-100">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Tab: Availability */}
          <div className="space-y-4" style={{ display: activeTab === 'availability' ? 'block' : 'none' }}>
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
                  Availability constraints
                </label>
                <MultiLineListInput
                  viewModeId="stakeholder-availability-constraints"
                  value={formData.availability_constraints || ''}
                  onChange={(value) => setFormData((prev) => ({ ...prev, availability_constraints: value }))}
                  itemColumnLabel="Constraint"
                  placeholder="One constraint"
                  ariaLabelPrefix="availability constraint"
                  disabled={readOnly}
                />
              </div>
            </div>
          </div>

          <div className="space-y-4" style={{ display: activeTab === 'notes' ? 'block' : 'none' }}>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
              Notes
            </h3>
            <MultiLineListInput
              viewModeId="stakeholder-notes"
              value={formData.notes || ''}
              onChange={(value) => setFormData((prev) => ({ ...prev, notes: value }))}
              itemColumnLabel="Note"
              placeholder="One note"
              ariaLabelPrefix="note"
              disabled={readOnly}
            />
          </div>

          <div className="space-y-4" style={{ display: activeTab === 'requirements' ? 'block' : 'none' }}>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
              Requirements
            </h3>
            <MultiLineListInput
              viewModeId="stakeholder-requirements"
              value={formData.special_requirements || ''}
              onChange={(value) => setFormData((prev) => ({ ...prev, special_requirements: value }))}
              itemColumnLabel="Requirement"
              placeholder="One requirement"
              ariaLabelPrefix="requirement"
              disabled={readOnly}
            />
          </div>

          <div className="space-y-4" style={{ display: activeTab === 'expectations' ? 'block' : 'none' }}>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
              Expectations
            </h3>
            <MultiLineListInput
              viewModeId="stakeholder-expectations"
              value={formData.expectations || ''}
              onChange={(value) => setFormData((prev) => ({ ...prev, expectations: value }))}
              itemColumnLabel="Expectation"
              placeholder="One expectation"
              ariaLabelPrefix="expectation"
              disabled={readOnly}
            />
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
    <div className="w-full px-3 sm:px-4 lg:px-5 xl:px-6 py-6">
      <div className="w-full bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-visible">
        {header}
        {formContent}
      </div>
    </div>
  );
}


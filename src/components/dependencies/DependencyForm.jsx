import { useState, useEffect } from 'react';
import { X, Save, Link2, FolderKanban, Target, AlertTriangle } from 'lucide-react';
import { saveInterProjectDependency, checkCircularDependency } from '../../services/dependencyService';
import { platformDb } from '../../services/supabase/supabaseClient';

export default function DependencyForm({ dependency, onSave, onCancel, usePageLayout = false }) {
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
  });

  const [projects, setProjects] = useState([]);
  const [portfolios, setPortfolios] = useState([]);
  const [programmes, setProgrammes] = useState([]);
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
      });
    }
    fetchLookupData();
  }, [dependency]);

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
      const [projectsRes, portfoliosRes, programmesRes] = await Promise.all([
        platformDb.from('projects').select('id, project_name, project_code, status_id').eq('is_deleted', false).order('project_name', { ascending: true }),
        platformDb.from('portfolios').select('id, portfolio_name, portfolio_code').eq('is_deleted', false).order('portfolio_name', { ascending: true }),
        platformDb.from('programmes').select('id, programme_name, programme_code').eq('is_deleted', false).order('programme_name', { ascending: true }),
      ]);
      if (projectsRes.data) setProjects(projectsRes.data);
      if (portfoliosRes.data) setPortfolios(portfoliosRes.data);
      if (programmesRes.data) setProgrammes(programmesRes.data);
      if (projectsRes.error) throw projectsRes.error;
      if (portfoliosRes.error) throw portfoliosRes.error;
      if (programmesRes.error) throw programmesRes.error;
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Validate source and target are different
      if (formData.source_project_id === formData.target_project_id) {
        alert('Source and target projects must be different');
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
        source_project_id: formData.source_project_id || null,
        target_project_id: formData.target_project_id || null,
        lag_days: formData.lag_days ? parseInt(formData.lag_days) : 0,
        lead_days: formData.lead_days ? parseInt(formData.lead_days) : 0,
        expected_impact_days: formData.expected_impact_days ? parseInt(formData.expected_impact_days) : null,
        probability_of_failure: formData.probability_of_failure ? parseFloat(formData.probability_of_failure) : null,
        resolution_status: formData.resolution_status || null,
      };

      await saveInterProjectDependency(submitData, dependency?.id);
      onSave();
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

  const formContent = (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <Link2 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {dependency ? 'Edit Inter-Project Dependency' : 'Create Inter-Project Dependency'}
            </h2>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
              Basic Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Dependency Code *
                </label>
                <input
                  type="text"
                  name="dependency_code"
                  value={formData.dependency_code}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., DEP-001"
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
                  Source Project (Provides) *
                </label>
                <select
                  name="source_project_id"
                  value={formData.source_project_id}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select Source Project</option>
                  {projects.map(project => (
                    <option key={project.id} value={project.id}>
                      {project.project_name} {project.project_code ? `(${project.project_code})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Target Project (Depends On) *
                </label>
                <select
                  name="target_project_id"
                  value={formData.target_project_id}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select Target Project</option>
                  {projects.filter(p => p.id !== formData.source_project_id).map(project => (
                    <option key={project.id} value={project.id}>
                      {project.project_name} {project.project_code ? `(${project.project_code})` : ''}
                    </option>
                  ))}
                </select>
              </div>
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
                <select
                  name="portfolio_id"
                  value={formData.portfolio_id}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">None</option>
                  {portfolios.map(portfolio => (
                    <option key={portfolio.id} value={portfolio.id}>
                      {portfolio.portfolio_name} {portfolio.portfolio_code ? `(${portfolio.portfolio_code})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Programme
                </label>
                <select
                  name="programme_id"
                  value={formData.programme_id}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">None</option>
                  {programmes.map(programme => (
                    <option key={programme.id} value={programme.id}>
                      {programme.programme_name} {programme.programme_code ? `(${programme.programme_code})` : ''}
                    </option>
                  ))}
                </select>
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Mitigation Plan
                </label>
                <textarea
                  name="mitigation_plan"
                  value={formData.mitigation_plan}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Describe mitigation plan..."
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

          {/* Form Actions */}
          <div className="flex justify-end gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || circularCheck || formData.source_project_id === formData.target_project_id}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : dependency ? 'Update Dependency' : 'Create Dependency'}
            </button>
          </div>
        </form>
      </div>
  );

  if (usePageLayout) {
    return <div className="bg-gray-800 dark:bg-gray-900 rounded-lg border border-gray-700">{formContent}</div>;
  }
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      {formContent}
    </div>
  );
}


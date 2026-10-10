/**
 * Lesson Form Component
 * Add/edit lesson form
 */

import { useState, useEffect } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';
import MultiLineListInput from '@nidus/ui/MultiLineListInput';
import LessonScopeSelector from './LessonScopeSelector';
import LessonCategorySelector from './LessonCategorySelector';
import LessonPrioritySelector from './LessonPrioritySelector'
import LessonCompletenessIndicator from './LessonCompletenessIndicator'
import { validateLesson, getValidationWarnings } from '@nidus/shared/utils/lessonValidation';
import { enableAutoSave, clearDraft, promptRecoverDraft } from '@nidus/shared/utils/lessonAutoSave';
import { platformDb } from '@nidus/supabase';
import DetailAuditTabList from '@nidus/ui/DetailAuditTabList';
import AuditDetailsPanel from '@nidus/ui/AuditDetailsPanel';
import AuditCard from '@nidus/ui/AuditCard';
import AuditField from '@nidus/ui/AuditField';
import AuditTimestampPair from '@nidus/ui/AuditTimestampPair';
import { humanizeAuditToken, resolveAuditUserLabels } from '@nidus/shared/utils/auditDisplayUtils';

const CATEGORIES = [
  'process', 'technical', 'resource', 'communication', 
  'stakeholder', 'quality', 'schedule', 'cost', 'risk', 
  'procurement', 'other'
];

const SCOPES = [
  { value: 'project', label: 'Project Only' },
  { value: 'corporate', label: 'Corporate' },
  { value: 'programme', label: 'Programme' },
  { value: 'both_project_corporate', label: 'Project & Corporate' },
  { value: 'both_project_programme', label: 'Project & Programme' }
];

const EFFECT_TYPES = [
  { value: 'positive', label: 'Positive' },
  { value: 'negative', label: 'Negative' },
  { value: 'neutral', label: 'Neutral' }
];

const PRIORITIES = ['low', 'medium', 'high', 'critical'];

const LESSON_TABS = [
  { value: 'details', label: 'Details' },
  { value: 'what-happened', label: 'What happened' },
  { value: 'effect', label: 'Effect' },
  { value: 'root-cause', label: 'Root cause' },
  { value: 'early-warning', label: 'Early warning signs' },
  { value: 'recommendations', label: 'Recommendations' },
  { value: 'audit', label: 'Audit details' },
];

function tagsToText(tags) {
  if (Array.isArray(tags)) return tags.filter(Boolean).join('\n');
  return typeof tags === 'string' ? tags : '';
}

function textToTags(text) {
  return String(text || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

function LessonListField({ id, label, required, value, onChange, placeholder, error, itemColumnLabel = 'Item' }) {
  return (
    <div>
      <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label} {required ? <span className="text-red-500">*</span> : null}
      </span>
      <MultiLineListInput
        id={id}
        viewModeId={`lesson-${id}`}
        value={value || ''}
        onChange={onChange}
        placeholder={placeholder}
        itemColumnLabel={itemColumnLabel}
        ariaLabelPrefix={label}
      />
      {error ? <p className="mt-1 text-sm text-red-600">{error}</p> : null}
    </div>
  );
}

export default function LessonForm({ lesson, onSave, onCancel, projectId }) {
  const [formData, setFormData] = useState({
    lesson_title: '',
    lesson_scope: 'project',
    lesson_category: '',
    effect_type: 'neutral',
    priority: 'medium',
    what_happened: '',
    why_it_happened: '',
    impact_description: '',
    early_warning_indicators: '',
    recommendations: '',
    was_identified_risk: false,
    linked_risk_id: null,
    related_product_id: null,
    related_product_name: '',
    project_stage: '',
    tags: [],
    lesson_date: new Date().toISOString().split('T')[0]
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [formTab, setFormTab] = useState('details');
  const [auditUserLabels, setAuditUserLabels] = useState({});
  const [autoSaveStatus, setAutoSaveStatus] = useState(null);
  const [autoSaveCleanup, setAutoSaveCleanup] = useState(null);
  const [warnings, setWarnings] = useState([]);

  useEffect(() => {
    if (formTab !== 'audit' || !lesson) return;
    (async () => {
      const labels = await resolveAuditUserLabels(platformDb, [lesson.created_by, lesson.updated_by]);
      setAuditUserLabels(labels);
    })();
  }, [formTab, lesson]);

  useEffect(() => {
    if (lesson) {
      setFormData({
        lesson_title: lesson.lesson_title || '',
        lesson_scope: lesson.lesson_scope || 'project',
        lesson_category: lesson.lesson_category || '',
        effect_type: lesson.effect_type || 'neutral',
        priority: lesson.priority || 'medium',
        what_happened: lesson.what_happened || lesson.event_description || '',
        why_it_happened: lesson.why_it_happened || lesson.cause_description || '',
        impact_description: lesson.impact_description || '',
        early_warning_indicators: lesson.early_warning_indicators || '',
        recommendations: lesson.recommendations || '',
        was_identified_risk: lesson.was_identified_risk || false,
        linked_risk_id: lesson.linked_risk_id || null,
        related_product_id: lesson.related_product_id || null,
        related_product_name: lesson.related_product_name || '',
        project_stage: lesson.project_stage || lesson.project_phase || '',
        tags: lesson.tags || [],
        lesson_date: lesson.lesson_date || new Date().toISOString().split('T')[0]
      });
    }
  }, [lesson]);

  useEffect(() => {
    if (!projectId) return undefined;
    const cleanup = enableAutoSave(lesson?.id || null, projectId, formData, (status) => {
      setAutoSaveStatus(status);
    });
    setAutoSaveCleanup(() => cleanup);
    return cleanup;
  }, [lesson?.id, projectId, formData]);

  useEffect(() => {
    if (lesson || !projectId) return;
    promptRecoverDraft(null, projectId, (draft) => {
      if (!draft || typeof draft !== 'object') return;
      setFormData((prev) => ({
        ...prev,
        lesson_title: draft.lesson_title ?? prev.lesson_title,
        lesson_scope: draft.lesson_scope ?? prev.lesson_scope,
        lesson_category: draft.lesson_category ?? prev.lesson_category,
        effect_type: draft.effect_type ?? prev.effect_type,
        priority: draft.priority ?? prev.priority,
        what_happened: draft.what_happened ?? prev.what_happened,
        why_it_happened: draft.why_it_happened ?? prev.why_it_happened,
        impact_description: draft.impact_description ?? prev.impact_description,
        early_warning_indicators: draft.early_warning_indicators ?? prev.early_warning_indicators,
        recommendations: draft.recommendations ?? prev.recommendations,
        was_identified_risk: draft.was_identified_risk ?? prev.was_identified_risk,
        linked_risk_id: draft.linked_risk_id ?? prev.linked_risk_id,
        related_product_id: draft.related_product_id ?? prev.related_product_id,
        related_product_name: draft.related_product_name ?? prev.related_product_name,
        project_stage: draft.project_stage ?? prev.project_stage,
        tags: Array.isArray(draft.tags) ? draft.tags : prev.tags,
        lesson_date: draft.lesson_date ?? prev.lesson_date,
      }));
    });
  }, [lesson, projectId]);

  useEffect(() => {
    // Get validation warnings
    if (formData) {
      const validationWarnings = getValidationWarnings({
        ...formData,
        effect_description: formData.impact_description,
        event_description: formData.what_happened
      })
      setWarnings(validationWarnings)
    }
  }, [formData])

  const validate = () => {
    const validation = validateLesson({
      ...formData,
      title: formData.lesson_title,
      event_description: formData.what_happened,
      effect_description: formData.impact_description,
      category: formData.lesson_category
    })

    setErrors(validation.errors)
    if (!validation.valid) {
      if (validation.errors.event_description) setFormTab('what-happened')
      else if (validation.errors.effect_description) setFormTab('effect')
      else if (validation.errors.recommendations) setFormTab('recommendations')
      else setFormTab('details')
    }
    return validation.valid
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validate()) {
      return;
    }

    setSaving(true);
    try {
      const lessonData = {
        ...formData,
        project_id: projectId,
        event_description: formData.what_happened,
        cause_description: formData.why_it_happened
      };
      
      await onSave(lessonData);
      
      // Clear draft after successful save
      clearDraft(lesson?.id || null, projectId);
      
      // Cleanup auto-save
      if (autoSaveCleanup) {
        autoSaveCleanup();
      }
    } catch (error) {
      console.error('Error saving lesson:', error);
      alert('Error saving lesson: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <DetailAuditTabList activeTab={formTab} onChange={setFormTab} tabs={LESSON_TABS} ariaLabel="Lesson sections" />

      {formTab === 'audit' ? (
        !lesson ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">Audit details appear after this lesson is saved.</p>
        ) : (
          <AuditDetailsPanel description="Who logged or changed this lesson, and how it is classified.">
            <AuditCard title="Identity" description="How this lesson is labelled and tracked.">
              <AuditField label="Reference" value={lesson.lesson_reference} />
              <AuditField label="Title" value={lesson.lesson_title || lesson.title} />
              <AuditField label="Status" value={humanizeAuditToken(lesson.status)} />
            </AuditCard>
            <AuditCard title="Classification" description="How this lesson is categorised.">
              <AuditField label="Category" value={humanizeAuditToken(lesson.lesson_category || lesson.category)} />
              <AuditField label="Scope" value={humanizeAuditToken(lesson.lesson_scope)} />
              <AuditField label="Priority" value={humanizeAuditToken(lesson.priority)} />
            </AuditCard>
            <AuditCard title="Record history" description="When this lesson was created and last changed.">
              <AuditField label="Created by" value={lesson.created_by ? auditUserLabels[lesson.created_by] || null : null} />
              <AuditTimestampPair dateLabel="Created at" value={lesson.created_at} />
              <AuditField label="Updated by" value={lesson.updated_by ? auditUserLabels[lesson.updated_by] || null : null} />
              <AuditTimestampPair dateLabel="Last updated" value={lesson.updated_at} />
            </AuditCard>
          </AuditDetailsPanel>
        )
      ) : (
      <>
      {/* Auto-save Status */}
      {autoSaveStatus && (
        <div className={`text-xs px-3 py-1 rounded ${
          autoSaveStatus.saved
            ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
            : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
        }`}>
          {autoSaveStatus.saved
            ? `✓ Draft saved ${autoSaveStatus.timestamp ? new Date(autoSaveStatus.timestamp).toLocaleTimeString() : ''}`
            : `✗ Save failed: ${autoSaveStatus.error || 'Unknown error'}`}
        </div>
      )}

      {/* Completeness Indicator */}
      {lesson && (
        <LessonCompletenessIndicator lesson={formData} showWarnings={true} />
      )}

      {/* Validation Warnings */}
      {formTab === 'details' && warnings.length > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-medium text-yellow-800 dark:text-yellow-200 mb-2">Validation Warnings</h4>
              <ul className="list-disc list-inside text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
                {warnings.map((warning, index) => (
                  <li key={index}>{warning.message}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {formTab === 'details' && (<>
      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Lesson Title <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={formData.lesson_title}
          onChange={(e) => setFormData({ ...formData, lesson_title: e.target.value })}
          className={`w-full px-3 py-2 border rounded-md ${errors.lesson_title ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} dark:bg-gray-700 dark:text-white`}
          placeholder="Brief summary of the lesson"
        />
        {errors.lesson_title && (
          <p className="mt-1 text-sm text-red-600">{errors.lesson_title}</p>
        )}
      </div>

      {/* Scope, Category, Effect, Priority */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Scope <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.lesson_scope}
            onChange={(e) => setFormData({ ...formData, lesson_scope: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
          >
            {SCOPES.map(scope => (
              <option key={scope.value} value={scope.value}>{scope.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Category <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.lesson_category}
            onChange={(e) => setFormData({ ...formData, lesson_category: e.target.value })}
            className={`w-full px-3 py-2 border rounded-md ${errors.lesson_category ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} dark:bg-gray-700 dark:text-white`}
          >
            <option value="">Select category</option>
            {CATEGORIES.map(cat => (
              <option key={cat} value={cat}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </option>
            ))}
          </select>
          {errors.lesson_category && (
            <p className="mt-1 text-sm text-red-600">{errors.lesson_category}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Effect Type <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.effect_type}
            onChange={(e) => setFormData({ ...formData, effect_type: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
          >
            {EFFECT_TYPES.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Priority <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.priority}
            onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
          >
            {PRIORITIES.map(priority => (
              <option key={priority} value={priority}>
                {priority.charAt(0).toUpperCase() + priority.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>
      </>)}

      {formTab === 'what-happened' && (
        <LessonListField
          id="what-happened"
          label="What Happened (Event)"
          required
          value={formData.what_happened}
          onChange={(what_happened) => setFormData({ ...formData, what_happened })}
          placeholder="Describe what happened..."
          itemColumnLabel="Event"
          error={errors.event_description || errors.what_happened}
        />
      )}
      {formTab === 'effect' && (
        <LessonListField
          id="effect"
          label="What was the Effect?"
          required
          value={formData.impact_description}
          onChange={(impact_description) => setFormData({ ...formData, impact_description })}
          placeholder="Describe the impact (positive/negative, financial, schedule, quality, etc.)..."
          itemColumnLabel="Effect"
          error={errors.effect_description || errors.impact_description}
        />
      )}
      {formTab === 'root-cause' && (
        <LessonListField
          id="root-cause"
          label="What Caused This? (Root Cause)"
          value={formData.why_it_happened}
          onChange={(why_it_happened) => setFormData({ ...formData, why_it_happened })}
          placeholder="Explain the root cause or trigger..."
          itemColumnLabel="Cause"
        />
      )}
      {formTab === 'early-warning' && (
        <LessonListField
          id="early-warning"
          label="Were There Early Warning Signs?"
          value={formData.early_warning_indicators}
          onChange={(early_warning_indicators) => setFormData({ ...formData, early_warning_indicators })}
          placeholder="Describe any early warning indicators that were present..."
          itemColumnLabel="Warning sign"
        />
      )}
      {formTab === 'recommendations' && (
        <LessonListField
          id="recommendations"
          label="Recommendations for Future"
          required
          value={formData.recommendations}
          onChange={(recommendations) => setFormData({ ...formData, recommendations })}
          placeholder="What should be done differently in the future?"
          itemColumnLabel="Recommendation"
          error={errors.recommendations}
        />
      )}

      {formTab === 'details' && (<>
      {/* Risk Linkage */}
      <div className="border-t pt-4">
        <label className="flex items-center gap-2 mb-2">
          <input
            type="checkbox"
            checked={formData.was_identified_risk}
            onChange={(e) => setFormData({ ...formData, was_identified_risk: e.target.checked })}
            className="rounded"
          />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Was this previously identified as a risk?
          </span>
        </label>
        {formData.was_identified_risk && (
          <input
            type="text"
            placeholder="Link to risk ID (optional)"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white mt-2"
            value={formData.linked_risk_id || ''}
            onChange={(e) => setFormData({ ...formData, linked_risk_id: e.target.value || null })}
          />
        )}
      </div>

      <LessonListField
        id="related-product"
        label="Related Product"
        value={formData.related_product_name}
        onChange={(related_product_name) => setFormData({ ...formData, related_product_name })}
        placeholder="Product name (if applicable)"
        itemColumnLabel="Product"
      />

      <LessonListField
        id="tags"
        label="Tags"
        value={tagsToText(formData.tags)}
        onChange={(text) => setFormData({ ...formData, tags: textToTags(text) })}
        placeholder="Add tags for searchability..."
        itemColumnLabel="Tag"
      />

      {/* Date */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Lesson Date
        </label>
        <input
          type="date"
          value={formData.lesson_date}
          onChange={(e) => setFormData({ ...formData, lesson_date: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
        />
      </div>
      </>)}

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : lesson ? 'Update Lesson' : 'Save Lesson'}
        </button>
      </div>
      </>
      )}
    </form>
  );
}

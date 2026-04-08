/**
 * Lesson Form Component
 * Add/edit lesson form
 */

import { useState, useEffect } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';
import TagInput from '../dailyLog/TagInput';
import LessonScopeSelector from './LessonScopeSelector';
import LessonCategorySelector from './LessonCategorySelector';
import LessonPrioritySelector from './LessonPrioritySelector'
import LessonCompletenessIndicator from './LessonCompletenessIndicator'
import { validateLesson, getValidationWarnings } from '../../utils/lessonValidation';
import { enableAutoSave, clearDraft, promptRecoverDraft } from '../../utils/lessonAutoSave';

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

  const [warnings, setWarnings] = useState([])

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
      {warnings.length > 0 && (
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

      {/* What Happened */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          What Happened (Event) <span className="text-red-500">*</span>
        </label>
        <textarea
          value={formData.what_happened}
          onChange={(e) => setFormData({ ...formData, what_happened: e.target.value })}
          rows={4}
          className={`w-full px-3 py-2 border rounded-md ${errors.what_happened ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} dark:bg-gray-700 dark:text-white`}
          placeholder="Describe what happened..."
        />
        {errors.what_happened && (
          <p className="mt-1 text-sm text-red-600">{errors.what_happened}</p>
        )}
      </div>

      {/* Effect Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          What was the Effect? <span className="text-red-500">*</span>
        </label>
        <textarea
          value={formData.impact_description}
          onChange={(e) => setFormData({ ...formData, impact_description: e.target.value })}
          rows={3}
          className={`w-full px-3 py-2 border rounded-md ${errors.impact_description ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} dark:bg-gray-700 dark:text-white`}
          placeholder="Describe the impact (positive/negative, financial, schedule, quality, etc.)..."
        />
        {errors.impact_description && (
          <p className="mt-1 text-sm text-red-600">{errors.impact_description}</p>
        )}
      </div>

      {/* Root Cause */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          What Caused This? (Root Cause)
        </label>
        <textarea
          value={formData.why_it_happened}
          onChange={(e) => setFormData({ ...formData, why_it_happened: e.target.value })}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
          placeholder="Explain the root cause or trigger..."
        />
      </div>

      {/* Early Warning Indicators */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Were There Early Warning Signs?
        </label>
        <textarea
          value={formData.early_warning_indicators}
          onChange={(e) => setFormData({ ...formData, early_warning_indicators: e.target.value })}
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
          placeholder="Describe any early warning indicators that were present..."
        />
      </div>

      {/* Recommendations */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Recommendations for Future <span className="text-red-500">*</span>
        </label>
        <textarea
          value={formData.recommendations}
          onChange={(e) => setFormData({ ...formData, recommendations: e.target.value })}
          rows={4}
          className={`w-full px-3 py-2 border rounded-md ${errors.recommendations ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} dark:bg-gray-700 dark:text-white`}
          placeholder="What should be done differently in the future?"
        />
        {errors.recommendations && (
          <p className="mt-1 text-sm text-red-600">{errors.recommendations}</p>
        )}
      </div>

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

      {/* Product Link */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Related Product
        </label>
        <input
          type="text"
          value={formData.related_product_name}
          onChange={(e) => setFormData({ ...formData, related_product_name: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
          placeholder="Product name (if applicable)"
        />
      </div>

      {/* Tags */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Tags
        </label>
        <TagInput
          tags={formData.tags}
          onChange={(tags) => setFormData({ ...formData, tags })}
          placeholder="Add tags for searchability..."
        />
      </div>

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
    </form>
  );
}

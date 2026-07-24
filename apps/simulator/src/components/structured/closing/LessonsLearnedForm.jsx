import { useState } from 'react';
import { supabase } from '../../../services/supabaseClient';
import { X, Lightbulb, FileText } from 'lucide-react';
import { createLessonLearned, updateLessonLearned } from '../../../services/closingProjectService';

export default function LessonsLearnedForm({ projectId, lesson, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    lesson_title: lesson?.lesson_title || '',
    lesson_type: lesson?.lesson_type || 'positive',
    lesson_category: lesson?.lesson_category || 'general',
    lesson_description: lesson?.lesson_description || '',
    context: lesson?.context || '',
    recommendations: lesson?.recommendations || '',
    applicability: lesson?.applicability || 'project-specific'
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const lessonData = {
        project_id: projectId,
        lesson_title: formData.lesson_title,
        lesson_type: formData.lesson_type,
        lesson_category: formData.lesson_category,
        lesson_description: formData.lesson_description,
        context: formData.context,
        recommendations: formData.recommendations,
        applicability: formData.applicability
      };

      if (lesson) {
        lessonData.updated_by = user.id;
        await updateLessonLearned(lesson.id, lessonData);
      } else {
        lessonData.created_by = user.id;
        await createLessonLearned(lessonData);
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving lesson learned:', error);
      alert('Error saving lesson learned: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {lesson ? 'Edit Lesson Learned' : 'Add Lesson Learned'}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Capture key learnings for future projects
            </p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Lesson Title *</label>
            <input
              type="text"
              value={formData.lesson_title}
              onChange={(e) => setFormData({ ...formData, lesson_title: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="Brief title summarizing the lesson..."
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Lesson Type *</label>
              <select
                value={formData.lesson_type}
                onChange={(e) => setFormData({ ...formData, lesson_type: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                required
              >
                <option value="positive">Positive (What went well)</option>
                <option value="negative">Negative (What went wrong)</option>
                <option value="improvement">Improvement Opportunity</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Category *</label>
              <select
                value={formData.lesson_category}
                onChange={(e) => setFormData({ ...formData, lesson_category: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                required
              >
                <option value="general">General</option>
                <option value="planning">Planning</option>
                <option value="execution">Execution</option>
                <option value="team">Team Management</option>
                <option value="stakeholders">Stakeholder Management</option>
                <option value="risk">Risk Management</option>
                <option value="quality">Quality Management</option>
                <option value="technical">Technical</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Applicability *</label>
              <select
                value={formData.applicability}
                onChange={(e) => setFormData({ ...formData, applicability: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                required
              >
                <option value="project-specific">Project Specific</option>
                <option value="organizational">Organizational</option>
                <option value="industry-wide">Industry Wide</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Lesson Description *</label>
            <textarea
              value={formData.lesson_description}
              onChange={(e) => setFormData({ ...formData, lesson_description: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="Describe the lesson learned in detail..."
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Context</label>
            <textarea
              value={formData.context}
              onChange={(e) => setFormData({ ...formData, context: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="Provide context about when/where this occurred..."
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Recommendations</label>
            <textarea
              value={formData.recommendations}
              onChange={(e) => setFormData({ ...formData, recommendations: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="How should this lesson be applied in future projects?"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 font-medium"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? 'Saving...' : lesson ? 'Update Lesson' : 'Add Lesson'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

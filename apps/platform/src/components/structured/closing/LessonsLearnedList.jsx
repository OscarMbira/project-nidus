import { useState } from 'react';
import { Lightbulb, Edit2, Trash2, Plus, ThumbsUp, ThumbsDown, TrendingUp } from 'lucide-react';
import { deleteLessonLearned } from '../../../services/closingProjectService';

export default function LessonsLearnedList({ lessons, onEdit, onRefresh, onAdd }) {
  const [deleting, setDeleting] = useState(null);

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this lesson?')) {
      return;
    }

    try {
      setDeleting(id);
      await deleteLessonLearned(id);
      onRefresh();
    } catch (error) {
      console.error('Error deleting lesson:', error);
      alert('Error deleting lesson: ' + error.message);
    } finally {
      setDeleting(null);
    }
  };

  const getTypeIcon = (type) => {
    const icons = {
      positive: ThumbsUp,
      negative: ThumbsDown,
      improvement: TrendingUp
    };
    return icons[type] || Lightbulb;
  };

  const getTypeColor = (type) => {
    const colors = {
      positive: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      negative: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
      improvement: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
    };
    return colors[type] || colors.positive;
  };

  if (!lessons || lessons.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
        <Lightbulb className="h-16 w-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          No Lessons Learned Yet
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Capture valuable insights and learnings from this project
        </p>
        <button
          onClick={onAdd}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium inline-flex items-center gap-2"
        >
          <Plus className="h-5 w-5" />
          Add Lesson Learned
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Lessons Learned
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {lessons.length} {lessons.length === 1 ? 'lesson' : 'lessons'} documented
          </p>
        </div>
        <button
          onClick={onAdd}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium inline-flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Lesson
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {lessons.map((lesson) => {
          const TypeIcon = getTypeIcon(lesson.lesson_type);
          return (
            <div
              key={lesson.id}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-start gap-4 mb-3">
                    <div className={`p-3 rounded-lg ${getTypeColor(lesson.lesson_type)}`}>
                      <TypeIcon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {lesson.lesson_title}
                        </h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getTypeColor(lesson.lesson_type)}`}>
                          {lesson.lesson_type}
                        </span>
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300 capitalize">
                          {lesson.lesson_category}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3 mb-3">
                        {lesson.lesson_description}
                      </p>
                      {lesson.recommendations && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                          <p className="text-xs font-semibold text-blue-900 dark:text-blue-300 mb-1">
                            Recommendations:
                          </p>
                          <p className="text-sm text-blue-800 dark:text-blue-400 line-clamp-2">
                            {lesson.recommendations}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => onEdit(lesson)}
                    className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                    title="Edit lesson"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(lesson.id)}
                    className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                    disabled={deleting === lesson.id}
                    title="Delete lesson"
                  >
                    {deleting === lesson.id ? (
                      <div className="animate-spin h-4 w-4 border-2 border-red-600 border-t-transparent rounded-full"></div>
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

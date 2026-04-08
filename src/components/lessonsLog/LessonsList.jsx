/**
 * Lessons List Component
 * List of lessons with filters
 */

import { useState } from 'react';
import { Lightbulb, AlertCircle } from 'lucide-react';
import LessonCard from './LessonCard';

export default function LessonsList({ 
  lessons = [], 
  loading = false, 
  onEdit, 
  onDelete, 
  onPromote,
  emptyMessage = 'No lessons found'
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!lessons || lessons.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
        <Lightbulb className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500 dark:text-gray-400">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {lessons.map((lesson) => (
        <LessonCard
          key={lesson.id}
          lesson={lesson}
          onEdit={onEdit}
          onDelete={onDelete}
          onPromote={onPromote}
        />
      ))}
    </div>
  );
}

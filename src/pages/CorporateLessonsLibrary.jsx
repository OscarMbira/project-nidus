/**
 * Corporate Lessons Library Page
 * Browse all corporate lessons
 */

import { useState, useEffect } from 'react';
import { Building2, Search, Star, Eye } from 'lucide-react';
import { getCorporateLessonsByCategory, searchCorporateLessons } from '../services/corporateLessonsService';
import { platformDb } from '../services/supabase/supabaseClient';
import LessonCard from '../components/lessonsLog/LessonCard';

import { getDisplayRowNumber } from '../utils/tableRowNumberUtils'
export default function CorporateLessonsLibrary() {
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [organisationId, setOrganisationId] = useState(null);

  useEffect(() => {
    const fetchOrganisation = async () => {
      try {
        const { data: { user } } = await platformDb.auth.getUser();
        if (user) {
          const { data: userRecord } = await platformDb
            .from('users')
            .select('id')
            .eq('auth_user_id', user.id)
            .eq('is_deleted', false)
            .single();

          if (userRecord) {
            // Get user's projects to find organisation
            const { data: projects } = await platformDb
              .from('user_projects')
              .select('project:project_id(account_id)')
              .eq('user_id', userRecord.id)
              .eq('is_deleted', false)
              .limit(1)
              .single();

            if (projects?.project?.account_id) {
              setOrganisationId(projects.project.account_id);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching organisation:', error);
      }
    };
    fetchOrganisation();
  }, []);

  useEffect(() => {
    if (organisationId) {
      fetchLessons();
    }
  }, [organisationId, searchTerm]);

  const fetchLessons = async () => {
    try {
      setLoading(true);
      let result;
      if (searchTerm) {
        result = await searchCorporateLessons(organisationId, searchTerm);
      } else {
        result = await getCorporateLessonsByCategory(organisationId, {});
      }

      if (result.success) {
        // Transform corporate lessons to lesson format for LessonCard
        const transformedLessons = result.data.map(cl => ({
          ...cl.lesson,
          is_corporate_lesson: true,
          corporate_metadata: {
            usefulness_rating: cl.usefulness_rating,
            view_count: cl.view_count,
            promoted_date: cl.promoted_date
          }
        }));
        setLessons(transformedLessons);
      }
    } catch (error) {
      console.error('Error fetching corporate lessons:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Building2 className="w-6 h-6" />
            Corporate Lessons Library
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Lessons learned across all projects in your organization
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search corporate lessons..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500">Total Lessons</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{lessons.length}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 flex items-center gap-1">
            <Star className="w-4 h-4" />
            Avg Rating
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {lessons.length > 0
              ? (lessons.reduce((sum, l) => sum + (l.corporate_metadata?.usefulness_rating || 0), 0) / lessons.length).toFixed(1)
              : '0.0'}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 flex items-center gap-1">
            <Eye className="w-4 h-4" />
            Total Views
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {lessons.reduce((sum, l) => sum + (l.corporate_metadata?.view_count || 0), 0)}
          </p>
        </div>
      </div>

      {/* Lessons List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="space-y-4">
          {lessons.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No corporate lessons found</p>
            </div>
          ) : (
            lessons.map((lesson, index) => (
              <LessonCard key={lesson.id} lesson={lesson} />
            ))
          )}
        </div>
      )}
    </div>
  );
}

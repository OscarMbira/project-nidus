/**
 * Full-page create / edit lesson (non-modal)
 */

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { usePlatformProjectId } from '@nidus/shared/hooks/usePlatformProjectId.js'
import { platformProjectPath } from '@nidus/shared/utils/projectRouteParam.js'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import LessonForm from '../components/lessonsLog/LessonForm'
import { getLessonById, createLesson, updateLesson } from '../services/lessonService'

export default function LessonFormPage() {
  const { lessonId } = useParams()
  const { projectId, routeKey } = usePlatformProjectId()
  const navigate = useNavigate()
  const isEdit = Boolean(lessonId)
  const { showSuccess, modal: successModal } = useSuccessModal()

  const [lesson, setLesson] = useState(null)
  const [loading, setLoading] = useState(isEdit)

  useEffect(() => {
    if (!isEdit || !lessonId) return
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        const result = await getLessonById(lessonId, projectId)
        if (cancelled) return
        if (result.success) {
          setLesson(result.data)
          if (result.data?.lesson_reference && result.data.lesson_reference !== lessonId) {
            navigate(
              platformProjectPath(routeKey, 'lessons', result.data.lesson_reference, 'edit'),
              { replace: true }
            )
          }
        } else {
          alert('Error loading lesson: ' + result.error)
          navigate(platformProjectPath(routeKey, 'lessons'))
        }
      } catch (error) {
        console.error('Error fetching lesson:', error)
        alert('Error loading lesson: ' + error.message)
        navigate(platformProjectPath(routeKey, 'lessons'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [isEdit, lessonId, projectId, routeKey, navigate])

  const goToLog = () => navigate(platformProjectPath(routeKey, 'lessons'))

  const handleSave = async (lessonData) => {
    const result = isEdit && lesson?.id
      ? await updateLesson(lesson.id, lessonData)
      : await createLesson(lessonData)

    if (!result.success) {
      alert('Error saving lesson: ' + result.error)
      throw new Error(result.error)
    }

    const saved = result.data
    const ref = saved?.lesson_reference || saved?.id
    showSuccess({
      recordId: ref,
      operation: isEdit ? 'updated' : 'created',
      message: isEdit ? 'Lesson updated successfully.' : 'Lesson created successfully.',
      onOk: () => navigate(platformProjectPath(routeKey, 'lessons', ref)),
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <div className="w-full px-3 sm:px-4 lg:px-5 xl:px-6 py-6">
      <div className="w-full max-w-4xl mx-auto space-y-4">
        <button
          type="button"
          onClick={goToLog}
          className="inline-flex items-center gap-1.5 px-2 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          aria-label="Back to Lessons Log"
        >
          <ArrowLeft className="w-5 h-5 shrink-0" aria-hidden />
          Back to Lessons Log
        </button>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
          <div className="mb-4 border-b border-gray-200 dark:border-gray-700 pb-3">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              {isEdit ? 'Edit Lesson' : 'Add New Lesson'}
            </h1>
          </div>
          <LessonForm
            lesson={lesson}
            onSave={handleSave}
            onCancel={goToLog}
            projectId={projectId}
          />
        </div>
      </div>
      {successModal}
    </div>
  )
}

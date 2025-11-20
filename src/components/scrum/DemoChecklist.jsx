import { useState } from 'react'
import { CheckCircle, XCircle, Circle } from 'lucide-react'

export default function DemoChecklist({ sprintStories }) {
  const [demoStatus, setDemoStatus] = useState({})

  const handleToggleDemo = (storyId) => {
    setDemoStatus(prev => ({
      ...prev,
      [storyId]: prev[storyId] === 'demoed' ? 'not_demoed' : 'demoed'
    }))
  }

  if (!sprintStories || sprintStories.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Demo Checklist
        </h2>
        <p className="text-gray-500 dark:text-gray-400 text-center py-8">
          No stories in this sprint to demo.
        </p>
      </div>
    )
  }

  const demoedCount = Object.values(demoStatus).filter(status => status === 'demoed').length

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Demo Checklist
        </h2>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {demoedCount} / {sprintStories.length} demoed
        </div>
      </div>

      <div className="space-y-3">
        {sprintStories.map((sprintStory) => {
          const story = sprintStory.user_story
          if (!story) return null

          const isDemoed = demoStatus[story.id] === 'demoed'
          const isDone = sprintStory.status === 'done'

          return (
            <div
              key={story.id}
              className={`flex items-start gap-3 p-3 rounded-lg border ${
                isDemoed
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                  : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600'
              }`}
            >
              <button
                onClick={() => handleToggleDemo(story.id)}
                className="mt-1 flex-shrink-0"
              >
                {isDemoed ? (
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                ) : (
                  <Circle className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                )}
              </button>
              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      {story.story_title}
                    </h4>
                    {story.story_description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {story.story_description}
                      </p>
                    )}
                  </div>
                  {story.story_points && (
                    <span className="ml-2 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded text-xs font-medium">
                      {story.story_points} pts
                    </span>
                  )}
                </div>
                {story.acceptance_criteria && story.acceptance_criteria.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Acceptance Criteria:
                    </p>
                    <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                      {story.acceptance_criteria.map((criteria, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="mt-0.5">•</span>
                          <span>{criteria}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {!isDone && (
                  <div className="mt-2">
                    <span className="text-xs text-yellow-600 dark:text-yellow-400">
                      Story not yet completed
                    </span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}


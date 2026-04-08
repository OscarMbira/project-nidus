/**
 * Effectiveness Rating Component
 * Rate response action effectiveness
 */

import { useState } from 'react'
import { Star } from 'lucide-react'
import { assessEffectiveness } from '../../services/riskResponseService'

export default function EffectivenessRating({ responseId, rating: initialRating, readOnly = false, onRatingChange }) {
  const [rating, setRating] = useState(initialRating || 'not_assessed')
  const [saving, setSaving] = useState(false)

  const ratings = [
    { value: 'not_assessed', label: 'Not Assessed', color: 'text-gray-400', stars: 0 },
    { value: 'ineffective', label: 'Ineffective', color: 'text-red-500', stars: 1 },
    { value: 'partially_effective', label: 'Partially Effective', color: 'text-yellow-500', stars: 2 },
    { value: 'effective', label: 'Effective', color: 'text-green-500', stars: 3 },
    { value: 'highly_effective', label: 'Highly Effective', color: 'text-green-600', stars: 4 }
  ]

  const currentRating = ratings.find(r => r.value === rating) || ratings[0]

  const handleRatingChange = async (newRating) => {
    if (readOnly || newRating === rating) return

    setRating(newRating)
    if (onRatingChange) {
      onRatingChange(newRating)
    }

    if (responseId) {
      try {
        setSaving(true)
        const result = await assessEffectiveness(responseId, newRating)
        if (!result.success) {
          // Revert on error
          setRating(rating)
          alert('Error: ' + result.error)
        }
      } catch (error) {
        console.error('Error saving effectiveness rating:', error)
        setRating(rating)
      } finally {
        setSaving(false)
      }
    }
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-600 dark:text-gray-400">Effectiveness:</span>
      <div className="flex items-center gap-1">
        {ratings.slice(1).map((r) => (
          <button
            key={r.value}
            onClick={() => handleRatingChange(r.value)}
            disabled={readOnly || saving}
            className={`${
              readOnly ? 'cursor-default' : 'cursor-pointer hover:scale-110'
            } transition-transform disabled:opacity-50`}
          >
            <Star
              className={`h-5 w-5 ${
                r.stars <= currentRating.stars
                  ? `${r.color} fill-current`
                  : 'text-gray-300 dark:text-gray-600'
              }`}
            />
          </button>
        ))}
      </div>
      <span className={`text-sm font-medium ${currentRating.color}`}>
        {currentRating.label}
      </span>
    </div>
  )
}

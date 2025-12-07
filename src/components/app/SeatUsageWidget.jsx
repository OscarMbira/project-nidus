/**
 * Seat Usage Widget
 * Displays current seat usage and allows purchasing more seats
 */

import { useState } from 'react'
import { Users, AlertTriangle, Plus } from 'lucide-react'
import PurchaseExtraSeatsModal from './PurchaseExtraSeatsModal'

export default function SeatUsageWidget({ projectId, seatAllocation, onPurchase }) {
  const [showPurchaseModal, setShowPurchaseModal] = useState(false)

  if (!seatAllocation) return null

  const usagePercentage = seatAllocation.total_seats > 0
    ? Math.round((seatAllocation.current_user_count / seatAllocation.total_seats) * 100)
    : 0

  const isNearLimit = usagePercentage >= 80
  const isAtLimit = usagePercentage >= 100
  const availableSeats = seatAllocation.available_seats || 0

  const getStatusColor = () => {
    if (isAtLimit) return 'bg-red-500'
    if (isNearLimit) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  const getStatusText = () => {
    if (isAtLimit) return 'Limit Reached'
    if (isNearLimit) return 'Approaching Limit'
    return 'Healthy'
  }

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Users className="h-5 w-5 text-gray-600 dark:text-gray-400 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Seat Usage
            </h3>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-medium ${
              isAtLimit
                ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
                : isNearLimit
                ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200'
                : 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
            }`}
          >
            {getStatusText()}
          </span>
        </div>

        <div className="space-y-3">
          {/* Usage Bar */}
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-600 dark:text-gray-400">
                {seatAllocation.current_user_count} of {seatAllocation.total_seats} seats used
              </span>
              <span className="text-gray-900 dark:text-white font-medium">
                {usagePercentage}%
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all ${getStatusColor()}`}
                style={{ width: `${Math.min(usagePercentage, 100)}%` }}
              />
            </div>
          </div>

          {/* Details */}
          <div className="grid grid-cols-3 gap-4 pt-3 border-t border-gray-200 dark:border-gray-700">
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400">Included</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {seatAllocation.included_seats}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400">Extra Purchased</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {seatAllocation.extra_seats_purchased}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400">Available</p>
              <p
                className={`text-lg font-semibold ${
                  availableSeats === 0
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-gray-900 dark:text-white'
                }`}
              >
                {availableSeats}
              </p>
            </div>
          </div>

          {/* Warning */}
          {isNearLimit && (
            <div
              className={`mt-4 p-3 rounded-lg flex items-start ${
                isAtLimit
                  ? 'bg-red-50 dark:bg-red-900/20'
                  : 'bg-yellow-50 dark:bg-yellow-900/20'
              }`}
            >
              <AlertTriangle
                className={`h-5 w-5 mr-2 mt-0.5 ${
                  isAtLimit
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-yellow-600 dark:text-yellow-400'
                }`}
              />
              <div className="flex-1">
                <p
                  className={`text-sm font-medium ${
                    isAtLimit
                      ? 'text-red-800 dark:text-red-200'
                      : 'text-yellow-800 dark:text-yellow-200'
                  }`}
                >
                  {isAtLimit
                    ? 'You have reached your seat limit'
                    : 'You are approaching your seat limit'}
                </p>
                <p
                  className={`text-xs mt-1 ${
                    isAtLimit
                      ? 'text-red-700 dark:text-red-300'
                      : 'text-yellow-700 dark:text-yellow-300'
                  }`}
                >
                  {isAtLimit
                    ? 'Purchase additional seats to invite more team members.'
                    : 'Consider purchasing additional seats to avoid interruption.'}
                </p>
              </div>
            </div>
          )}

          {/* Purchase Button */}
          <button
            onClick={() => setShowPurchaseModal(true)}
            className="w-full mt-4 flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Purchase More Seats
          </button>
        </div>
      </div>

      {showPurchaseModal && (
        <PurchaseExtraSeatsModal
          projectId={projectId}
          isOpen={showPurchaseModal}
          onClose={() => setShowPurchaseModal(false)}
          currentAllocation={seatAllocation}
        />
      )}
    </>
  )
}


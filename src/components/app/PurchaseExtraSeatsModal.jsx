/**
 * Purchase Extra Seats Modal
 * Allows purchasing additional seats for a project
 */

import { useState, useEffect } from 'react'
import { X, Users, CreditCard, Loader, CheckCircle, AlertCircle } from 'lucide-react'
import { purchaseExtraSeats, getProjectSeatAllocation } from '../../services/seatManagementService'
import { useToast } from '../../hooks/useToast'

export default function PurchaseExtraSeatsModal({ projectId, isOpen, onClose, currentAllocation }) {
  const { showToast } = useToast()
  const [loading, setLoading] = useState(false)
  const [quantity, setQuantity] = useState(10)
  const [pricePerSeat, setPricePerSeat] = useState(0.80)
  const [discountRate, setDiscountRate] = useState(0.7)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (isOpen && currentAllocation) {
      // Get pricing from subscription (would normally come from subscription service)
      // For now, using defaults from plan
      setPricePerSeat(0.80)
      setDiscountRate(0.7)
    }
  }, [isOpen, currentAllocation])

  const calculatePrice = () => {
    const basePrice = pricePerSeat * quantity
    const discount = basePrice * (1 - discountRate)
    return {
      base: basePrice,
      discount: discount,
      total: basePrice - discount,
      perSeat: (basePrice - discount) / quantity,
    }
  }

  const handlePurchase = async () => {
    setError(null)
    setLoading(true)

    try {
      // In a real implementation, this would redirect to Paynow checkout
      // For now, we'll create a pending purchase record
      const price = calculatePrice()
      
      const result = await purchaseExtraSeats(projectId, quantity, {
        currency: 'USD',
        provider: 'paynow',
        status: 'pending', // Will be updated when payment is confirmed
        reference: `SEAT-${Date.now()}`,
      })

      if (result.success) {
        showToast('success', 'Purchase initiated. Redirecting to payment...')
        
        // TODO: Redirect to Paynow checkout
        // For now, just close modal
        onClose()
        
        // In production:
        // window.location.href = `/checkout/extra-seats/${result.data.id}`
      } else {
        setError(result.error || 'Failed to initiate purchase')
      }
    } catch (error) {
      console.error('Error purchasing seats:', error)
      setError(error.message || 'Failed to purchase seats')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const price = calculatePrice()

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />
        <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Purchase Extra Seats</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Current Status */}
          {currentAllocation && (
            <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Current: {currentAllocation.current_user_count} / {currentAllocation.total_seats} seats
              </p>
            </div>
          )}

          {/* Quantity Selector */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Number of Seats
            </label>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 5))}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                -5
              </button>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              />
              <button
                onClick={() => setQuantity(quantity + 5)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                +5
              </button>
            </div>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Recommended: 10, 20, or 50 seats
            </p>
          </div>

          {/* Pricing */}
          <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Base Price:</span>
              <span className="text-gray-900 dark:text-white">
                ${price.base.toFixed(2)} ({quantity} × ${pricePerSeat.toFixed(2)})
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Discount ({Math.round((1 - discountRate) * 100)}%):</span>
              <span className="text-green-600 dark:text-green-400">
                -${price.discount.toFixed(2)}
              </span>
            </div>
            <div className="pt-2 border-t border-gray-200 dark:border-gray-600 flex justify-between">
              <span className="font-semibold text-gray-900 dark:text-white">Total:</span>
              <span className="font-bold text-lg text-blue-600 dark:text-blue-400">
                ${price.total.toFixed(2)}/month
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              ${price.perSeat.toFixed(2)} per seat per month
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-md bg-red-50 dark:bg-red-900/20 p-4">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-red-400" />
                <div className="ml-3">
                  <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              Cancel
            </button>
            <button
              onClick={handlePurchase}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {loading ? (
                <>
                  <Loader className="h-4 w-4 animate-spin mr-2" />
                  Processing...
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4 mr-2" />
                  Proceed to Payment
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}


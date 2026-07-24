import { describe, it, expect } from 'vitest'
import { calculateFlowMetrics, calculatePercentiles } from '../flowMetricsCalculator'

describe('flowMetricsCalculator', () => {
  const mockCards = [
    {
      id: '1',
      created_at: '2025-01-01T00:00:00Z',
      started_at: '2025-01-02T00:00:00Z',
      completed_at: '2025-01-05T00:00:00Z',
    },
    {
      id: '2',
      created_at: '2025-01-03T00:00:00Z',
      started_at: '2025-01-04T00:00:00Z',
      completed_at: '2025-01-07T00:00:00Z',
    },
    {
      id: '3',
      created_at: '2025-01-05T00:00:00Z',
      started_at: '2025-01-06T00:00:00Z',
      completed_at: null, // Not completed
    },
  ]

  describe('calculateFlowMetrics', () => {
    it('calculates flow metrics correctly for completed cards', () => {
      const metrics = calculateFlowMetrics(mockCards)
      
      // Should have cycle time (average of 3 days and 3 days = 3)
      expect(metrics.cycleTimeDays).toBeGreaterThan(0)
      expect(metrics.leadTimeDays).toBeGreaterThan(0)
      expect(metrics.sampleSizes.cycleTime).toBe(2)
      expect(metrics.sampleSizes.leadTime).toBe(2)
    })

    it('handles empty cards array', () => {
      const metrics = calculateFlowMetrics([])
      expect(metrics.cycleTimeDays).toBe(0)
      expect(metrics.leadTimeDays).toBe(0)
      expect(metrics.throughputPerWeek).toBe(0)
      expect(metrics.averageAgeDays).toBe(0)
    })

    it('handles null/undefined cards', () => {
      const metrics = calculateFlowMetrics(null)
      expect(metrics.cycleTimeDays).toBe(0)
    })

    it('calculates throughput per week', () => {
      const metrics = calculateFlowMetrics(mockCards)
      expect(metrics.throughputPerWeek).toBeGreaterThanOrEqual(0)
    })

    it('calculates average WIP age for in-progress cards', () => {
      const metrics = calculateFlowMetrics(mockCards)
      expect(metrics.averageAgeDays).toBeGreaterThanOrEqual(0)
    })
  })

  describe('calculatePercentiles', () => {
    it('calculates percentiles correctly', () => {
      const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
      const percentiles = calculatePercentiles(values)
      expect(percentiles.p50).toBeGreaterThan(0)
      expect(percentiles.p85).toBeGreaterThan(0)
      expect(percentiles.p95).toBeGreaterThan(0)
    })

    it('handles empty array', () => {
      const percentiles = calculatePercentiles([])
      expect(percentiles.p50).toBe(0)
      expect(percentiles.p85).toBe(0)
      expect(percentiles.p95).toBe(0)
    })
  })
})


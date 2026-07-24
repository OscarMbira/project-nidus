import { differenceInCalendarDays, isAfter, subDays } from 'date-fns'

/**
 * Calculate flow metrics for a set of Kanban cards.
 *
 * Expected card fields:
 * - created_at
 * - started_at
 * - completed_at
 */
export function calculateFlowMetrics(cards) {
  if (!cards || cards.length === 0) {
    return {
      cycleTimeDays: 0,
      leadTimeDays: 0,
      throughputPerWeek: 0,
      averageAgeDays: 0,
      sampleSizes: {
        cycleTime: 0,
        leadTime: 0,
        throughput: 0,
        age: 0,
      },
    }
  }

  const now = new Date()

  // Cycle time: started_at → completed_at
  const cycleDurations = cards
    .filter(c => c.started_at && c.completed_at)
    .map(c => {
      const start = new Date(c.started_at)
      const end = new Date(c.completed_at)
      return Math.max(differenceInCalendarDays(end, start), 0)
    })

  const cycleTimeDays =
    cycleDurations.length > 0
      ? roundNumber(cycleDurations.reduce((sum, d) => sum + d, 0) / cycleDurations.length)
      : 0

  // Lead time: created_at → completed_at
  const leadDurations = cards
    .filter(c => c.created_at && c.completed_at)
    .map(c => {
      const start = new Date(c.created_at)
      const end = new Date(c.completed_at)
      return Math.max(differenceInCalendarDays(end, start), 0)
    })

  const leadTimeDays =
    leadDurations.length > 0
      ? roundNumber(leadDurations.reduce((sum, d) => sum + d, 0) / leadDurations.length)
      : 0

  // Throughput: cards completed in last 7 days
  const oneWeekAgo = subDays(now, 7)
  const completedLastWeek = cards.filter(c => c.completed_at && isAfter(new Date(c.completed_at), oneWeekAgo))
  const throughputPerWeek = completedLastWeek.length

  // Average age: days since started_at for cards that are in progress (started but not completed)
  const ageDurations = cards
    .filter(c => c.started_at && !c.completed_at)
    .map(c => {
      const start = new Date(c.started_at)
      return Math.max(differenceInCalendarDays(now, start), 0)
    })

  const averageAgeDays =
    ageDurations.length > 0
      ? roundNumber(ageDurations.reduce((sum, d) => sum + d, 0) / ageDurations.length)
      : 0

  return {
    cycleTimeDays,
    leadTimeDays,
    throughputPerWeek,
    averageAgeDays,
    sampleSizes: {
      cycleTime: cycleDurations.length,
      leadTime: leadDurations.length,
      throughput: completedLastWeek.length,
      age: ageDurations.length,
    },
  }
}

function roundNumber(value) {
  return Math.round(value * 10) / 10
}

/**
 * Calculate percentiles for cycle/lead time data.
 * @param {Array<number>} values - Array of durations
 * @returns {Object} Object with p50, p85, p95 percentiles
 */
export function calculatePercentiles(values) {
  if (!values || values.length === 0) {
    return { p50: 0, p85: 0, p95: 0 }
  }

  const sorted = [...values].sort((a, b) => a - b)
  const p50Index = Math.floor(sorted.length * 0.5)
  const p85Index = Math.floor(sorted.length * 0.85)
  const p95Index = Math.floor(sorted.length * 0.95)

  return {
    p50: roundNumber(sorted[p50Index] || 0),
    p85: roundNumber(sorted[p85Index] || 0),
    p95: roundNumber(sorted[p95Index] || 0),
  }
}



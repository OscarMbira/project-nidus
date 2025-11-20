/**
 * Performance Service
 * Handles performance monitoring and metrics collection
 */

import { supabase } from './supabaseClient'

/**
 * Track page load time
 */
export function trackPageLoad(url, loadTime) {
  try {
    // Store in localStorage for persistence
    const performanceData = {
      url,
      loadTime,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      connection: navigator.connection?.effectiveType || 'unknown'
    }

    // Get existing performance log
    const existingLog = JSON.parse(localStorage.getItem('performance_log') || '[]')
    
    // Add new entry
    existingLog.push(performanceData)

    // Keep only last 100 entries
    if (existingLog.length > 100) {
      existingLog.shift()
    }

    localStorage.setItem('performance_log', JSON.stringify(existingLog))

    // Send to server if available (optional)
    if (supabase) {
      supabase
        .from('performance_metrics')
        .insert({
          metric_type: 'page_load',
          metric_name: 'page_load_time',
          metric_value: loadTime,
          metadata: {
            url,
            userAgent: navigator.userAgent,
            connection: navigator.connection?.effectiveType
          }
        })
        .catch(error => {
          console.error('Error tracking page load:', error)
        })
    }

    return true
  } catch (error) {
    console.error('Error tracking page load:', error)
    return false
  }
}

/**
 * Track API call performance
 */
export function trackApiCall(endpoint, responseTime, method = 'GET') {
  try {
    const performanceData = {
      endpoint,
      method,
      responseTime,
      timestamp: new Date().toISOString()
    }

    // Store in localStorage
    const existingLog = JSON.parse(localStorage.getItem('api_performance_log') || '[]')
    existingLog.push(performanceData)

    if (existingLog.length > 100) {
      existingLog.shift()
    }

    localStorage.setItem('api_performance_log', JSON.stringify(existingLog))

    // Send to server if available (optional)
    if (supabase) {
      supabase
        .from('performance_metrics')
        .insert({
          metric_type: 'api_call',
          metric_name: 'api_response_time',
          metric_value: responseTime,
          metadata: {
            endpoint,
            method
          }
        })
        .catch(error => {
          console.error('Error tracking API call:', error)
        })
    }

    return true
  } catch (error) {
    console.error('Error tracking API call:', error)
    return false
  }
}

/**
 * Track component render time
 */
export function trackComponentRender(componentName, renderTime) {
  try {
    const performanceData = {
      componentName,
      renderTime,
      timestamp: new Date().toISOString()
    }

    // Store in localStorage
    const existingLog = JSON.parse(localStorage.getItem('component_performance_log') || '[]')
    existingLog.push(performanceData)

    if (existingLog.length > 100) {
      existingLog.shift()
    }

    localStorage.setItem('component_performance_log', JSON.stringify(existingLog))

    return true
  } catch (error) {
    console.error('Error tracking component render:', error)
    return false
  }
}

/**
 * Get performance metrics
 */
export function getPerformanceMetrics(filters = {}) {
  try {
    const metrics = {
      page_loads: [],
      api_calls: [],
      component_renders: []
    }

    // Get page load metrics
    if (!filters.exclude_page_loads) {
      const pageLoadLog = JSON.parse(localStorage.getItem('performance_log') || '[]')
      
      if (filters.start_date && filters.end_date) {
        metrics.page_loads = pageLoadLog.filter(entry => {
          const date = new Date(entry.timestamp)
          return date >= new Date(filters.start_date) && date <= new Date(filters.end_date)
        })
      } else {
        metrics.page_loads = pageLoadLog.slice(-50) // Last 50 entries
      }
    }

    // Get API call metrics
    if (!filters.exclude_api_calls) {
      const apiLog = JSON.parse(localStorage.getItem('api_performance_log') || '[]')
      
      if (filters.start_date && filters.end_date) {
        metrics.api_calls = apiLog.filter(entry => {
          const date = new Date(entry.timestamp)
          return date >= new Date(filters.start_date) && date <= new Date(filters.end_date)
        })
      } else {
        metrics.api_calls = apiLog.slice(-50) // Last 50 entries
      }
    }

    // Get component render metrics
    if (!filters.exclude_component_renders) {
      const componentLog = JSON.parse(localStorage.getItem('component_performance_log') || '[]')
      
      if (filters.start_date && filters.end_date) {
        metrics.component_renders = componentLog.filter(entry => {
          const date = new Date(entry.timestamp)
          return date >= new Date(filters.start_date) && date <= new Date(filters.end_date)
        })
      } else {
        metrics.component_renders = componentLog.slice(-50) // Last 50 entries
      }
    }

    // Calculate statistics
    const stats = {
      page_load: {
        count: metrics.page_loads.length,
        average: 0,
        min: Infinity,
        max: 0,
        p50: 0,
        p95: 0,
        p99: 0
      },
      api_call: {
        count: metrics.api_calls.length,
        average: 0,
        min: Infinity,
        max: 0,
        p50: 0,
        p95: 0,
        p99: 0
      },
      component_render: {
        count: metrics.component_renders.length,
        average: 0,
        min: Infinity,
        max: 0,
        p50: 0,
        p95: 0,
        p99: 0
      }
    }

    // Calculate page load stats
    if (metrics.page_loads.length > 0) {
      const times = metrics.page_loads.map(e => e.loadTime).sort((a, b) => a - b)
      stats.page_load.average = times.reduce((a, b) => a + b, 0) / times.length
      stats.page_load.min = times[0]
      stats.page_load.max = times[times.length - 1]
      stats.page_load.p50 = times[Math.floor(times.length * 0.5)]
      stats.page_load.p95 = times[Math.floor(times.length * 0.95)]
      stats.page_load.p99 = times[Math.floor(times.length * 0.99)]
    }

    // Calculate API call stats
    if (metrics.api_calls.length > 0) {
      const times = metrics.api_calls.map(e => e.responseTime).sort((a, b) => a - b)
      stats.api_call.average = times.reduce((a, b) => a + b, 0) / times.length
      stats.api_call.min = times[0]
      stats.api_call.max = times[times.length - 1]
      stats.api_call.p50 = times[Math.floor(times.length * 0.5)]
      stats.api_call.p95 = times[Math.floor(times.length * 0.95)]
      stats.api_call.p99 = times[Math.floor(times.length * 0.99)]
    }

    // Calculate component render stats
    if (metrics.component_renders.length > 0) {
      const times = metrics.component_renders.map(e => e.renderTime).sort((a, b) => a - b)
      stats.component_render.average = times.reduce((a, b) => a + b, 0) / times.length
      stats.component_render.min = times[0]
      stats.component_render.max = times[times.length - 1]
      stats.component_render.p50 = times[Math.floor(times.length * 0.5)]
      stats.component_render.p95 = times[Math.floor(times.length * 0.95)]
      stats.component_render.p99 = times[Math.floor(times.length * 0.99)]
    }

    return {
      success: true,
      data: metrics,
      stats
    }
  } catch (error) {
    console.error('Error getting performance metrics:', error)
    return { success: false, message: error.message, data: null, stats: null }
  }
}

/**
 * Clear performance logs
 */
export function clearPerformanceLogs() {
  try {
    localStorage.removeItem('performance_log')
    localStorage.removeItem('api_performance_log')
    localStorage.removeItem('component_performance_log')
    return { success: true }
  } catch (error) {
    console.error('Error clearing performance logs:', error)
    return { success: false, message: error.message }
  }
}

/**
 * Measure performance of async function
 */
export async function measurePerformance(fn, metricName) {
  const start = performance.now()
  
  try {
    const result = await fn()
    const duration = performance.now() - start
    
    trackComponentRender(metricName, duration)
    
    return { result, duration }
  } catch (error) {
    const duration = performance.now() - start
    trackComponentRender(`${metricName}_error`, duration)
    throw error
  }
}


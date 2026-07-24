/**
 * Performance Monitoring Service
 * 
 * Tracks performance metrics, monitors API response times, and identifies bottlenecks
 */

/**
 * Track page load performance
 */
export function trackPageLoad(pageName, loadTime) {
  if (typeof window !== 'undefined' && window.performance) {
    const navigation = performance.getEntriesByType('navigation')[0];
    const metrics = {
      page: pageName,
      loadTime: loadTime || navigation.loadEventEnd - navigation.fetchStart,
      domContentLoaded: navigation.domContentLoadedEventEnd - navigation.fetchStart,
      firstPaint: getFirstPaint(),
      firstContentfulPaint: getFirstContentfulPaint(),
      timeToInteractive: getTimeToInteractive(),
      timestamp: new Date().toISOString(),
    };

    // Send to analytics (in production, this would call backend API)
    logPerformanceMetric(metrics);
    return metrics;
  }
  return null;
}

/**
 * Track API call performance
 */
export function trackAPICall(endpoint, method, duration, status, error = null) {
  const metric = {
    endpoint,
    method,
    duration,
    status,
    error: error?.message || null,
    timestamp: new Date().toISOString(),
  };

  // Log slow API calls (> 2 seconds)
  if (duration > 2000) {
    console.warn('Slow API call detected:', metric);
  }

  // Send to analytics
  logPerformanceMetric(metric);
  return metric;
}

/**
 * Track simulation performance
 */
export function trackSimulationPerformance(runId, metrics) {
  const performanceData = {
    runId,
    ...metrics,
    timestamp: new Date().toISOString(),
  };

  // Track in localStorage for offline analysis
  const perfLog = JSON.parse(localStorage.getItem('sim_performance_log') || '[]');
  perfLog.push(performanceData);
  
  // Keep only last 100 entries
  if (perfLog.length > 100) {
    perfLog.shift();
  }
  
  localStorage.setItem('sim_performance_log', JSON.stringify(perfLog));

  // Send to backend (in production)
  logPerformanceMetric(performanceData);
  return performanceData;
}

/**
 * Get First Paint time
 */
function getFirstPaint() {
  if (typeof window === 'undefined' || !window.performance) return null;
  
  const paintEntries = performance.getEntriesByType('paint');
  const firstPaint = paintEntries.find(entry => entry.name === 'first-paint');
  return firstPaint ? firstPaint.startTime : null;
}

/**
 * Get First Contentful Paint time
 */
function getFirstContentfulPaint() {
  if (typeof window === 'undefined' || !window.performance) return null;
  
  const paintEntries = performance.getEntriesByType('paint');
  const fcp = paintEntries.find(entry => entry.name === 'first-contentful-paint');
  return fcp ? fcp.startTime : null;
}

/**
 * Get Time to Interactive
 */
function getTimeToInteractive() {
  if (typeof window === 'undefined' || !window.performance) return null;
  
  // Simplified TTI calculation
  const navigation = performance.getEntriesByType('navigation')[0];
  if (!navigation) return null;
  
  return navigation.domInteractive - navigation.fetchStart;
}

/**
 * Log performance metric (would send to backend in production)
 */
function logPerformanceMetric(metric) {
  // In production, this would send to analytics backend
  if (import.meta.env.DEV) {
    console.log('Performance Metric:', metric);
  }
}

/**
 * Get performance summary
 */
export function getPerformanceSummary() {
  if (typeof window === 'undefined' || !window.performance) return null;

  const navigation = performance.getEntriesByType('navigation')[0];
  if (!navigation) return null;

  return {
    pageLoad: navigation.loadEventEnd - navigation.fetchStart,
    domContentLoaded: navigation.domContentLoadedEventEnd - navigation.fetchStart,
    firstPaint: getFirstPaint(),
    firstContentfulPaint: getFirstContentfulPaint(),
    timeToInteractive: getTimeToInteractive(),
    dns: navigation.domainLookupEnd - navigation.domainLookupStart,
    tcp: navigation.connectEnd - navigation.connectStart,
    request: navigation.responseStart - navigation.requestStart,
    response: navigation.responseEnd - navigation.responseStart,
    domProcessing: navigation.domComplete - navigation.domInteractive,
  };
}

/**
 * Monitor memory usage
 */
export function getMemoryUsage() {
  if (typeof window === 'undefined' || !performance.memory) return null;

  return {
    used: performance.memory.usedJSHeapSize,
    total: performance.memory.totalJSHeapSize,
    limit: performance.memory.jsHeapSizeLimit,
    percentage: (performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit) * 100,
  };
}

/**
 * Check if performance is acceptable
 */
export function checkPerformanceThresholds() {
  const summary = getPerformanceSummary();
  if (!summary) return { acceptable: true };

  const thresholds = {
    pageLoad: 2000, // 2 seconds
    firstContentfulPaint: 1500, // 1.5 seconds
    timeToInteractive: 3000, // 3 seconds
  };

  const issues = [];
  
  if (summary.pageLoad > thresholds.pageLoad) {
    issues.push(`Page load time (${summary.pageLoad}ms) exceeds threshold (${thresholds.pageLoad}ms)`);
  }
  
  if (summary.firstContentfulPaint > thresholds.firstContentfulPaint) {
    issues.push(`FCP (${summary.firstContentfulPaint}ms) exceeds threshold (${thresholds.firstContentfulPaint}ms)`);
  }
  
  if (summary.timeToInteractive > thresholds.timeToInteractive) {
    issues.push(`TTI (${summary.timeToInteractive}ms) exceeds threshold (${thresholds.timeToInteractive}ms)`);
  }

  return {
    acceptable: issues.length === 0,
    issues,
    summary,
  };
}

/**
 * Get performance metrics for dashboard
 */
export async function getPerformanceMetrics(filters = {}) {
  try {
    const summary = getPerformanceSummary();
    const memory = getMemoryUsage();
    const thresholds = checkPerformanceThresholds();

    return {
      summary,
      memory,
      thresholds,
      apiMetrics: {
        averageResponseTime: 0,
        slowestEndpoints: [],
        errorRate: 0,
      },
      systemHealth: {
        status: thresholds.acceptable ? 'healthy' : 'degraded',
        issues: thresholds.issues || [],
      },
    };
  } catch (error) {
    console.error('Error getting performance metrics:', error);
    throw error;
  }
}

export default {
  trackPageLoad,
  trackAPICall,
  trackSimulationPerformance,
  getPerformanceSummary,
  getPerformanceMetrics,
  getMemoryUsage,
  checkPerformanceThresholds,
};

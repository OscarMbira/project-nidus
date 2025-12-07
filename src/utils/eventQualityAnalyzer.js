/**
 * Event Quality Analyzer
 * 
 * Utility functions for analyzing AI event quality and difficulty calibration
 */

import { simDb } from '../services/supabase/supabaseClient';

/**
 * Analyze event quality metrics
 */
export async function analyzeEventQuality(timeRange = '30 days') {
  try {
    const { data: events, error } = await simDb
      .from('ai_events')
      .select(`
        id,
        event_type,
        event_category,
        event_name,
        severity,
        response_score,
        is_optimal,
        event_data,
        triggered_at,
        simulation_runs!inner(
          scenario_id,
          scenarios!inner(
            name,
            difficulty_level
          )
        )
      `)
      .gte('triggered_at', new Date(Date.now() - parseTimeRange(timeRange)).toISOString())
      .not('user_response', 'is', null);

    if (error) throw error;

    // Calculate quality metrics
    const metrics = {
      totalEvents: events.length,
      aiGenerated: events.filter(e => e.event_data?.isAIGenerated).length,
      averageScore: calculateAverage(events.map(e => e.response_score)),
      optimalRate: calculateOptimalRate(events),
      byCategory: groupByCategory(events),
      byDifficulty: groupByDifficulty(events),
      bySeverity: groupBySeverity(events),
      qualityIssues: identifyQualityIssues(events),
    };

    return { success: true, metrics };
  } catch (error) {
    console.error('Error analyzing event quality:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Analyze difficulty calibration
 */
export async function analyzeDifficultyCalibration(timeRange = '30 days') {
  try {
    const { data: runs, error } = await simDb
      .from('simulation_runs')
      .select(`
        id,
        total_score,
        max_possible_score,
        time_spent_minutes,
        status,
        scenarios!inner(
          difficulty_level,
          name
        ),
        ai_events(
          id,
          response_score,
          is_optimal
        )
      `)
      .eq('status', 'completed')
      .gte('completed_at', new Date(Date.now() - parseTimeRange(timeRange)).toISOString());

    if (error) throw error;

    // Group by difficulty
    const byDifficulty = {};
    const difficultyLevels = ['beginner', 'intermediate', 'advanced', 'expert'];

    difficultyLevels.forEach(level => {
      const levelRuns = runs.filter(r => r.scenarios.difficulty_level === level);
      
      if (levelRuns.length > 0) {
        const scores = levelRuns.map(r => 
          r.max_possible_score > 0 
            ? (r.total_score / r.max_possible_score) * 100 
            : 0
        );
        
        const allEvents = levelRuns.flatMap(r => r.ai_events || []);
        const optimalEvents = allEvents.filter(e => e.is_optimal);
        
        byDifficulty[level] = {
          totalRuns: levelRuns.length,
          uniqueUsers: new Set(levelRuns.map(r => r.id)).size,
          averageScore: calculateAverage(scores),
          medianScore: calculateMedian(scores),
          averageTime: calculateAverage(levelRuns.map(r => r.time_spent_minutes)),
          optimalRate: allEvents.length > 0 
            ? (optimalEvents.length / allEvents.length) * 100 
            : 0,
          totalEvents: allEvents.length,
          targetScore: getTargetScore(level),
          targetOptimalRate: getTargetOptimalRate(level),
          calibration: calculateCalibration(
            calculateAverage(scores),
            getTargetScore(level)
          ),
        };
      }
    });

    return { success: true, calibration: byDifficulty };
  } catch (error) {
    console.error('Error analyzing difficulty calibration:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get events needing calibration
 */
export async function getEventsNeedingCalibration(threshold = 50) {
  try {
    const { data: events, error } = await simDb
      .from('ai_events')
      .select(`
        event_type,
        event_category,
        response_score,
        is_optimal,
        simulation_runs!inner(
          scenarios!inner(difficulty_level)
        )
      `)
      .not('user_response', 'is', null)
      .gte('triggered_at', new Date(Date.now() - parseTimeRange('30 days')).toISOString());

    if (error) throw error;

    // Group by event type
    const eventStats = {};
    
    events.forEach(event => {
      const key = `${event.event_type}_${event.event_category}`;
      if (!eventStats[key]) {
        eventStats[key] = {
          eventType: event.event_type,
          category: event.event_category,
          occurrences: 0,
          totalScore: 0,
          optimalCount: 0,
        };
      }
      
      eventStats[key].occurrences++;
      eventStats[key].totalScore += event.response_score || 0;
      if (event.is_optimal) {
        eventStats[key].optimalCount++;
      }
    });

    // Calculate averages and identify issues
    const issues = Object.values(eventStats)
      .map(stat => ({
        ...stat,
        averageScore: stat.totalScore / stat.occurrences,
        optimalRate: (stat.optimalCount / stat.occurrences) * 100,
      }))
      .filter(stat => 
        stat.averageScore < threshold || 
        stat.optimalRate < 30
      )
      .sort((a, b) => a.averageScore - b.averageScore);

    return { success: true, issues };
  } catch (error) {
    console.error('Error getting events needing calibration:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Generate quality report
 */
export async function generateQualityReport(timeRange = '30 days') {
  const [quality, calibration, issues] = await Promise.all([
    analyzeEventQuality(timeRange),
    analyzeDifficultyCalibration(timeRange),
    getEventsNeedingCalibration(),
  ]);

  return {
    success: quality.success && calibration.success,
    report: {
      generatedAt: new Date().toISOString(),
      timeRange,
      quality: quality.metrics,
      calibration: calibration.calibration,
      issues: issues.issues,
      recommendations: generateRecommendations(quality.metrics, calibration.calibration, issues.issues),
    },
  };
}

// Helper functions

function parseTimeRange(range) {
  const match = range.match(/(\d+)\s*(day|days|hour|hours|week|weeks)/i);
  if (!match) return 30 * 24 * 60 * 60 * 1000; // Default 30 days
  
  const value = parseInt(match[1]);
  const unit = match[2].toLowerCase();
  
  const multipliers = {
    hour: 60 * 60 * 1000,
    hours: 60 * 60 * 1000,
    day: 24 * 60 * 60 * 1000,
    days: 24 * 60 * 60 * 1000,
    week: 7 * 24 * 60 * 60 * 1000,
    weeks: 7 * 24 * 60 * 60 * 1000,
  };
  
  return value * (multipliers[unit] || 24 * 60 * 60 * 1000);
}

function calculateAverage(values) {
  if (!values || values.length === 0) return 0;
  const sum = values.reduce((a, b) => a + b, 0);
  return sum / values.length;
}

function calculateMedian(values) {
  if (!values || values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function calculateOptimalRate(events) {
  if (!events || events.length === 0) return 0;
  const optimal = events.filter(e => e.is_optimal).length;
  return (optimal / events.length) * 100;
}

function groupByCategory(events) {
  const groups = {};
  events.forEach(event => {
    const category = event.event_category || 'unknown';
    if (!groups[category]) {
      groups[category] = {
        count: 0,
        totalScore: 0,
        optimalCount: 0,
      };
    }
    groups[category].count++;
    groups[category].totalScore += event.response_score || 0;
    if (event.is_optimal) {
      groups[category].optimalCount++;
    }
  });
  
  return Object.entries(groups).map(([category, data]) => ({
    category,
    count: data.count,
    averageScore: data.totalScore / data.count,
    optimalRate: (data.optimalCount / data.count) * 100,
  }));
}

function groupByDifficulty(events) {
  const groups = {};
  events.forEach(event => {
    const difficulty = event.simulation_runs?.scenarios?.difficulty_level || 'unknown';
    if (!groups[difficulty]) {
      groups[difficulty] = {
        count: 0,
        totalScore: 0,
        optimalCount: 0,
      };
    }
    groups[difficulty].count++;
    groups[difficulty].totalScore += event.response_score || 0;
    if (event.is_optimal) {
      groups[difficulty].optimalCount++;
    }
  });
  
  return Object.entries(groups).map(([difficulty, data]) => ({
    difficulty,
    count: data.count,
    averageScore: data.totalScore / data.count,
    optimalRate: (data.optimalCount / data.count) * 100,
  }));
}

function groupBySeverity(events) {
  const groups = {};
  events.forEach(event => {
    const severity = event.severity || 'unknown';
    if (!groups[severity]) {
      groups[severity] = {
        count: 0,
        totalScore: 0,
        optimalCount: 0,
      };
    }
    groups[severity].count++;
    groups[severity].totalScore += event.response_score || 0;
    if (event.is_optimal) {
      groups[severity].optimalCount++;
    }
  });
  
  return Object.entries(groups).map(([severity, data]) => ({
    severity,
    count: data.count,
    averageScore: data.totalScore / data.count,
    optimalRate: (data.optimalCount / data.count) * 100,
  }));
}

function identifyQualityIssues(events) {
  const issues = [];
  
  // Check for events without options
  events.forEach(event => {
    const options = event.event_data?.options || [];
    if (options.length !== 4) {
      issues.push({
        type: 'invalid_option_count',
        eventId: event.id,
        eventName: event.event_name,
        expected: 4,
        actual: options.length,
      });
    }
    
    // Check for missing optimal option
    const hasOptimal = options.some(opt => opt.isOptimal);
    if (!hasOptimal) {
      issues.push({
        type: 'missing_optimal_option',
        eventId: event.id,
        eventName: event.event_name,
      });
    }
    
    // Check for low scores
    if (event.response_score < 30) {
      issues.push({
        type: 'low_score',
        eventId: event.id,
        eventName: event.event_name,
        score: event.response_score,
      });
    }
  });
  
  return issues;
}

function getTargetScore(difficulty) {
  const targets = {
    beginner: 80,
    intermediate: 70,
    advanced: 60,
    expert: 50,
  };
  return targets[difficulty] || 70;
}

function getTargetOptimalRate(difficulty) {
  const targets = {
    beginner: 65,
    intermediate: 55,
    advanced: 45,
    expert: 35,
  };
  return targets[difficulty] || 55;
}

function calculateCalibration(actual, target) {
  const diff = actual - target;
  if (Math.abs(diff) <= 5) return 'well_calibrated';
  if (diff > 5) return 'too_easy';
  return 'too_hard';
}

function generateRecommendations(quality, calibration, issues) {
  const recommendations = [];
  
  // Quality recommendations
  if (quality.averageScore < 70) {
    recommendations.push({
      priority: 'high',
      category: 'quality',
      message: 'Average event scores are below target. Review event difficulty and option quality.',
    });
  }
  
  if (quality.optimalRate < 50) {
    recommendations.push({
      priority: 'high',
      category: 'quality',
      message: 'Optimal response rate is low. Consider making optimal options more attractive or adjusting scoring.',
    });
  }
  
  // Calibration recommendations
  Object.entries(calibration).forEach(([difficulty, data]) => {
    if (data.calibration === 'too_easy') {
      recommendations.push({
        priority: 'medium',
        category: 'calibration',
        message: `${difficulty} difficulty is too easy. Average score (${data.averageScore.toFixed(1)}%) exceeds target (${data.targetScore}%).`,
      });
    } else if (data.calibration === 'too_hard') {
      recommendations.push({
        priority: 'medium',
        category: 'calibration',
        message: `${difficulty} difficulty is too hard. Average score (${data.averageScore.toFixed(1)}%) is below target (${data.targetScore}%).`,
      });
    }
  });
  
  // Issue recommendations
  if (issues.length > 0) {
    recommendations.push({
      priority: 'high',
      category: 'issues',
      message: `${issues.length} event types need calibration. Review and adjust low-performing events.`,
    });
  }
  
  return recommendations;
}

export default {
  analyzeEventQuality,
  analyzeDifficultyCalibration,
  getEventsNeedingCalibration,
  generateQualityReport,
};


/**
 * Metrics Calculator Service
 * Provides utility functions for calculating project metrics, KPIs, and analytics
 */

/**
 * Calculate Schedule Performance Index (SPI)
 * SPI = Earned Value / Planned Value
 */
export function calculateSPI(earnedValue, plannedValue) {
  if (!plannedValue || plannedValue === 0) return null;
  return earnedValue / plannedValue;
}

/**
 * Calculate Cost Performance Index (CPI)
 * CPI = Earned Value / Actual Cost
 */
export function calculateCPI(earnedValue, actualCost) {
  if (!actualCost || actualCost === 0) return null;
  return earnedValue / actualCost;
}

/**
 * Calculate Schedule Variance (SV)
 * SV = Earned Value - Planned Value
 */
export function calculateSV(earnedValue, plannedValue) {
  return earnedValue - plannedValue;
}

/**
 * Calculate Cost Variance (CV)
 * CV = Earned Value - Actual Cost
 */
export function calculateCV(earnedValue, actualCost) {
  return earnedValue - actualCost;
}

/**
 * Calculate Estimate at Completion (EAC)
 * EAC = Budget at Completion / CPI
 */
export function calculateEAC(budgetAtCompletion, cpi) {
  if (!cpi || cpi === 0) return null;
  return budgetAtCompletion / cpi;
}

/**
 * Calculate Estimate to Complete (ETC)
 * ETC = EAC - Actual Cost
 */
export function calculateETC(eac, actualCost) {
  if (!eac) return null;
  return eac - actualCost;
}

/**
 * Calculate Variance at Completion (VAC)
 * VAC = Budget at Completion - EAC
 */
export function calculateVAC(budgetAtCompletion, eac) {
  if (!eac) return null;
  return budgetAtCompletion - eac;
}

/**
 * Calculate To Complete Performance Index (TCPI)
 * TCPI = (Budget at Completion - Earned Value) / (Budget at Completion - Actual Cost)
 */
export function calculateTCPI(budgetAtCompletion, earnedValue, actualCost) {
  const denominator = budgetAtCompletion - actualCost;
  if (!denominator || denominator === 0) return null;
  return (budgetAtCompletion - earnedValue) / denominator;
}

/**
 * Calculate Earned Value (EV)
 * EV = % Complete * Budget at Completion
 */
export function calculateEarnedValue(completionPercentage, budgetAtCompletion) {
  if (!completionPercentage || !budgetAtCompletion) return null;
  return (completionPercentage / 100) * budgetAtCompletion;
}

/**
 * Calculate Planned Value (PV)
 * PV = (Current Date - Start Date) / (End Date - Start Date) * Budget at Completion
 */
export function calculatePlannedValue(startDate, endDate, currentDate, budgetAtCompletion) {
  if (!startDate || !endDate || !currentDate || !budgetAtCompletion) return null;
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  const current = new Date(currentDate);
  
  const totalDuration = end - start;
  const elapsedDuration = current - start;
  
  if (totalDuration <= 0) return null;
  
  const plannedPercentage = Math.min(Math.max((elapsedDuration / totalDuration) * 100, 0), 100);
  return (plannedPercentage / 100) * budgetAtCompletion;
}

/**
 * Calculate Budget Utilization Percentage
 */
export function calculateBudgetUtilization(actualCost, budget) {
  if (!budget || budget === 0) return null;
  return (actualCost / budget) * 100;
}

/**
 * Calculate Schedule Utilization Percentage
 */
export function calculateScheduleUtilization(actualDuration, plannedDuration) {
  if (!plannedDuration || plannedDuration === 0) return null;
  return (actualDuration / plannedDuration) * 100;
}

/**
 * Calculate Resource Utilization Percentage
 */
export function calculateResourceUtilization(actualHours, allocatedHours) {
  if (!allocatedHours || allocatedHours === 0) return null;
  return (actualHours / allocatedHours) * 100;
}

/**
 * Calculate Overall Project Health Score
 * Combines schedule, cost, and quality metrics
 */
export function calculateProjectHealthScore({
  schedulePerformance,
  costPerformance,
  qualityScore,
  riskScore,
  weights = { schedule: 0.3, cost: 0.3, quality: 0.25, risk: 0.15 }
}) {
  let score = 0;

  // Schedule Performance (0-100 scale)
  if (schedulePerformance !== null && schedulePerformance !== undefined) {
    const scheduleScore = Math.min(Math.max(schedulePerformance * 100, 0), 100);
    score += scheduleScore * weights.schedule;
  }

  // Cost Performance (0-100 scale)
  if (costPerformance !== null && costPerformance !== undefined) {
    const costScore = Math.min(Math.max(costPerformance * 100, 0), 100);
    score += costScore * weights.cost;
  }

  // Quality Score (already 0-100)
  if (qualityScore !== null && qualityScore !== undefined) {
    score += qualityScore * weights.quality;
  }

  // Risk Score (invert: lower risk = higher score)
  if (riskScore !== null && riskScore !== undefined) {
    const invertedRiskScore = Math.max(100 - (riskScore * 100), 0);
    score += invertedRiskScore * weights.risk;
  }

  return Math.round(score);
}

/**
 * Calculate Task Completion Rate
 */
export function calculateTaskCompletionRate(completedTasks, totalTasks) {
  if (!totalTasks || totalTasks === 0) return null;
  return (completedTasks / totalTasks) * 100;
}

/**
 * Calculate Milestone Achievement Rate
 */
export function calculateMilestoneAchievementRate(achievedMilestones, totalMilestones) {
  if (!totalMilestones || totalMilestones === 0) return null;
  return (achievedMilestones / totalMilestones) * 100;
}

/**
 * Calculate Risk Exposure
 */
export function calculateRiskExposure(risks) {
  if (!risks || risks.length === 0) return 0;
  
  return risks.reduce((total, risk) => {
    const probability = risk.probability || 0;
    const impact = risk.impact || 0;
    return total + (probability * impact);
  }, 0);
}

/**
 * Calculate Quality Metrics
 */
export function calculateQualityMetrics(qualityData) {
  const metrics = {
    totalItems: 0,
    passedItems: 0,
    failedItems: 0,
    pendingItems: 0,
    averageScore: 0,
    defectRate: 0,
  };

  if (!qualityData || qualityData.length === 0) return metrics;

  metrics.totalItems = qualityData.length;
  
  const scores = [];
  let totalDefects = 0;

  qualityData.forEach(item => {
    if (item.quality_status === 'passed' || item.quality_status === 'approved') {
      metrics.passedItems++;
    } else if (item.quality_status === 'failed' || item.quality_status === 'rejected') {
      metrics.failedItems++;
    } else {
      metrics.pendingItems++;
    }

    if (item.quality_score !== null && item.quality_score !== undefined) {
      scores.push(item.quality_score);
    }

    if (item.quality_issues_found) {
      totalDefects += item.quality_issues_found;
    }
  });

  if (scores.length > 0) {
    metrics.averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  }

  if (metrics.totalItems > 0) {
    metrics.defectRate = (totalDefects / metrics.totalItems) * 100;
  }

  return metrics;
}

/**
 * Calculate Stakeholder Engagement Score
 */
export function calculateStakeholderEngagementScore(stakeholders) {
  if (!stakeholders || stakeholders.length === 0) return null;

  const engagementScores = {
    leading: 5,
    supportive: 4,
    neutral: 3,
    unsupportive: 2,
    blocking: 1,
  };

  const totalScore = stakeholders.reduce((sum, sh) => {
    const engagement = sh.engagement_level || sh.latest_engagement?.engagement_level || 'neutral';
    return sum + (engagementScores[engagement] || 3);
  }, 0);

  return (totalScore / stakeholders.length) * 20; // Convert to 0-100 scale
}

/**
 * Calculate Portfolio Metrics (aggregated across projects)
 */
export function calculatePortfolioMetrics(projects) {
  if (!projects || projects.length === 0) {
    return {
      totalProjects: 0,
      activeProjects: 0,
      completedProjects: 0,
      totalBudget: 0,
      totalSpent: 0,
      averageHealthScore: 0,
      onTimeProjects: 0,
      onBudgetProjects: 0,
    };
  }

  const metrics = {
    totalProjects: projects.length,
    activeProjects: 0,
    completedProjects: 0,
    totalBudget: 0,
    totalSpent: 0,
    healthScores: [],
    onTimeProjects: 0,
    onBudgetProjects: 0,
  };

  projects.forEach(project => {
    if (project.project_status === 'completed' || project.project_status === 'closed') {
      metrics.completedProjects++;
    } else {
      metrics.activeProjects++;
    }

    if (project.budget) {
      metrics.totalBudget += parseFloat(project.budget);
    }

    if (project.actual_cost) {
      metrics.totalSpent += parseFloat(project.actual_cost);
    }

    if (project.health_score !== null && project.health_score !== undefined) {
      metrics.healthScores.push(project.health_score);
    }

    // Check if on time (using schedule performance)
    if (project.schedule_performance !== null && project.schedule_performance >= 0.95) {
      metrics.onTimeProjects++;
    }

    // Check if on budget (using cost performance)
    if (project.cost_performance !== null && project.cost_performance >= 0.95) {
      metrics.onBudgetProjects++;
    }
  });

  if (metrics.healthScores.length > 0) {
    metrics.averageHealthScore = metrics.healthScores.reduce((a, b) => a + b, 0) / metrics.healthScores.length;
  }

  return metrics;
}

/**
 * Calculate Trend (percentage change)
 */
export function calculateTrend(currentValue, previousValue) {
  if (!previousValue || previousValue === 0) return null;
  return ((currentValue - previousValue) / previousValue) * 100;
}

/**
 * Calculate Velocity (for Agile projects)
 */
export function calculateVelocity(completedStoryPoints, sprints) {
  if (!sprints || sprints === 0) return null;
  return completedStoryPoints / sprints;
}

/**
 * Calculate Burndown Rate
 */
export function calculateBurndownRate(remainingWork, timeRemaining) {
  if (!timeRemaining || timeRemaining === 0) return null;
  return remainingWork / timeRemaining;
}

/**
 * Calculate Cycle Time (average time to complete)
 */
export function calculateCycleTime(tasks) {
  if (!tasks || tasks.length === 0) return null;

  const cycleTimes = tasks
    .filter(task => task.start_date && task.end_date)
    .map(task => {
      const start = new Date(task.start_date);
      const end = new Date(task.end_date);
      return (end - start) / (1000 * 60 * 60 * 24); // Convert to days
    });

  if (cycleTimes.length === 0) return null;

  return cycleTimes.reduce((a, b) => a + b, 0) / cycleTimes.length;
}

/**
 * Calculate Lead Time
 */
export function calculateLeadTime(tasks) {
  if (!tasks || tasks.length === 0) return null;

  const leadTimes = tasks
    .filter(task => task.created_at && task.end_date)
    .map(task => {
      const created = new Date(task.created_at);
      const end = new Date(task.end_date);
      return (end - created) / (1000 * 60 * 60 * 24); // Convert to days
    });

  if (leadTimes.length === 0) return null;

  return leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length;
}

/**
 * Format metric value based on type
 */
export function formatMetricValue(value, format = 'number', options = {}) {
  if (value === null || value === undefined) return 'N/A';

  switch (format) {
    case 'percentage':
      return `${value.toFixed(options.decimalPlaces || 1)}%`;
    case 'currency':
      const currency = options.currency || '$';
      return `${currency}${value.toLocaleString(undefined, { 
        minimumFractionDigits: options.decimalPlaces || 2,
        maximumFractionDigits: options.decimalPlaces || 2 
      })}`;
    case 'duration':
      const unit = options.unit || 'days';
      return `${value.toFixed(options.decimalPlaces || 1)} ${unit}`;
    case 'number':
    default:
      return value.toLocaleString(undefined, {
        minimumFractionDigits: options.decimalPlaces || 0,
        maximumFractionDigits: options.decimalPlaces || 2
      });
  }
}


/** Dual-mode industry plan services — used by shared wizard pages in pages/app */
export * as platformPlan from '../projectIndustryPlanService.js'
export * as simPlan from '../sim/simPracticeIndustryPlanService.js'

export function getIndustryPlanService(isSim) {
  return isSim ? simPlan : platformPlan
}

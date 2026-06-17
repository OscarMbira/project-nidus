import * as platformPlan from '../projectIndustryPlanService'
import * as simPlan from '../sim/simPracticeIndustryPlanService'

/** Resolve industry plan service by domain — keeps dual-mode pages free of direct sim imports. */
export function getIndustryPlanService(isSim = false) {
  return isSim ? simPlan : platformPlan
}

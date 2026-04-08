/**
 * Benefits Review Plan Validation Service
 * Validates Benefits Review Plans against quality criteria
 */

import { getBenefitsReviewPlan, getPlanBenefits, getPlanResources } from './benefitsReviewPlanService';
import { getBenefits } from './benefitsService';

/**
 * Validate Benefits Review Plan against quality criteria
 */
export async function validateBenefitsReviewPlan(planId) {
  try {
    const [plan, coverage, resources] = await Promise.all([
      getBenefitsReviewPlan(planId),
      getPlanBenefits(planId),
      getPlanResources(planId),
    ]);

    const validation = {
      plan_id: planId,
      is_valid: true,
      criteria: [],
      warnings: [],
      errors: [],
    };

    // Criterion 1: All Business Case benefits covered
    if (plan.project_id) {
      const allBenefits = await getBenefits({ project_id: plan.project_id });
      const coveredBenefitIds = coverage.map(c => c.benefit_id);
      const uncoveredBenefits = allBenefits.filter(b => !coveredBenefitIds.includes(b.id) && !b.is_dis_benefit);

      if (uncoveredBenefits.length > 0) {
        validation.warnings.push({
          criterion: 'All Business Case benefits covered',
          message: `${uncoveredBenefits.length} benefit(s) not covered in scope`,
          details: uncoveredBenefits.map(b => b.benefit_name || b.benefit_code),
        });
      } else {
        validation.criteria.push({
          criterion: 'All Business Case benefits covered',
          status: 'passed',
          message: 'All benefits are covered in scope',
        });
      }
    }

    // Criterion 2: Benefits are measurable and baseline measures recorded
    const unmeasurableBenefits = coverage.filter(c => {
      const benefit = c.benefit;
      return !benefit?.measurement_unit || benefit?.baseline_value === null;
    });

    if (unmeasurableBenefits.length > 0) {
      validation.warnings.push({
        criterion: 'Benefits are measurable and baseline measures recorded',
        message: `${unmeasurableBenefits.length} benefit(s) missing measurement unit or baseline value`,
        details: unmeasurableBenefits.map(c => c.benefit?.benefit_name || 'N/A'),
      });
    } else if (coverage.length > 0) {
      validation.criteria.push({
        criterion: 'Benefits are measurable and baseline measures recorded',
        status: 'passed',
        message: 'All covered benefits have measurement units and baseline values',
      });
    }

    // Criterion 3: Suitable timing specified with reasons
    const missingTiming = coverage.filter(c => !c.measurement_frequency || !c.measurement_timing_reason);

    if (missingTiming.length > 0) {
      validation.warnings.push({
        criterion: 'Suitable timing for measurement with reasons',
        message: `${missingTiming.length} benefit(s) missing measurement frequency or timing rationale`,
        details: missingTiming.map(c => c.benefit?.benefit_name || 'N/A'),
      });
    } else if (coverage.length > 0) {
      validation.criteria.push({
        criterion: 'Suitable timing for measurement with reasons',
        status: 'passed',
        message: 'All benefits have measurement timing and rationale',
      });
    }

    // Criterion 4: Skills or individuals needed identified
    const personResources = resources.filter(r => r.resource_type === 'person');
    const skillResources = resources.filter(r => r.resource_type === 'skill');

    if (personResources.length === 0 && skillResources.length === 0 && resources.length === 0) {
      validation.warnings.push({
        criterion: 'Skills or individuals needed identified',
        message: 'No resources identified for review work',
      });
    } else {
      validation.criteria.push({
        criterion: 'Skills or individuals needed identified',
        status: 'passed',
        message: `${resources.length} resource(s) identified`,
      });
    }

    // Criterion 5: Effort and cost realistic vs anticipated benefits value
    if (plan.estimated_review_cost && coverage.length > 0) {
      const totalBenefitValue = coverage.reduce((sum, c) => {
        const benefit = c.benefit;
        return sum + (parseFloat(benefit?.estimated_value || benefit?.target_value || 0));
      }, 0);

      if (totalBenefitValue > 0) {
        const costRatio = (parseFloat(plan.estimated_review_cost) / totalBenefitValue) * 100;

        if (costRatio > 10) {
          validation.warnings.push({
            criterion: 'Effort and cost realistic vs anticipated benefits value',
            message: `Review cost (${costRatio.toFixed(1)}% of benefit value) seems high`,
          });
        } else {
          validation.criteria.push({
            criterion: 'Effort and cost realistic vs anticipated benefits value',
            status: 'passed',
            message: `Review cost is ${costRatio.toFixed(1)}% of benefit value`,
          });
        }
      }
    }

    // Criterion 6: Dis-benefits considered
    if (!plan.dis_benefits_included) {
      validation.warnings.push({
        criterion: 'Dis-benefits considered',
        message: 'Dis-benefits have not been considered',
      });
    } else {
      validation.criteria.push({
        criterion: 'Dis-benefits considered',
        status: 'passed',
        message: 'Dis-benefits are included in the plan',
      });
    }

    // Check if plan has required sections
    if (!plan.scope_description) {
      validation.errors.push({
        criterion: 'Scope defined',
        message: 'Scope description is required',
      });
      validation.is_valid = false;
    }

    if (!plan.accountability_description) {
      validation.warnings.push({
        criterion: 'Accountability defined',
        message: 'Accountability description is recommended',
      });
    }

    if (!plan.measurement_approach) {
      validation.errors.push({
        criterion: 'Measurement approach defined',
        message: 'Benefits measurement approach is required',
      });
      validation.is_valid = false;
    }

    validation.is_valid = validation.errors.length === 0;

    return validation;
  } catch (error) {
    console.error('Error validating Benefits Review Plan:', error);
    throw error;
  }
}

/**
 * Generate validation report
 */
export async function generateValidationReport(planId) {
  try {
    const validation = await validateBenefitsReviewPlan(planId);

    const report = {
      plan_id: planId,
      validation_date: new Date().toISOString(),
      is_valid: validation.is_valid,
      criteria_passed: validation.criteria.length,
      warnings_count: validation.warnings.length,
      errors_count: validation.errors.length,
      criteria: validation.criteria,
      warnings: validation.warnings,
      errors: validation.errors,
      summary: generateValidationSummary(validation),
    };

    return report;
  } catch (error) {
    console.error('Error generating validation report:', error);
    throw error;
  }
}

function generateValidationSummary(validation) {
  if (validation.is_valid && validation.warnings.length === 0) {
    return 'All quality criteria met. Benefits Review Plan is complete and ready for approval.';
  }

  if (validation.is_valid) {
    return `Plan is valid with ${validation.warnings.length} warning(s). Review recommendations before approval.`;
  }

  return `Plan has ${validation.errors.length} error(s) and ${validation.warnings.length} warning(s). Please address errors before submission.`;
}

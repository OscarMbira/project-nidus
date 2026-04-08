/**
 * Benefits Review Plan Business Case Integration Service
 * Handles linking and syncing with Business Case documents
 */

import { platformDb } from './supabaseClient';
import { getProjectDocuments } from './documentGovernanceService';
import { getBenefits } from './benefitsService';
import { getPlanBenefits, addBenefitToPlan } from './benefitsReviewPlanService';

/**
 * Find Business Case document for a project
 * Looks for document_type with name containing "Business Case" or "business_case"
 */
export async function findBusinessCaseDocument(projectId) {
  try {
    // Get all project documents
    const documents = await getProjectDocuments(projectId);
    
    // Find business case document by checking document type name
    const businessCase = documents.find(doc => {
      const typeName = doc.document_types?.name?.toLowerCase() || '';
      return typeName.includes('business case') || 
             typeName.includes('business_case') ||
             doc.title?.toLowerCase().includes('business case');
    });

    return businessCase || null;
  } catch (error) {
    console.error('Error finding business case document:', error);
    throw error;
  }
}

/**
 * Link Benefits Review Plan to Business Case document
 */
export async function linkBusinessCase(planId, businessCaseDocumentId) {
  try {
    const { error } = await platformDb
      .from('benefits_review_plans')
      .update({ 
        business_case_document_id: businessCaseDocumentId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', planId);

    if (error) throw error;

    return { success: true, message: 'Business Case linked successfully' };
  } catch (error) {
    console.error('Error linking business case:', error);
    throw error;
  }
}

/**
 * Get linked Business Case document for a plan
 */
export async function getLinkedBusinessCase(planId) {
  try {
    const { data: plan, error } = await platformDb
      .from('benefits_review_plans')
      .select(`
        business_case_document_id,
        business_case_document:business_case_document_id (
          id,
          title,
          description,
          current_version,
          status,
          file_name,
          file_path,
          document_types (
            id,
            name,
            category
          ),
          projects (
            id,
            project_name,
            project_code
          )
        )
      `)
      .eq('id', planId)
      .single();

    if (error) throw error;

    return plan?.business_case_document || null;
  } catch (error) {
    console.error('Error fetching linked business case:', error);
    throw error;
  }
}

/**
 * Sync benefits from Business Case to Review Plan
 * Adds any benefits from Business Case that aren't yet in the review plan
 */
export async function syncBenefitsFromBusinessCase(planId, projectId) {
  try {
    // Get all benefits for the project
    const allBenefits = await getBenefits({ project_id: projectId });
    
    // Get benefits already in the review plan
    const planBenefits = await getPlanBenefits(planId);
    const coveredBenefitIds = new Set(planBenefits.map(pb => pb.benefit_id));

    // Filter out dis-benefits and already covered benefits
    const newBenefits = allBenefits.filter(b => 
      !b.is_dis_benefit && 
      !coveredBenefitIds.has(b.id)
    );

    if (newBenefits.length === 0) {
      return { 
        success: true, 
        message: 'All benefits already covered',
        added_count: 0 
      };
    }

    // Add new benefits to the plan
    const addedBenefits = await Promise.all(
      newBenefits.map(benefit =>
        addBenefitToPlan(planId, benefit.id, {
          included_in_scope: true,
          priority: 'medium',
        }).catch(error => {
          console.error(`Error adding benefit ${benefit.id}:`, error);
          return null;
        })
      )
    );

    const successfullyAdded = addedBenefits.filter(b => b !== null);

    return {
      success: true,
      message: `Added ${successfullyAdded.length} benefit(s) from Business Case`,
      added_count: successfullyAdded.length,
      benefits: successfullyAdded,
    };
  } catch (error) {
    console.error('Error syncing benefits from business case:', error);
    throw error;
  }
}

/**
 * Auto-link Business Case if it exists for the project
 */
export async function autoLinkBusinessCase(planId, projectId) {
  try {
    const businessCase = await findBusinessCaseDocument(projectId);
    
    if (businessCase) {
      await linkBusinessCase(planId, businessCase.id);
      return { 
        success: true, 
        business_case: businessCase,
        message: 'Business Case auto-linked successfully' 
      };
    }

    return { 
      success: false, 
      message: 'No Business Case document found for this project' 
    };
  } catch (error) {
    console.error('Error auto-linking business case:', error);
    throw error;
  }
}

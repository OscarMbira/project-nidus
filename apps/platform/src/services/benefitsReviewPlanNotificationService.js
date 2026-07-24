/**
 * Benefits Review Plan Notification Service
 * Handles notifications for Benefits Review Plan events
 */

import { triggerNotification } from './notificationIntegrationService';
import { sendEmail } from './emailIntegrationService';
import { getBenefitsReviewPlan } from './benefitsReviewPlanService';
import { getApprovals, getMyPendingApprovals } from './benefitsReviewPlanService';
import { getReviewSchedule, getUpcomingReviews, getOverdueReviews } from './benefitsReviewPlanService';
import { platformDb } from './supabaseClient';

/**
 * Notify approvers when approval is requested
 */
export async function notifyApprovalRequested(planId, approverIds = []) {
  try {
    const plan = await getBenefitsReviewPlan(planId);
    if (!plan) throw new Error('Benefits Review Plan not found');

    const approvers = await Promise.all(
      approverIds.map(async (userId) => {
        const { data } = await platformDb
          .from('users')
          .select('id, email, full_name')
          .eq('id', userId)
          .single();

        return data;
      })
    );

    const notificationPromises = approvers
      .filter(approver => approver?.email)
      .map(approver => 
        sendEmail({
          to_email: approver.email,
          subject: `Benefits Review Plan Approval Requested: ${plan.document_ref || plan.id}`,
          body_html: generateApprovalRequestEmail(plan, approver),
          project_id: plan.project_id,
        })
      );

    await Promise.all(notificationPromises);

    // Also trigger notification system event
    await triggerNotification('benefits_review_plan.approval_requested', {
      project_id: plan.project_id,
      plan_id: planId,
      document_ref: plan.document_ref,
      approver_ids: approverIds,
      message: `Benefits Review Plan "${plan.document_ref || plan.id}" requires approval`,
    });

    return { success: true, message: 'Notifications sent' };
  } catch (error) {
    console.error('Error sending approval request notifications:', error);
    throw error;
  }
}

/**
 * Notify when approval decision is made
 */
export async function notifyApprovalDecision(planId, approvalId, decision, comments = '') {
  try {
    const plan = await getBenefitsReviewPlan(planId);
    if (!plan) throw new Error('Benefits Review Plan not found');

    const approvals = await getApprovals(planId);
    const approval = approvals.find(a => a.id === approvalId);
    if (!approval) throw new Error('Approval not found');

    // Get plan owner/author
    const ownerId = plan.owner_user_id || plan.author_user_id;
    if (!ownerId) return { success: true };

    const { data: owner } = await platformDb
      .from('users')
      .select('id, email, full_name')
      .eq('id', ownerId)
      .single();

    if (owner?.email) {
      await sendEmail({
        to_email: owner.email,
        subject: `Benefits Review Plan ${decision}: ${plan.document_ref || plan.id}`,
        body_html: generateApprovalDecisionEmail(plan, approval, decision, comments),
        project_id: plan.project_id,
      });
    }

    // Trigger notification event
    await triggerNotification('benefits_review_plan.approval_decided', {
      project_id: plan.project_id,
      plan_id: planId,
      document_ref: plan.document_ref,
      decision,
      approver_id: approval.approver_user_id,
      message: `Benefits Review Plan "${plan.document_ref || plan.id}" ${decision}`,
    });

    return { success: true, message: 'Notification sent' };
  } catch (error) {
    console.error('Error sending approval decision notification:', error);
    throw error;
  }
}

/**
 * Notify recipients when plan is distributed
 */
export async function notifyDistribution(planId, distributionIds = []) {
  try {
    const plan = await getBenefitsReviewPlan(planId);
    if (!plan) throw new Error('Benefits Review Plan not found');

    const { data: distributionList } = await platformDb
      .from('benefits_review_plan_distribution')
      .select(`
        *,
        recipient:users!recipient_user_id(id, email, full_name)
      `)
      .in('id', distributionIds)
      .eq('is_deleted', false);

    if (!distributionList) return { success: true };

    const emailPromises = distributionList
      .filter(item => item.recipient_email || item.recipient?.email)
      .map(item => {
        const email = item.recipient_email || item.recipient?.email;
        const name = item.recipient_name || item.recipient?.full_name || 'Recipient';

        return sendEmail({
          to_email: email,
          subject: `Benefits Review Plan Distributed: ${plan.document_ref || plan.id}`,
          body_html: generateDistributionEmail(plan, name, item),
          project_id: plan.project_id,
        });
      });

    await Promise.all(emailPromises);

    // Trigger notification event
    await triggerNotification('benefits_review_plan.distributed', {
      project_id: plan.project_id,
      plan_id: planId,
      document_ref: plan.document_ref,
      recipient_count: distributionList.length,
      message: `Benefits Review Plan "${plan.document_ref || plan.id}" distributed to ${distributionList.length} recipient(s)`,
    });

    return { success: true, message: 'Distribution notifications sent' };
  } catch (error) {
    console.error('Error sending distribution notifications:', error);
    throw error;
  }
}

/**
 * Check and notify about upcoming reviews
 */
export async function checkAndNotifyUpcomingReviews(projectId, daysAhead = 7) {
  try {
    const upcoming = await getUpcomingReviews(projectId, daysAhead);
    
    if (!upcoming || upcoming.length === 0) {
      return { success: true, message: 'No upcoming reviews', count: 0 };
    }

    const notificationPromises = upcoming.map(async (review) => {
      const plan = await getBenefitsReviewPlan(review.benefits_review_plan_id);
      if (!plan) return null;

      // Get reviewers and accountable persons
      const notifyUserIds = new Set();
      if (review.reviewer_user_id) notifyUserIds.add(review.reviewer_user_id);
      if (review.benefit?.accountable_user_id) notifyUserIds.add(review.benefit.accountable_user_id);

      const { data: users } = await platformDb
        .from('users')
        .select('id, email, full_name')
        .in('id', Array.from(notifyUserIds))
        .eq('is_deleted', false);

      const emailPromises = users
        ?.filter(user => user.email)
        .map(user =>
          sendEmail({
            to_email: user.email,
            subject: `Upcoming Benefits Review: ${review.review_name}`,
            body_html: generateUpcomingReviewEmail(review, plan, user),
            project_id: projectId,
          })
        ) || [];

      return Promise.all(emailPromises);
    });

    await Promise.all(notificationPromises);

    // Trigger notification event
    await triggerNotification('benefits_review_plan.upcoming_reviews', {
      project_id: projectId,
      review_count: upcoming.length,
      days_ahead: daysAhead,
      message: `${upcoming.length} review(s) scheduled in next ${daysAhead} days`,
    });

    return { success: true, count: upcoming.length };
  } catch (error) {
    console.error('Error checking upcoming reviews:', error);
    throw error;
  }
}

/**
 * Check and notify about overdue reviews
 */
export async function checkAndNotifyOverdueReviews(projectId) {
  try {
    const overdue = await getOverdueReviews(projectId);
    
    if (!overdue || overdue.length === 0) {
      return { success: true, message: 'No overdue reviews', count: 0 };
    }

    const notificationPromises = overdue.map(async (review) => {
      const plan = await getBenefitsReviewPlan(review.benefits_review_plan_id);
      if (!plan) return null;

      // Get reviewers and accountable persons
      const notifyUserIds = new Set();
      if (review.reviewer_user_id) notifyUserIds.add(review.reviewer_user_id);
      if (review.benefit?.accountable_user_id) notifyUserIds.add(review.benefit.accountable_user_id);
      if (plan.owner_user_id) notifyUserIds.add(plan.owner_user_id);

      const { data: users } = await platformDb
        .from('users')
        .select('id, email, full_name')
        .in('id', Array.from(notifyUserIds))
        .eq('is_deleted', false);

      const emailPromises = users
        ?.filter(user => user.email)
        .map(user =>
          sendEmail({
            to_email: user.email,
            subject: `⚠️ Overdue Benefits Review: ${review.review_name}`,
            body_html: generateOverdueReviewEmail(review, plan, user),
            project_id: projectId,
          })
        ) || [];

      return Promise.all(emailPromises);
    });

    await Promise.all(notificationPromises);

    // Trigger notification event
    await triggerNotification('benefits_review_plan.overdue_reviews', {
      project_id: projectId,
      review_count: overdue.length,
      message: `${overdue.length} overdue review(s) require attention`,
    });

    return { success: true, count: overdue.length };
  } catch (error) {
    console.error('Error checking overdue reviews:', error);
    throw error;
  }
}

/**
 * Notify pending approvers about their pending approvals
 */
export async function notifyPendingApprovals(userId) {
  try {
    const { data: user } = await platformDb
      .from('users')
      .select('id, email, full_name')
      .eq('id', userId)
      .single();

    if (!user?.email) return { success: true };

    // Get all pending approvals for this user across all plans
    const pendingApprovals = await getMyPendingApprovals(userId);

    if (!pendingApprovals || pendingApprovals.length === 0) {
      return { success: true, count: 0 };
    }

    await sendEmail({
      to_email: user.email,
      subject: `You have ${pendingApprovals.length} pending Benefits Review Plan approval(s)`,
      body_html: generatePendingApprovalsEmail(pendingApprovals, user),
    });

    return { success: true, count: pendingApprovals.length };
  } catch (error) {
    console.error('Error sending pending approvals notification:', error);
    throw error;
  }
}

// Email template generators

function generateApprovalRequestEmail(plan, approver) {
  const planLink = `${window.location.origin}/app/projects/${plan.project_id}/benefits/review-plan`;
  
  return `
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2>Benefits Review Plan Approval Requested</h2>
        <p>Hello ${approver.full_name || approver.email},</p>
        <p>A Benefits Review Plan requires your approval:</p>
        <ul>
          <li><strong>Document Ref:</strong> ${plan.document_ref || 'N/A'}</li>
          <li><strong>Project:</strong> ${plan.project?.project_name || plan.project?.project_code || 'N/A'}</li>
          <li><strong>Version:</strong> ${plan.version_number || '1.0'}</li>
          <li><strong>Author:</strong> ${plan.author?.full_name || plan.author?.email || 'N/A'}</li>
        </ul>
        <p><a href="${planLink}" style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Review Plan</a></p>
        <p>Please review and provide your approval decision.</p>
        <hr>
        <p style="font-size: 12px; color: #666;">This is an automated notification from Nidus PMO Platform.</p>
      </body>
    </html>
  `;
}

function generateApprovalDecisionEmail(plan, approval, decision, comments) {
  const planLink = `${window.location.origin}/app/projects/${plan.project_id}/benefits/review-plan`;
  const decisionText = decision === 'approved' ? 'Approved' : decision === 'rejected' ? 'Rejected' : 'Changes Requested';
  
  return `
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2>Benefits Review Plan ${decisionText}</h2>
        <p>The Benefits Review Plan has been ${decisionText.toLowerCase()}:</p>
        <ul>
          <li><strong>Document Ref:</strong> ${plan.document_ref || 'N/A'}</li>
          <li><strong>Project:</strong> ${plan.project?.project_name || plan.project?.project_code || 'N/A'}</li>
          <li><strong>Approver:</strong> ${approval.approver?.full_name || approval.approver_name || 'N/A'}</li>
          ${comments ? `<li><strong>Comments:</strong> ${comments}</li>` : ''}
        </ul>
        <p><a href="${planLink}" style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Plan</a></p>
        <hr>
        <p style="font-size: 12px; color: #666;">This is an automated notification from Nidus PMO Platform.</p>
      </body>
    </html>
  `;
}

function generateDistributionEmail(plan, recipientName, distributionItem) {
  const planLink = `${window.location.origin}/app/projects/${plan.project_id}/benefits/review-plan`;
  
  return `
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2>Benefits Review Plan Distributed</h2>
        <p>Hello ${recipientName},</p>
        <p>A Benefits Review Plan has been distributed to you:</p>
        <ul>
          <li><strong>Document Ref:</strong> ${plan.document_ref || 'N/A'}</li>
          <li><strong>Project:</strong> ${plan.project?.project_name || plan.project?.project_code || 'N/A'}</li>
          <li><strong>Version:</strong> ${distributionItem.version_issued || plan.version_number || '1.0'}</li>
          <li><strong>Distribution Method:</strong> ${distributionItem.distribution_method || 'Portal'}</li>
        </ul>
        <p><a href="${planLink}" style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Plan</a></p>
        <p>Please review and acknowledge receipt of this document.</p>
        <hr>
        <p style="font-size: 12px; color: #666;">This is an automated notification from Nidus PMO Platform.</p>
      </body>
    </html>
  `;
}

function generateUpcomingReviewEmail(review, plan, user) {
  const reviewDate = new Date(review.planned_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const planLink = `${window.location.origin}/app/projects/${plan.project_id}/benefits/review-plan?tab=schedule`;
  
  return `
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2>Upcoming Benefits Review</h2>
        <p>Hello ${user.full_name || user.email},</p>
        <p>You have a benefits review scheduled:</p>
        <ul>
          <li><strong>Review Name:</strong> ${review.review_name}</li>
          <li><strong>Review Type:</strong> ${review.review_type?.replace(/_/g, ' ') || 'Benefit Review'}</li>
          <li><strong>Planned Date:</strong> ${reviewDate}</li>
          <li><strong>Benefit:</strong> ${review.benefit?.benefit_name || 'All Benefits'}</li>
          ${review.review_location ? `<li><strong>Location:</strong> ${review.review_location}</li>` : ''}
          ${review.meeting_link ? `<li><strong>Meeting Link:</strong> <a href="${review.meeting_link}">${review.meeting_link}</a></li>` : ''}
        </ul>
        <p><a href="${planLink}" style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Review Schedule</a></p>
        <hr>
        <p style="font-size: 12px; color: #666;">This is an automated notification from Nidus PMO Platform.</p>
      </body>
    </html>
  `;
}

function generateOverdueReviewEmail(review, plan, user) {
  const reviewDate = new Date(review.planned_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const planLink = `${window.location.origin}/app/projects/${plan.project_id}/benefits/review-plan?tab=schedule`;
  
  return `
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2>⚠️ Overdue Benefits Review</h2>
        <p>Hello ${user.full_name || user.email},</p>
        <p><strong>This benefits review is overdue and requires your attention:</strong></p>
        <ul>
          <li><strong>Review Name:</strong> ${review.review_name}</li>
          <li><strong>Planned Date:</strong> ${reviewDate}</li>
          <li><strong>Benefit:</strong> ${review.benefit?.benefit_name || 'All Benefits'}</li>
          <li><strong>Days Overdue:</strong> ${Math.floor((new Date() - new Date(review.planned_date)) / (1000 * 60 * 60 * 24))} days</li>
        </ul>
        <p><a href="${planLink}" style="background-color: #dc2626; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Complete Review</a></p>
        <p>Please complete this review as soon as possible.</p>
        <hr>
        <p style="font-size: 12px; color: #666;">This is an automated notification from Nidus PMO Platform.</p>
      </body>
    </html>
  `;
}

function generatePendingApprovalsEmail(pendingApprovals, user) {
  const approvalsList = pendingApprovals.map(approval => {
    const planLink = `${window.location.origin}/app/projects/${approval.plan?.project_id}/benefits/review-plan`;
    return `
      <li>
        <strong>${approval.plan?.document_ref || approval.plan_id}:</strong> 
        ${approval.plan?.project?.project_name || 'N/A'}
        <a href="${planLink}">View</a>
      </li>
    `;
  }).join('');

  return `
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2>Pending Benefits Review Plan Approvals</h2>
        <p>Hello ${user.full_name || user.email},</p>
        <p>You have <strong>${pendingApprovals.length}</strong> pending approval(s):</p>
        <ul>
          ${approvalsList}
        </ul>
        <p>Please review and provide your approval decisions.</p>
        <hr>
        <p style="font-size: 12px; color: #666;">This is an automated notification from Nidus PMO Platform.</p>
      </body>
    </html>
  `;
}

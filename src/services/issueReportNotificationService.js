/**
 * Issue Report Notification Service
 * Handles notifications for Issue Report events
 */

import { triggerNotification } from './notificationIntegrationService';
import { sendEmail } from './emailIntegrationService';
import { getIssueReportById } from './issueReportService';
import { getApprovals } from './issueReportApprovalService';
import { getDistributionList } from './issueReportDistributionService';
import { supabase } from './supabaseClient';

/**
 * Notify approvers when report is submitted for approval
 */
export async function notifyReportSubmitted(reportId, submittedToId = null) {
  try {
    const report = await getIssueReportById(reportId);
    if (!report) throw new Error('Issue Report not found');

    const approvals = await getApprovals(reportId);
    const approvers = approvals
      .filter(a => a.approval_status === 'pending')
      .map(a => a.approver_id)
      .filter(Boolean);

    // Get approver details
    const approverDetails = await Promise.all(
      approvers.map(async (userId) => {
        const { data } = await supabase
          .from('users')
          .select('id, email, full_name, auth_user_id')
          .eq('id', userId)
          .single();

        return data;
      })
    );

    // Send email notifications
    const emailPromises = approverDetails
      .filter(approver => approver?.email)
      .map(approver =>
        sendEmail({
          to_email: approver.email,
          subject: `Issue Report Approval Requested: ${report.report_reference}`,
          body_html: generateApprovalRequestEmail(report, approver),
          project_id: report.project_id,
        })
      );

    await Promise.all(emailPromises);

    // Trigger notification system event
    await triggerNotification('issue_report.submitted', {
      project_id: report.project_id,
      report_id: reportId,
      report_reference: report.report_reference,
      issue_id: report.issue_id,
      approver_ids: approvers,
      message: `Issue Report "${report.report_reference}" has been submitted for approval`,
    });

    return { success: true, message: 'Notifications sent' };
  } catch (error) {
    console.error('Error sending submission notifications:', error);
    throw error;
  }
}

/**
 * Notify when approval decision is made
 */
export async function notifyApprovalDecision(reportId, approvalId, decision, comments = '') {
  try {
    const report = await getIssueReportById(reportId);
    if (!report) throw new Error('Issue Report not found');

    const approvals = await getApprovals(reportId);
    const approval = approvals.find(a => a.id === approvalId);
    if (!approval) throw new Error('Approval not found');

    // Get report author/owner
    const ownerId = report.author_id || report.created_by;
    if (!ownerId) return { success: true };

    const { data: owner } = await supabase
      .from('users')
      .select('id, email, full_name')
      .eq('id', ownerId)
      .single();

    if (owner?.email) {
      await sendEmail({
        to_email: owner.email,
        subject: `Issue Report ${decision}: ${report.report_reference}`,
        body_html: generateApprovalDecisionEmail(report, approval, decision, comments),
        project_id: report.project_id,
      });
    }

    // Trigger notification event
    await triggerNotification('issue_report.approval_decided', {
      project_id: report.project_id,
      report_id: reportId,
      report_reference: report.report_reference,
      issue_id: report.issue_id,
      decision,
      approver_id: approval.approver_id,
      message: `Issue Report "${report.report_reference}" has been ${decision}`,
    });

    return { success: true, message: 'Notification sent' };
  } catch (error) {
    console.error('Error sending approval decision notification:', error);
    throw error;
  }
}

/**
 * Notify recipients when report is distributed
 */
export async function notifyDistribution(reportId) {
  try {
    const report = await getIssueReportById(reportId);
    if (!report) throw new Error('Issue Report not found');

    const distributionList = await getDistributionList(reportId);

    const emailPromises = distributionList
      .filter(item => item.recipient_email || item.recipient?.email)
      .map(item =>
        sendEmail({
          to_email: item.recipient_email || item.recipient?.email,
          subject: `Issue Report Distributed: ${report.report_reference}`,
          body_html: generateDistributionEmail(report, item),
          project_id: report.project_id,
        })
      );

    await Promise.all(emailPromises);

    // Trigger notification event
    await triggerNotification('issue_report.distributed', {
      project_id: report.project_id,
      report_id: reportId,
      report_reference: report.report_reference,
      issue_id: report.issue_id,
      distribution_count: distributionList.length,
      message: `Issue Report "${report.report_reference}" has been distributed to ${distributionList.length} recipients`,
    });

    return { success: true, message: 'Distribution notifications sent' };
  } catch (error) {
    console.error('Error sending distribution notifications:', error);
    throw error;
  }
}

/**
 * Notify when report requires decision
 */
export async function notifyDecisionRequired(reportId) {
  try {
    const report = await getIssueReportById(reportId);
    if (!report || !report.decision_required) return { success: true };

    // Get decision maker (if specified by role)
    const decisionMaker = report.decision_by;
    
    // Trigger notification for Project Board
    await triggerNotification('issue_report.decision_required', {
      project_id: report.project_id,
      report_id: reportId,
      report_reference: report.report_reference,
      issue_id: report.issue_id,
      decision_by: decisionMaker,
      message: `Issue Report "${report.report_reference}" requires a decision from ${decisionMaker || 'Project Board'}`,
    });

    return { success: true, message: 'Decision required notification sent' };
  } catch (error) {
    console.error('Error sending decision required notification:', error);
    throw error;
  }
}

// Email template generators

function generateApprovalRequestEmail(report, approver) {
  return `
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2>Issue Report Approval Requested</h2>
        <p>Dear ${approver.full_name || approver.email},</p>
        <p>An Issue Report has been submitted and requires your approval:</p>
        <ul>
          <li><strong>Report Reference:</strong> ${report.report_reference}</li>
          <li><strong>Issue:</strong> ${report.issue_title}</li>
          <li><strong>Issue Identifier:</strong> ${report.issue_identifier}</li>
          <li><strong>Version:</strong> ${report.version_no}</li>
          <li><strong>Report Date:</strong> ${new Date(report.report_date).toLocaleDateString()}</li>
        </ul>
        <p>Please review the report and provide your approval decision.</p>
        <p>You can access the report through the project management system.</p>
        <p>Best regards,<br>Project Management System</p>
      </body>
    </html>
  `;
}

function generateApprovalDecisionEmail(report, approval, decision, comments) {
  return `
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2>Issue Report ${decision.charAt(0).toUpperCase() + decision.slice(1)}</h2>
        <p>Dear ${report.author?.full_name || 'Report Author'},</p>
        <p>The Issue Report "${report.report_reference}" has been ${decision}.</p>
        <ul>
          <li><strong>Report Reference:</strong> ${report.report_reference}</li>
          <li><strong>Issue:</strong> ${report.issue_title}</li>
          <li><strong>Approver:</strong> ${approval.approver_name}</li>
          <li><strong>Decision:</strong> ${decision}</li>
          ${comments ? `<li><strong>Comments:</strong> ${comments}</li>` : ''}
        </ul>
        <p>You can access the report through the project management system.</p>
        <p>Best regards,<br>Project Management System</p>
      </body>
    </html>
  `;
}

function generateDistributionEmail(report, distributionItem) {
  return `
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2>Issue Report Distributed</h2>
        <p>Dear ${distributionItem.recipient_name || 'Recipient'},</p>
        <p>An Issue Report has been distributed to you:</p>
        <ul>
          <li><strong>Report Reference:</strong> ${report.report_reference}</li>
          <li><strong>Issue:</strong> ${report.issue_title}</li>
          <li><strong>Version:</strong> ${distributionItem.version_distributed || report.version_no}</li>
          <li><strong>Report Date:</strong> ${new Date(report.report_date).toLocaleDateString()}</li>
        </ul>
        <p>Please review the report and acknowledge receipt.</p>
        <p>You can access the report through the project management system.</p>
        <p>Best regards,<br>Project Management System</p>
      </body>
    </html>
  `;
}

export default {
  notifyReportSubmitted,
  notifyApprovalDecision,
  notifyDistribution,
  notifyDecisionRequired
};

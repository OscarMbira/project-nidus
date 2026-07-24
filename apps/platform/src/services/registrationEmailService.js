/**
 * Registration Email Service
 * Handles email sending for registration flow (organisation verification, trial reminders, etc.)
 */

import { platformDb } from './supabase/supabaseClient';
import { sendEmail } from './emailIntegrationService';
import { getBranding, buildBrandedEmailHeader, buildBrandedEmailFooter } from './brandingService';

/**
 * Send organisation verification email
 * @param {string} accountId - Account ID
 * @param {string} userEmail - User email address
 * @param {string} organisationName - Organisation name
 * @param {string} verificationToken - Verification token
 * @returns {Promise<{success: boolean, error: string|null}>}
 */
export async function sendOrganisationVerificationEmail(
  accountId,
  userEmail,
  organisationName,
  verificationToken
) {
  try {
    const branding = accountId ? await getBranding(accountId) : null;
    const verificationLink = `${window.location.origin}/onboarding/verify-organisation?token=${verificationToken}`;

    const subject = `Verify Your Organisation - ${organisationName}`;
    const body = generateOrganisationVerificationEmail(organisationName, verificationLink, branding);

    // Send email via email service
    const result = await sendEmail(userEmail, subject, body, 'organisation-verification');

    if (!result.success) {
      console.error('Failed to send organisation verification email:', result.message);
      return {
        success: false,
        error: result.message || 'Failed to send verification email'
      };
    }

    return {
      success: true,
      error: null
    };
  } catch (error) {
    console.error('Error sending organisation verification email:', error);
    return {
      success: false,
      error: error.message || 'Failed to send verification email'
    };
  }
}

/**
 * Send trial expiry warning email (3 days)
 * @param {string} userEmail - User email address
 * @param {string} projectName - Project name
 * @param {number} daysRemaining - Days remaining in trial
 * @param {string} expiryDate - Expiry date (formatted)
 * @param {string} projectId - Project ID for upgrade link
 * @returns {Promise<{success: boolean, error: string|null}>}
 */
export async function sendTrialExpiryWarning3Days(
  userEmail,
  projectName,
  daysRemaining,
  expiryDate,
  projectId,
  accountId = null
) {
  try {
    const branding = accountId ? await getBranding(accountId) : null;
    const upgradeLink = `${window.location.origin}/upgrade/trial?project_id=${projectId}`;
    const subject = `Your trial expires in 3 days - ${projectName}`;
    const body = generateTrialExpiryWarningEmail(projectName, daysRemaining, expiryDate, upgradeLink, 3, branding);

    const result = await sendEmail(userEmail, subject, body, 'trial-expiry-warning-3days');

    return {
      success: result.success || false,
      error: result.success ? null : (result.message || 'Failed to send email')
    };
  } catch (error) {
    console.error('Error sending 3-day trial warning:', error);
    return {
      success: false,
      error: error.message || 'Failed to send email'
    };
  }
}

/**
 * Send trial expiry warning email (1 day)
 * @param {string} userEmail - User email address
 * @param {string} projectName - Project name
 * @param {number} daysRemaining - Days remaining in trial
 * @param {string} expiryDate - Expiry date (formatted)
 * @param {string} projectId - Project ID for upgrade link
 * @returns {Promise<{success: boolean, error: string|null}>}
 */
export async function sendTrialExpiryWarning1Day(
  userEmail,
  projectName,
  daysRemaining,
  expiryDate,
  projectId,
  accountId = null
) {
  try {
    const branding = accountId ? await getBranding(accountId) : null;
    const upgradeLink = `${window.location.origin}/upgrade/trial?project_id=${projectId}`;
    const subject = `⚠️ Your trial expires tomorrow - ${projectName}`;
    const body = generateTrialExpiryWarningEmail(projectName, daysRemaining, expiryDate, upgradeLink, 1, branding);

    const result = await sendEmail(userEmail, subject, body, 'trial-expiry-warning-1day');

    return {
      success: result.success || false,
      error: result.success ? null : (result.message || 'Failed to send email')
    };
  } catch (error) {
    console.error('Error sending 1-day trial warning:', error);
    return {
      success: false,
      error: error.message || 'Failed to send email'
    };
  }
}

/**
 * Send trial expired notification email
 * @param {string} userEmail - User email address
 * @param {string} projectName - Project name
 * @param {string} projectId - Project ID for upgrade link
 * @returns {Promise<{success: boolean, error: string|null}>}
 */
export async function sendTrialExpiredEmail(
  userEmail,
  projectName,
  projectId,
  accountId = null
) {
  try {
    const branding = accountId ? await getBranding(accountId) : null;
    const upgradeLink = `${window.location.origin}/upgrade/trial?project_id=${projectId}`;
    const subject = `Your trial has expired - Upgrade to continue`;
    const body = generateTrialExpiredEmail(projectName, upgradeLink, branding);

    const result = await sendEmail(userEmail, subject, body, 'trial-expired');

    return {
      success: result.success || false,
      error: result.success ? null : (result.message || 'Failed to send email')
    };
  } catch (error) {
    console.error('Error sending trial expired email:', error);
    return {
      success: false,
      error: error.message || 'Failed to send email'
    };
  }
}

/**
 * Send payment success confirmation email
 * @param {string} userEmail - User email address
 * @param {string} projectName - Project name
 * @param {object} subscriptionDetails - Subscription details
 * @returns {Promise<{success: boolean, error: string|null}>}
 */
export async function sendPaymentSuccessEmail(
  userEmail,
  projectName,
  subscriptionDetails,
  accountId = null
) {
  try {
    const branding = accountId ? await getBranding(accountId) : null;
    const dashboardLink = `${window.location.origin}/platform/dashboard`;
    const subject = `Payment Successful - Your Subscription is Active`;
    const body = generatePaymentSuccessEmail(projectName, subscriptionDetails, dashboardLink, branding);

    const result = await sendEmail(userEmail, subject, body, 'payment-success');

    return {
      success: result.success || false,
      error: result.success ? null : (result.message || 'Failed to send email')
    };
  } catch (error) {
    console.error('Error sending payment success email:', error);
    return {
      success: false,
      error: error.message || 'Failed to send email'
    };
  }
}

// ============================================================================
// EMAIL TEMPLATE GENERATORS
// ============================================================================

/**
 * Generate organisation verification email HTML
 */
function generateOrganisationVerificationEmail(organisationName, verificationLink, branding = null) {
  const btnColor = branding?.primary_color || '#667eea';
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      ${buildBrandedEmailHeader(branding, 'Verify Your Organisation')}

      <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
        <p>Hello,</p>

        <p>Thank you for creating your organisation <strong>${organisationName}</strong> on our platform.</p>

        <p>To complete your registration and start creating projects, please verify your organisation by clicking the button below:</p>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationLink}" target="_blank" rel="noopener noreferrer" style="background: ${btnColor}; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
            Verify Organisation
          </a>
        </div>

        <p>Or copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: ${btnColor};">${verificationLink}</p>

        <p><strong>This link will expire in 24 hours.</strong></p>

        <p>If you didn't create this organisation, please ignore this email.</p>

        ${buildBrandedEmailFooter(branding)}
      </div>
    </body>
    </html>
  `;
}

/**
 * Generate trial expiry warning email HTML
 */
function generateTrialExpiryWarningEmail(projectName, daysRemaining, expiryDate, upgradeLink, warningType, branding = null) {
  const isUrgent = warningType === 1;
  const urgencyColor = isUrgent ? '#fa709a' : '#f5576c';
  const title = isUrgent ? '⚠️ Final Warning' : '⏰ Trial Expiring Soon';
  const btnColor = branding?.primary_color || urgencyColor;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      ${buildBrandedEmailHeader(branding, title)}

      <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
        <p>Hello,</p>

        ${isUrgent
          ? `<p><strong style="color: ${urgencyColor}; font-size: 18px;">Your trial expires tomorrow!</strong></p>`
          : `<p>Your trial project <strong>${projectName}</strong> will expire in <strong style="color: ${urgencyColor};">${daysRemaining} days</strong>.</p>`
        }

        <div style="background: white; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid ${urgencyColor};">
          <p style="margin: 0;"><strong>Days Remaining:</strong> ${daysRemaining}</p>
          <p style="margin: 5px 0 0 0;"><strong>Expiry Date:</strong> ${expiryDate}</p>
        </div>

        <p>To continue using your project and unlock all features, upgrade to a paid subscription:</p>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${upgradeLink}" target="_blank" rel="noopener noreferrer" style="background: ${btnColor}; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
            Upgrade Now
          </a>
        </div>

        <p><strong>Benefits of upgrading:</strong></p>
        <ul>
          <li>Unlimited team members</li>
          <li>All advanced features</li>
          <li>Multiple projects</li>
          <li>Priority support</li>
          <li>Your data preserved</li>
        </ul>

        ${buildBrandedEmailFooter(branding)}
      </div>
    </body>
    </html>
  `;
}

/**
 * Generate trial expired email HTML
 */
function generateTrialExpiredEmail(projectName, upgradeLink, branding = null) {
  const btnColor = branding?.primary_color || '#eb3349';
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      ${buildBrandedEmailHeader(branding, '🔒 Trial Expired')}

      <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
        <p>Hello,</p>

        <p>Your trial period for <strong>${projectName}</strong> has ended.</p>

        <div style="background: #f8d7da; border: 2px solid #f5c6cb; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 0; font-weight: bold; color: #721c24;">Your project is now locked</p>
          <p style="margin: 5px 0 0 0; color: #721c24;">Upgrade to unlock and continue working.</p>
        </div>

        <p><strong>Don't worry - all your data is safe!</strong> Your project data has been preserved. Upgrade now to unlock your project and continue where you left off.</p>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${upgradeLink}" target="_blank" rel="noopener noreferrer" style="background: ${btnColor}; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold; font-size: 16px;">
            Unlock My Project
          </a>
        </div>

        <p><strong>What you'll get:</strong></p>
        <ul>
          <li>✅ Full access to your project</li>
          <li>✅ All your data preserved</li>
          <li>✅ Unlimited team members</li>
          <li>✅ All advanced features</li>
          <li>✅ Priority support</li>
        </ul>

        ${buildBrandedEmailFooter(branding)}
      </div>
    </body>
    </html>
  `;
}

/**
 * Generate payment success email HTML
 */
function generatePaymentSuccessEmail(projectName, subscriptionDetails, dashboardLink, branding = null) {
  const { planName, billingCycle, amount, currency, nextBillingDate } = subscriptionDetails;
  const btnColor = branding?.primary_color || '#11998e';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      ${buildBrandedEmailHeader(branding, '✅ Payment Successful')}

      <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
        <p>Hello,</p>

        <p>Thank you for your payment! Your subscription is now active.</p>

        <div style="background: #d4edda; border: 2px solid #c3e6cb; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 0; font-weight: bold; color: #155724;">Subscription Details:</p>
          <p style="margin: 5px 0 0 0;"><strong>Plan:</strong> ${planName}</p>
          <p style="margin: 5px 0 0 0;"><strong>Billing Cycle:</strong> ${billingCycle}</p>
          <p style="margin: 5px 0 0 0;"><strong>Amount:</strong> ${amount} ${currency}</p>
          ${nextBillingDate ? `<p style="margin: 5px 0 0 0;"><strong>Next Billing:</strong> ${nextBillingDate}</p>` : ''}
        </div>

        <p>Your project <strong>${projectName}</strong> is now fully unlocked with all features available.</p>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${dashboardLink}" target="_blank" rel="noopener noreferrer" style="background: ${btnColor}; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
            Go to Dashboard
          </a>
        </div>

        ${buildBrandedEmailFooter(branding)}
      </div>
    </body>
    </html>
  `;
}

export default {
  sendOrganisationVerificationEmail,
  sendTrialExpiryWarning3Days,
  sendTrialExpiryWarning1Day,
  sendTrialExpiredEmail,
  sendPaymentSuccessEmail
};


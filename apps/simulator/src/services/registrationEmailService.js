/**
 * Registration Email Service
 * Handles email sending for registration flow (organisation verification, trial reminders, etc.)
 */

import { platformDb } from './supabase/supabaseClient';
import { sendEmail } from './emailIntegrationService';
import { getBranding, buildBrandedEmailHeader, buildBrandedEmailFooter } from './brandingService';

/**
 * v918-adjacent (see PlatformRegister.jsx/SimulatorRegister.jsx): whether real,
 * token-based account email verification (sendAccountVerificationEmail below,
 * backed by SQL/v929_account_email_verification.sql) is active. ACTIVE
 * (soft-gate design, confirmed): provisioning is never blocked on
 * verification — EmailVerificationStep.jsx sends the link and lets the user
 * continue immediately; GettingStarted.jsx shows a persistent reminder banner
 * until is_verified is true. Matches the brief's target onboarding model
 * (Documentation/SaaS_Industry_Tenant_Provisioning_Revamp_Brief.md §1), which
 * places Email Verification between Professional Role and Tenant Provisioning.
 */
export const ACCOUNT_EMAIL_VERIFICATION_ENABLED = true

/**
 * Send a simple "Welcome to Project Nidus" email after signup. Always
 * non-blocking/best-effort from the caller's side — never throws in a way
 * that should stop registration; callers should fire-and-forget or catch.
 * @param {string} userEmail
 * @param {string} firstName
 * @returns {Promise<{success: boolean, error: string|null}>}
 */
export async function sendWelcomeEmail(userEmail, firstName) {
  try {
    const subject = 'Welcome to Project Nidus'
    const body = generateWelcomeEmail(firstName)
    const result = await sendEmail(userEmail, subject, body, 'welcome')
    return {
      success: result.success || false,
      error: result.success ? null : (result.message || 'Failed to send email'),
    }
  } catch (error) {
    console.error('Error sending welcome email:', error)
    return { success: false, error: error.message || 'Failed to send welcome email' }
  }
}

/**
 * Reads the current user's is_verified flag (soft-gate check — never blocks
 * anything by itself, callers decide what to show based on the result), plus
 * email/first_name so callers (e.g. a "resend" banner) don't need a second query.
 * @returns {Promise<{success: boolean, isVerified: boolean, email: string|null, firstName: string|null, error: string|null}>}
 */
export async function getMyVerificationStatus() {
  try {
    const { data: { user: authUser } } = await platformDb.auth.getUser()
    if (!authUser) return { success: true, isVerified: false, email: null, firstName: null, error: null }
    const { data, error } = await platformDb
      .from('users')
      .select('is_verified, email, first_name')
      .eq('auth_user_id', authUser.id)
      .maybeSingle()
    if (error) throw error
    return {
      success: true,
      isVerified: Boolean(data?.is_verified),
      email: data?.email || authUser.email || null,
      firstName: data?.first_name || null,
      error: null,
    }
  } catch (error) {
    console.error('Error reading verification status:', error)
    return { success: false, isVerified: false, email: null, firstName: null, error: error.message || 'Failed to read verification status' }
  }
}

/**
 * Requests a fresh verification token for the CURRENTLY authenticated user
 * (SQL/v929's request_email_verification() resolves auth.uid() itself — no
 * user id param, so a caller can only ever request their own token).
 * @returns {Promise<{success: boolean, token: string|null, error: string|null}>}
 */
export async function requestEmailVerificationToken() {
  try {
    const { data, error } = await platformDb.rpc('request_email_verification')
    if (error) throw error
    return { success: true, token: data, error: null }
  } catch (error) {
    console.error('Error requesting email verification token:', error)
    return { success: false, token: null, error: error.message || 'Failed to request verification token' }
  }
}

/**
 * Verifies an email-verification token (SQL/v929's verify_email_token()).
 * Token-only — no session required, since the browser clicking the link may
 * not be the same session that requested it.
 * @param {string} token
 * @returns {Promise<{success: boolean, userEmail: string|null, error: string|null}>}
 */
export async function verifyEmailToken(token) {
  try {
    const { data, error } = await platformDb.rpc('verify_email_token', { p_token: token })
    if (error) throw error
    const row = Array.isArray(data) ? data[0] : data
    return { success: Boolean(row?.success), userEmail: row?.user_email || null, error: null }
  } catch (error) {
    console.error('Error verifying email token:', error)
    return { success: false, userEmail: null, error: error.message || 'Failed to verify email' }
  }
}

/**
 * Send the real account-verification email (token-based, SQL/v929). Only
 * meaningful once ACCOUNT_EMAIL_VERIFICATION_ENABLED is true and the caller
 * has already obtained a token via the request_email_verification() RPC.
 * @param {string} userEmail
 * @param {string} firstName
 * @param {string} verificationToken
 * @returns {Promise<{success: boolean, error: string|null}>}
 */
export async function sendAccountVerificationEmail(userEmail, firstName, verificationToken) {
  try {
    const verificationLink = `${window.location.origin}/auth/verify-email?token=${verificationToken}`
    const subject = 'Verify your Project Nidus account'
    const body = generateAccountVerificationEmail(firstName, verificationLink)
    const result = await sendEmail(userEmail, subject, body, 'account-verification')
    return {
      success: result.success || false,
      error: result.success ? null : (result.message || 'Failed to send email'),
    }
  } catch (error) {
    console.error('Error sending account verification email:', error)
    return { success: false, error: error.message || 'Failed to send verification email' }
  }
}

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
 * Generate welcome email HTML
 */
function generateWelcomeEmail(firstName, branding = null) {
  const btnColor = branding?.primary_color || '#667eea'
  const dashboardLink = `${window.location.origin}/platform/getting-started`
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      ${buildBrandedEmailHeader(branding, 'Welcome to Project Nidus')}

      <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
        <p>Hi ${firstName || 'there'},</p>

        <p>Your Project Nidus account is ready. You can jump straight into setting up your workspace.</p>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${dashboardLink}" target="_blank" rel="noopener noreferrer" style="background: ${btnColor}; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
            Get Started
          </a>
        </div>

        <p>If you didn't create this account, you can safely ignore this email.</p>

        ${buildBrandedEmailFooter(branding)}
      </div>
    </body>
    </html>
  `
}

/**
 * Generate account verification email HTML (v929 — inactive until
 * ACCOUNT_EMAIL_VERIFICATION_ENABLED is true)
 */
function generateAccountVerificationEmail(firstName, verificationLink, branding = null) {
  const btnColor = branding?.primary_color || '#667eea'
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      ${buildBrandedEmailHeader(branding, 'Verify Your Account')}

      <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
        <p>Hi ${firstName || 'there'},</p>

        <p>Please verify your email address to finish setting up your Project Nidus account:</p>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationLink}" target="_blank" rel="noopener noreferrer" style="background: ${btnColor}; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
            Verify Email
          </a>
        </div>

        <p>Or copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: ${btnColor};">${verificationLink}</p>

        <p><strong>This link will expire in 24 hours.</strong></p>

        <p>If you didn't create this account, please ignore this email.</p>

        ${buildBrandedEmailFooter(branding)}
      </div>
    </body>
    </html>
  `
}

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
  sendWelcomeEmail,
  sendAccountVerificationEmail,
  requestEmailVerificationToken,
  verifyEmailToken,
  getMyVerificationStatus,
  sendOrganisationVerificationEmail,
  sendTrialExpiryWarning3Days,
  sendTrialExpiryWarning1Day,
  sendTrialExpiredEmail,
  sendPaymentSuccessEmail
};


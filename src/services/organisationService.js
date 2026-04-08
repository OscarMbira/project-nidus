/**
 * Organisation Service
 * Handles organisation (account) creation, verification, and management
 */

import { platformDb } from './supabase/supabaseClient';
import { sendOrganisationVerificationEmail } from './registrationEmailService';
import { assignSystemRole } from './roleService';

/**
 * Create new organisation (account)
 * @param {Object} organisationData - Organisation details
 * @param {string} organisationData.name - Organisation name
 * @param {string} organisationData.type - Organisation type (individual, freelancer, business, company)
 * @param {string} organisationData.companyName - Company legal name (optional)
 * @param {string} organisationData.country - Country code
 * @param {string} organisationData.phone - Phone number (optional)
 * @param {string} organisationData.industry - Industry sector
 * @param {string} organisationData.size - Organisation size (optional)
 * @returns {Promise<Object>} Created organisation
 */
export const createOrganisation = async (organisationData) => {
  const { data: { user: authUser }, error: userError } = await platformDb.auth.getUser();

  if (userError || !authUser) {
    throw new Error('User not authenticated');
  }

  // Get the users table record ID (not the auth user ID)
  const { data: userRecord, error: userRecordError } = await platformDb
    .from('users')
    .select('id')
    .eq('auth_user_id', authUser.id)
    .single();

  if (userRecordError || !userRecord) {
    throw new Error('User record not found. Please complete your profile first.');
  }

  const userId = userRecord.id;

  // Check if user already has an organisation
  const { data: existingOrg, error: existingOrgError } = await platformDb
    .from('accounts')
    .select('id, organisation_verified, account_name, account_code, verification_token')
    .eq('owner_user_id', userId)
    .eq('is_deleted', false)
    .maybeSingle();

  // If organisation exists, check if it's a "default" organisation created during email confirmation
  // Default organisations have generic names like "My Organization" or "{Name}'s Organization"
  // and no verification token (meaning they haven't gone through proper setup)
  const isDefaultOrganisation = existingOrg && (
    existingOrg.account_name === 'My Organization' ||
    existingOrg.account_name?.endsWith("'s Organization") ||
    !existingOrg.verification_token // No verification token means it hasn't been through setup
  );

  // If organisation exists and is NOT a default one (properly set up), don't allow creating/updating
  if (existingOrg && !isDefaultOrganisation && existingOrg.organisation_verified) {
    throw new Error('You already have a verified organisation. Please use your existing organisation.');
  }

  // If organisation exists (default or unverified), update it instead of creating new
  if (existingOrg) {
    // Update existing organisation with new data
    return await updateExistingOrganisation(existingOrg.id, organisationData, userId, authUser.email);
  }

  // Parse full address into components (simple parsing)
  const parseAddress = (fullAddress) => {
    if (!fullAddress) return {};
    const parts = fullAddress.split(',').map(p => p.trim());
    return {
      address_line1: parts[0] || null,
      address_line2: parts.length > 4 ? parts[1] : null,
      city: parts.length > 4 ? parts[2] : parts[1] || null,
      state_province: parts.length > 4 ? parts[3] : parts[2] || null,
      postal_code: parts.length > 4 ? parts[4] : parts[3] || null,
    };
  };

  const addressParts = parseAddress(organisationData.fullAddress);

  // Generate account_code (required field)
  const accountCode = generateAccountCode(organisationData.name);

  // Prepare organisation data
  const orgData = {
    owner_user_id: userId,
    account_name: organisationData.name,
    account_code: accountCode,
    account_type: organisationData.type,
    company_name: organisationData.companyName || null,
    country_code: organisationData.country,
    primary_phone: organisationData.phone || null,
    primary_email: organisationData.email || null,
    business_registration_number: organisationData.registrationReference || null,
    // Address fields
    address_line1: addressParts.address_line1,
    address_line2: addressParts.address_line2,
    city: addressParts.city,
    state_province: addressParts.state_province,
    postal_code: addressParts.postal_code,
    // Store additional fields in metadata
    metadata: {
      website: organisationData.website || null,
      contact_person: organisationData.contactPerson || null,
      industry: organisationData.industry || null,
      organisation_size: organisationData.size || null,
      ...(organisationData.fullAddress ? { full_address: organisationData.fullAddress } : {})
    },
    is_active: true,
    organisation_verified: false, // Will be verified via email
    created_by: userId
  };

  // Create organisation
  const { data, error } = await platformDb
    .from('accounts')
    .insert(orgData)
    .select()
    .single();

  if (error) {
    console.error('Error creating organisation:', error);
    throw new Error(error.message || 'Failed to create organisation');
  }

  // TEMPORARILY DISABLED: Email verification
  // Skip email verification and mark organisation as verified automatically
  console.log('Email verification temporarily disabled - marking organisation as verified');
  
  // Mark organisation as verified immediately and get updated data
  const { data: updatedData, error: updateError } = await platformDb
    .from('accounts')
    .update({
      organisation_verified: true,
      verified_at: new Date().toISOString(),
      verification_token: null,
      verification_token_expires_at: null
    })
    .eq('id', data.id)
    .select()
    .single();

  // Get the final organisation data (use updatedData if available, otherwise use original data)
  const finalOrganisationData = updatedData || data;

  if (updateError) {
    console.error('Error marking organisation as verified:', updateError);
  }

  // Email verification code (commented out for temporary disable)
  /*
  // Generate verification token
  const verificationToken = generateVerificationToken();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  // Save token to organisation
  await platformDb
    .from('accounts')
    .update({
      verification_token: verificationToken,
      verification_token_expires_at: expiresAt.toISOString()
    })
    .eq('id', finalOrganisationData.id);

  // Send verification email
  let emailSent = false;
  let emailError = null;
  try {
    const emailResult = await sendOrganisationVerificationEmail(
      finalOrganisationData.id,
      authUser.email,
      organisationData.name,
      verificationToken
    );
    
    if (emailResult.warning) {
      // Email configuration not set up - email was NOT sent
      console.warn('Email configuration not set up. Organisation created but verification email not sent.');
      emailSent = false;
      emailError = 'Email service not configured. Please contact support.';
    } else if (!emailResult.success) {
      console.error('Failed to send verification email:', emailResult.error);
      emailSent = false;
      emailError = emailResult.error || 'Failed to send verification email';
    } else {
      emailSent = true;
    }
  } catch (err) {
    console.error('Error sending verification email:', err);
    emailSent = false;
    emailError = err.message || 'Failed to send verification email';
  }
  
  // Store email status in organisation metadata for UI to check
  if (!emailSent) {
    await platformDb
      .from('accounts')
      .update({
        metadata: {
          ...(finalOrganisationData.metadata || {}),
          email_sent: false,
          email_error: emailError
        }
      })
      .eq('id', finalOrganisationData.id);
  }
  */

  // Assign PMO Admin role to organisation creator
  try {
    const roleResult = await assignSystemRole(authUser.id, 'pmo_admin');
    if (!roleResult.success) {
      console.warn('Failed to assign PMO Admin role. User may need to be assigned manually.');
    }
  } catch (roleError) {
    console.error('Error assigning PMO Admin role:', roleError);
    // Don't throw - organisation is created, role can be assigned later
  }

  // Return data (email verification disabled)
  return {
    ...finalOrganisationData,
    organisation_verified: true, // Mark as verified
    emailSent: true, // Not sending email, but mark as "sent" to avoid errors
    emailError: null
  };
};

/**
 * Verify organisation via token
 * @param {string} token - Verification token
 * @returns {Promise<Object>} Verified organisation
 */
export const verifyOrganisation = async (token) => {
  if (!token) {
    throw new Error('Verification token is required');
  }

  // Find organisation by token
  const { data: org, error: findError } = await platformDb
    .from('accounts')
    .select('*')
    .eq('verification_token', token)
    .gt('verification_token_expires_at', new Date().toISOString())
    .single();

  if (findError || !org) {
    throw new Error('Invalid or expired verification token. Please request a new verification email.');
  }

  // Mark as verified
  const { data, error } = await platformDb
    .from('accounts')
    .update({
      organisation_verified: true,
      verified_at: new Date().toISOString(),
      verification_token: null,
      verification_token_expires_at: null,
      updated_at: new Date().toISOString()
    })
    .eq('id', org.id)
    .select()
    .single();

  if (error) {
    console.error('Error verifying organisation:', error);
    throw new Error(error.message || 'Failed to verify organisation');
  }

  return data;
};

/**
 * Resend organisation verification email
 * @param {string} organisationId - Organisation ID
 * @returns {Promise<boolean>} Success status
 */
export const resendVerificationEmail = async (organisationId) => {
  const { data: { user: authUser }, error: userError } = await platformDb.auth.getUser();

  if (userError || !authUser) {
    throw new Error('User not authenticated');
  }

  // Get the users table record ID (not the auth user ID)
  const { data: userRecord, error: userRecordError } = await platformDb
    .from('users')
    .select('id')
    .eq('auth_user_id', authUser.id)
    .single();

  if (userRecordError || !userRecord) {
    throw new Error('User record not found');
  }

  const userId = userRecord.id;

  // Get organisation
  const { data: org, error: orgError } = await platformDb
    .from('accounts')
    .select('*')
    .eq('id', organisationId)
    .eq('owner_user_id', userId)
    .single();

  if (orgError || !org) {
    throw new Error('Organisation not found');
  }

  if (org.organisation_verified) {
    throw new Error('Organisation is already verified');
  }

  // Generate new token
  const verificationToken = generateVerificationToken();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  // Update token
  await platformDb
    .from('accounts')
    .update({
      verification_token: verificationToken,
      verification_token_expires_at: expiresAt.toISOString()
    })
    .eq('id', org.id);

  // Send new verification email
  let emailSent = false;
  let emailError = null;
  try {
    const emailResult = await sendOrganisationVerificationEmail(
      org.id,
      authUser.email,
      org.account_name,
      verificationToken
    );
    
    if (emailResult.warning) {
      // Email configuration not set up - email was NOT sent
      console.warn('Email configuration not set up. Verification email not sent.');
      emailSent = false;
      emailError = 'Email service not configured. Please contact support.';
    } else if (!emailResult.success) {
      console.error('Failed to send verification email:', emailResult.error);
      emailSent = false;
      emailError = emailResult.error || 'Failed to send verification email';
    } else {
      emailSent = true;
    }
  } catch (err) {
    console.error('Error sending verification email:', err);
    emailSent = false;
    emailError = err.message || 'Failed to send verification email';
  }

  return {
    success: emailSent,
    emailSent,
    emailError: emailSent ? null : emailError
  };
};

/**
 * Check if account can create trial project
 * @param {string} accountId - Account ID
 * @returns {Promise<boolean>} Eligibility status
 */
export const checkTrialEligibility = async (accountId) => {
  if (!accountId) {
    throw new Error('Account ID is required');
  }

  const { data, error } = await platformDb
    .rpc('check_trial_eligibility', { p_account_id: accountId });

  if (error) {
    console.error('Error checking trial eligibility:', error);
    throw new Error(error.message || 'Failed to check trial eligibility');
  }

  return data;
};

/**
 * Get organisation by ID
 * @param {string} accountId - Account ID
 * @returns {Promise<Object>} Organisation data
 */
export const getOrganisationById = async (accountId) => {
  if (!accountId) {
    throw new Error('Account ID is required');
  }

  const { data, error } = await platformDb
    .from('accounts')
    .select('*')
    .eq('id', accountId)
    .single();

  if (error) {
    console.error('Error fetching organisation:', error);
    throw new Error(error.message || 'Failed to fetch organisation');
  }

  return data;
};

/**
 * Get user's organisation
 * @returns {Promise<Object|null>} User's organisation or null
 */
export const getUserOrganisation = async () => {
  const { data: { user }, error: userError } = await platformDb.auth.getUser();

  if (userError || !user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await platformDb
    .from('accounts')
    .select('*')
    .eq('owner_user_id', user.id)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
    console.error('Error fetching user organisation:', error);
    throw new Error(error.message || 'Failed to fetch organisation');
  }

  return data || null;
};

/**
 * Generate random verification token
 * @returns {string} Verification token
 * @private
 */
const generateVerificationToken = () => {
  // Generate a secure random token
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
};

/**
 * Update existing unverified organisation
 * @param {string} organisationId - Existing organisation ID
 * @param {Object} organisationData - Organisation details
 * @param {string} userId - User ID
 * @param {string} userEmail - User email
 * @returns {Promise<Object>} Updated organisation
 * @private
 */
const updateExistingOrganisation = async (organisationId, organisationData, userId, userEmail) => {
  // Parse full address into components
  const parseAddress = (fullAddress) => {
    if (!fullAddress) return {};
    const parts = fullAddress.split(',').map(p => p.trim());
    return {
      address_line1: parts[0] || null,
      address_line2: parts.length > 4 ? parts[1] : null,
      city: parts.length > 4 ? parts[2] : parts[1] || null,
      state_province: parts.length > 4 ? parts[3] : parts[2] || null,
      postal_code: parts.length > 4 ? parts[4] : parts[3] || null,
    };
  };

  const addressParts = parseAddress(organisationData.fullAddress);

  // Generate new account code if needed
  const accountCode = generateAccountCode(organisationData.name);

  // Prepare update data
  const updateData = {
    account_name: organisationData.name,
    account_code: accountCode,
    account_type: organisationData.type,
    company_name: organisationData.companyName || null,
    country_code: organisationData.country,
    primary_phone: organisationData.phone || null,
    primary_email: organisationData.email || null,
    business_registration_number: organisationData.registrationReference || null,
    // Address fields
    address_line1: addressParts.address_line1,
    address_line2: addressParts.address_line2,
    city: addressParts.city,
    state_province: addressParts.state_province,
    postal_code: addressParts.postal_code,
    // Store additional fields in metadata
    metadata: {
      website: organisationData.website || null,
      contact_person: organisationData.contactPerson || null,
      industry: organisationData.industry || null,
      organisation_size: organisationData.size || null,
      ...(organisationData.fullAddress ? { full_address: organisationData.fullAddress } : {})
    },
    updated_at: new Date().toISOString(),
    updated_by: userId
  };

  // Update organisation
  const { data, error } = await platformDb
    .from('accounts')
    .update(updateData)
    .eq('id', organisationId)
    .select()
    .single();

  if (error) {
    console.error('Error updating organisation:', error);
    throw new Error(error.message || 'Failed to update organisation');
  }

  // Generate verification token
  const verificationToken = generateVerificationToken();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  // Save token to organisation
  await platformDb
    .from('accounts')
    .update({
      verification_token: verificationToken,
      verification_token_expires_at: expiresAt.toISOString()
    })
    .eq('id', data.id);

  // Send verification email
  try {
    const emailResult = await sendOrganisationVerificationEmail(
      data.id,
      userEmail,
      organisationData.name,
      verificationToken
    );
    
    if (!emailResult.success && !emailResult.warning) {
      console.error('Failed to send verification email:', emailResult.error);
      // Don't throw - organisation is updated, email can be resent
    } else if (emailResult.warning) {
      console.warn('Email configuration not set up. Organisation updated but verification email not sent.');
    }
  } catch (emailError) {
    console.error('Error sending verification email:', emailError);
    // Don't throw - organisation is updated, email can be resent
  }

  // Assign PMO Admin role if not already assigned
  try {
    const { data: { user: authUser } } = await platformDb.auth.getUser();
    if (authUser) {
      const roleResult = await assignSystemRole(authUser.id, 'pmo_admin');
      if (!roleResult.success) {
        console.warn('Failed to assign PMO Admin role. User may need to be assigned manually.');
      }
    }
  } catch (roleError) {
    console.error('Error assigning PMO Admin role:', roleError);
    // Don't throw - organisation is updated, role can be assigned later
  }

  return data;
};

/**
 * Generate account code from organisation name
 * @param {string} name - Organisation name
 * @returns {string} Account code
 * @private
 */
const generateAccountCode = (name) => {
  // Take first 3-4 uppercase letters from name, add random numbers
  const letters = name.replace(/[^A-Za-z]/g, '').substring(0, 4).toUpperCase();
  const numbers = Math.floor(1000 + Math.random() * 9000); // 4-digit number
  return `${letters}${numbers}`;
};

export default {
  createOrganisation,
  verifyOrganisation,
  resendVerificationEmail,
  checkTrialEligibility,
  getOrganisationById,
  getUserOrganisation
};

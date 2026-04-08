/**
 * Account Service
 * Handles account (organization) management for Platform
 *
 * IMPORTANT: This is Platform specific - uses appDb (public schema)
 * NOT used by Simulator (which is individual-based, not account-based)
 */

import { appDb } from './supabase/supabaseClient'

/**
 * Create a new account
 * @param {string} ownerUserId - Internal user ID (not auth_user_id)
 * @param {object} accountData - Account information
 * @returns {Promise<{success: boolean, data: object|null, error: string|null}>}
 */
export async function createAccount(ownerUserId, accountData) {
  try {
    // Build insert object with only defined values
    // This prevents undefined values from being converted to string "undefined"
    const insertData = {
      owner_user_id: ownerUserId,
      account_name: accountData.accountName,
      account_type: accountData.accountType || 'individual',
      default_timezone: accountData.defaultTimezone || 'UTC',
      default_currency: accountData.defaultCurrency || 'USD',
      default_language: accountData.defaultLanguage || 'en',
    }

    // Only add optional fields if they have values
    if (accountData.accountCode) insertData.account_code = accountData.accountCode
    if (accountData.companyName) insertData.company_name = accountData.companyName
    if (accountData.billingEmail) insertData.billing_email = accountData.billingEmail
    if (accountData.primaryEmail) insertData.primary_email = accountData.primaryEmail
    if (accountData.primaryPhone) insertData.primary_phone = accountData.primaryPhone
    if (accountData.countryCode) insertData.country_code = accountData.countryCode

    const { data, error } = await appDb
      .from('accounts')
      .insert(insertData)
      .select()
      .single()

    if (error) throw error

    return {
      success: true,
      data: data,
      error: null,
    }
  } catch (error) {
    console.error('Error creating account:', error)
    return {
      success: false,
      data: null,
      error: error.message || 'Failed to create account',
    }
  }
}

/**
 * Get account by ID
 * @param {string} accountId - Account UUID
 * @returns {Promise<{success: boolean, data: object|null, error: string|null}>}
 */
export async function getAccountById(accountId) {
  try {
    // Validate accountId first
    if (!accountId || accountId === 'undefined' || accountId === 'null' || (typeof accountId === 'string' && accountId.trim() === '')) {
      return {
        success: false,
        data: null,
        error: 'Invalid account ID. Account ID is required and must be a valid UUID.',
      }
    }

    const { data, error } = await appDb
      .from('accounts')
      .select('*')
      .eq('id', accountId)
      .eq('is_deleted', false)
      .single()

    if (error) throw error

    return {
      success: true,
      data: data,
      error: null,
    }
  } catch (error) {
    console.error('Error fetching account:', error)
    return {
      success: false,
      data: null,
      error: error.message || 'Failed to fetch account',
    }
  }
}

/**
 * Get accounts for current user (owned or member)
 * Uses the get_user_accounts() database function
 * @returns {Promise<{success: boolean, data: array, error: string|null}>}
 */
export async function getUserAccounts() {
  try {
    const { data: { user } } = await appDb.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data, error } = await appDb.rpc('get_user_accounts', {
      p_auth_user_id: user.id,
    })

    if (error) throw error

    return {
      success: true,
      data: data || [],
      error: null,
    }
  } catch (error) {
    console.error('Error fetching user accounts:', error)
    return {
      success: false,
      data: [],
      error: error.message || 'Failed to fetch accounts',
    }
  }
}

/**
 * Update account details
 * @param {string} accountId - Account UUID
 * @param {object} updates - Fields to update
 * @returns {Promise<{success: boolean, data: object|null, error: string|null}>}
 */
export async function updateAccount(accountId, updates) {
  try {
    // Validate accountId first - must be a valid UUID string, not undefined, null, or empty
    if (!accountId || accountId === 'undefined' || accountId === 'null' || (typeof accountId === 'string' && accountId.trim() === '')) {
      return {
        success: false,
        data: null,
        error: 'Invalid account ID. Account ID is required and must be a valid UUID.',
      }
    }

    // Helper function to check if value is valid (not undefined, null, or empty string)
    const isValid = (value) => value !== undefined && value !== null && value !== ''

    // Build update object only with valid fields
    // This prevents sending "undefined", null, or empty string values which cause UUID/validation errors
    const updateData = {}

    // IMPORTANT: Only update user-editable fields
    // DO NOT update: owner_user_id, created_by, updated_by, deleted_by, suspended_by
    // These are managed by triggers or admin operations

    // Only add fields that have valid values
    if (isValid(updates.accountName)) updateData.account_name = updates.accountName
    if (isValid(updates.accountDisplayName)) updateData.account_display_name = updates.accountDisplayName
    if (isValid(updates.accountType)) updateData.account_type = updates.accountType
    if (updates.companyName !== undefined) updateData.company_name = updates.companyName || null
    if (updates.billingEmail !== undefined) updateData.billing_email = updates.billingEmail || null
    if (updates.primaryEmail !== undefined) updateData.primary_email = updates.primaryEmail || null
    if (updates.primaryPhone !== undefined) updateData.primary_phone = updates.primaryPhone || null
    if (updates.addressLine1 !== undefined) updateData.address_line1 = updates.addressLine1 || null
    if (updates.addressLine2 !== undefined) updateData.address_line2 = updates.addressLine2 || null
    if (updates.city !== undefined) updateData.city = updates.city || null
    if (updates.stateProvince !== undefined) updateData.state_province = updates.stateProvince || null
    if (updates.postalCode !== undefined) updateData.postal_code = updates.postalCode || null
    if (updates.countryCode !== undefined) updateData.country_code = updates.countryCode || null
    if (isValid(updates.defaultTimezone)) updateData.default_timezone = updates.defaultTimezone
    if (isValid(updates.defaultCurrency)) updateData.default_currency = updates.defaultCurrency
    if (isValid(updates.defaultLanguage)) updateData.default_language = updates.defaultLanguage
    if (updates.logoUrl !== undefined) updateData.logo_url = updates.logoUrl || null
    if (updates.brandColor !== undefined) updateData.brand_color = updates.brandColor || null

    // NOTE: updated_at and updated_by are set automatically by trigger
    // DO NOT manually set them here

    // If no fields to update, return success without making DB call
    if (Object.keys(updateData).length === 0) {
      return {
        success: true,
        data: null,
        error: null,
      }
    }

    const { data, error } = await appDb
      .from('accounts')
      .update(updateData)
      .eq('id', accountId)
      .select()
      .single()

    if (error) throw error

    return {
      success: true,
      data: data,
      error: null,
    }
  } catch (error) {
    console.error('Error updating account:', error)
    return {
      success: false,
      data: null,
      error: error.message || 'Failed to update account',
    }
  }
}

/**
 * Get account projects with member counts
 * Uses the get_account_projects() database function
 * @param {string} accountId - Account UUID
 * @returns {Promise<{success: boolean, data: array, error: string|null}>}
 */
export async function getAccountProjects(accountId) {
  try {
    // Validate accountId first
    if (!accountId || accountId === 'undefined' || accountId === 'null' || (typeof accountId === 'string' && accountId.trim() === '')) {
      return {
        success: false,
        data: [],
        error: 'Invalid account ID. Account ID is required and must be a valid UUID.',
      }
    }

    const { data, error } = await appDb.rpc('get_account_projects', {
      p_account_id: accountId,
    })

    if (error) throw error

    return {
      success: true,
      data: data || [],
      error: null,
    }
  } catch (error) {
    console.error('Error fetching account projects:', error)
    return {
      success: false,
      data: [],
      error: error.message || 'Failed to fetch account projects',
    }
  }
}

/**
 * Get account subscription details
 * Uses the get_account_subscription() database function
 * @param {string} accountId - Account UUID
 * @returns {Promise<{success: boolean, data: object|null, error: string|null}>}
 */
export async function getAccountSubscription(accountId) {
  try {
    // Validate accountId first
    if (!accountId || accountId === 'undefined' || accountId === 'null' || (typeof accountId === 'string' && accountId.trim() === '')) {
      return {
        success: false,
        data: null,
        error: 'Invalid account ID. Account ID is required and must be a valid UUID.',
      }
    }

    const { data, error } = await appDb.rpc('get_account_subscription', {
      p_account_id: accountId,
    })

    if (error) throw error

    return {
      success: true,
      data: data && data.length > 0 ? data[0] : null,
      error: null,
    }
  } catch (error) {
    console.error('Error fetching account subscription:', error)
    return {
      success: false,
      data: null,
      error: error.message || 'Failed to fetch subscription',
    }
  }
}

/**
 * Check if current user is account owner
 * @param {string} accountId - Account UUID
 * @returns {Promise<{success: boolean, isOwner: boolean, error: string|null}>}
 */
export async function isAccountOwner(accountId) {
  try {
    // Validate accountId first
    if (!accountId || accountId === 'undefined' || accountId === 'null' || (typeof accountId === 'string' && accountId.trim() === '')) {
      return {
        success: false,
        isOwner: false,
        error: 'Invalid account ID. Account ID is required and must be a valid UUID.',
      }
    }

    const { data: { user } } = await appDb.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data, error } = await appDb.rpc('is_account_owner', {
      p_auth_user_id: user.id,
      p_account_id: accountId,
    })

    if (error) throw error

    return {
      success: true,
      isOwner: data === true,
      error: null,
    }
  } catch (error) {
    console.error('Error checking account ownership:', error)
    return {
      success: false,
      isOwner: false,
      error: error.message || 'Failed to check ownership',
    }
  }
}

/**
 * Get account statistics
 * @param {string} accountId - Account UUID
 * @returns {Promise<{success: boolean, data: object|null, error: string|null}>}
 */
export async function getAccountStats(accountId) {
  try {
    // Get projects count
    const { data: projects, error: projectsError } = await appDb
      .from('projects')
      .select('id', { count: 'exact', head: true })
      .eq('account_id', accountId)
      .eq('is_deleted', false)

    if (projectsError) throw projectsError

    // Get total members across all projects
    const { data: members, error: membersError } = await appDb
      .from('user_roles')
      .select('user_id', { count: 'exact' })
      .in(
        'project_id',
        appDb.from('projects').select('id').eq('account_id', accountId).eq('is_deleted', false)
      )
      .eq('is_active', true)
      .eq('is_deleted', false)

    if (membersError) throw membersError

    // Get unique member count
    const uniqueMembers = members ? new Set(members.map(m => m.user_id)).size : 0

    return {
      success: true,
      data: {
        projectCount: projects?.length || 0,
        totalMembers: uniqueMembers,
      },
      error: null,
    }
  } catch (error) {
    console.error('Error fetching account stats:', error)
    return {
      success: false,
      data: null,
      error: error.message || 'Failed to fetch account statistics',
    }
  }
}

/**
 * Suspend account (admin only)
 * @param {string} accountId - Account UUID
 * @param {string} reason - Suspension reason
 * @returns {Promise<{success: boolean, data: object|null, error: string|null}>}
 */
export async function suspendAccount(accountId, reason) {
  try {
    const { data: { user } } = await appDb.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    // Get user ID from auth user
    const { data: userData, error: userError } = await appDb
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (userError) throw userError

    const { data, error } = await appDb
      .from('accounts')
      .update({
        is_suspended: true,
        suspended_at: new Date().toISOString(),
        suspended_reason: reason,
        suspended_by: userData.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', accountId)
      .select()
      .single()

    if (error) throw error

    return {
      success: true,
      data: data,
      error: null,
    }
  } catch (error) {
    console.error('Error suspending account:', error)
    return {
      success: false,
      data: null,
      error: error.message || 'Failed to suspend account',
    }
  }
}

/**
 * Reactivate suspended account (admin only)
 * @param {string} accountId - Account UUID
 * @returns {Promise<{success: boolean, data: object|null, error: string|null}>}
 */
export async function reactivateAccount(accountId) {
  try {
    const { data, error } = await appDb
      .from('accounts')
      .update({
        is_suspended: false,
        suspended_at: null,
        suspended_reason: null,
        suspended_by: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', accountId)
      .select()
      .single()

    if (error) throw error

    return {
      success: true,
      data: data,
      error: null,
    }
  } catch (error) {
    console.error('Error reactivating account:', error)
    return {
      success: false,
      data: null,
      error: error.message || 'Failed to reactivate account',
    }
  }
}

export default {
  createAccount,
  getAccountById,
  getUserAccounts,
  updateAccount,
  getAccountProjects,
  getAccountSubscription,
  isAccountOwner,
  getAccountStats,
  suspendAccount,
  reactivateAccount,
}

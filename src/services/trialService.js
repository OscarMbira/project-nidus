/**
 * Trial Service
 * Manages trial projects, expiry, and upgrades
 */

import { platformDb } from './supabase/supabaseClient';

/**
 * Create trial project
 * @param {Object} projectData - Project details
 * @param {string} projectData.name - Project name
 * @param {string} projectData.type - Project type
 * @param {string} projectData.description - Project description
 * @param {string} projectData.startDate - Start date (ISO string)
 * @param {string} projectData.endDate - End date (ISO string)
 * @param {boolean} projectData.platformEnabled - Enable Platform module
 * @param {boolean} projectData.simulatorEnabled - Enable Simulator module
 * @param {string} accountId - Account ID
 * @returns {Promise<Object>} Created trial project
 */
export const createTrialProject = async (projectData, accountId) => {
  const { data: { user }, error: userError } = await platformDb.auth.getUser();

  if (userError || !user) {
    throw new Error('User not authenticated');
  }

  if (!accountId) {
    throw new Error('Account ID is required');
  }

  // Check trial eligibility first (via database function)
  const { data: isEligible, error: eligError } = await platformDb
    .rpc('check_trial_eligibility', { p_account_id: accountId });

  if (eligError) {
    console.error('Error checking trial eligibility:', eligError);
    throw new Error('Failed to check trial eligibility');
  }

  if (!isEligible) {
    throw new Error('This organisation already has a trial project. Additional projects require a paid subscription.');
  }

  // Prepare trial project data
  const trialProjectData = {
    account_id: accountId,
    project_name: projectData.name,
    project_type: projectData.type || 'software',
    description: projectData.description || '',
    start_date: projectData.startDate,
    end_date: projectData.endDate || null,
    project_mode: 'trial',
    platform_enabled: projectData.platformEnabled ?? true,
    simulator_enabled: projectData.simulatorEnabled ?? false,
    member_limit: 5, // Trial limit (enforced by trigger)
    current_member_count: 1, // Creator counts as 1
    project_manager_user_id: user.id,
    status: 'active',
    created_by: user.id
  };

  // Create project (triggers will set trial dates and create tracking)
  const { data, error } = await platformDb
    .from('projects')
    .insert(trialProjectData)
    .select()
    .single();

  if (error) {
    console.error('Error creating trial project:', error);
    throw new Error(error.message || 'Failed to create trial project');
  }

  console.log('Trial project created:', {
    id: data.id,
    name: data.project_name,
    expires: data.trial_expiry_date
  });

  return data;
};

/**
 * Get trial status for project
 * @param {string} projectId - Project ID
 * @returns {Promise<Object|null>} Trial status or null if not found
 */
export const getTrialStatus = async (projectId) => {
  if (!projectId) {
    throw new Error('Project ID is required');
  }

  // Use database function to get comprehensive trial status
  const { data, error } = await platformDb
    .rpc('get_trial_status', { p_project_id: projectId });

  if (error) {
    console.error('Error fetching trial status:', error);
    throw new Error(error.message || 'Failed to fetch trial status');
  }

  // Database function returns an array, we want the first result
  const status = data && data.length > 0 ? data[0] : null;

  return status;
};

/**
 * Calculate days remaining in trial
 * @param {string} projectId - Project ID
 * @returns {Promise<number>} Days remaining (0 if expired)
 */
export const calculateDaysRemaining = async (projectId) => {
  if (!projectId) {
    throw new Error('Project ID is required');
  }

  const { data, error } = await platformDb
    .rpc('calculate_trial_days_remaining', { p_project_id: projectId });

  if (error) {
    console.error('Error calculating days remaining:', error);
    throw new Error(error.message || 'Failed to calculate days remaining');
  }

  return data || 0;
};

/**
 * Upgrade trial project to paid
 * @param {string} projectId - Project ID
 * @param {string} subscriptionId - Subscription ID
 * @returns {Promise<Object>} Upgraded project
 */
export const upgradeTrialProject = async (projectId, subscriptionId) => {
  const { data: { user }, error: userError } = await platformDb.auth.getUser();

  if (userError || !user) {
    throw new Error('User not authenticated');
  }

  if (!projectId || !subscriptionId) {
    throw new Error('Project ID and Subscription ID are required');
  }

  // Get subscription details for member limit
  const { data: subscription, error: subError } = await platformDb
    .from('platform_subscriptions')
    .select('member_limit, plan_type')
    .eq('id', subscriptionId)
    .single();

  if (subError) {
    console.error('Error fetching subscription:', subError);
    throw new Error('Subscription not found');
  }

  // Update project to paid mode (trigger will handle trial tracking update)
  const { data: project, error: projectError } = await platformDb
    .from('projects')
    .update({
      project_mode: 'paid',
      subscription_id: subscriptionId,
      member_limit: subscription.member_limit || 20,
      trial_upgraded_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      updated_by: user.id
    })
    .eq('id', projectId)
    .eq('project_mode', 'trial') // Safety check: only upgrade if currently trial
    .select()
    .single();

  if (projectError) {
    console.error('Error upgrading trial project:', projectError);
    throw new Error(projectError.message || 'Failed to upgrade trial project');
  }

  // Trigger will automatically update trial_project_tracking status to 'upgraded'

  console.log('Trial project upgraded:', {
    id: project.id,
    name: project.project_name,
    newMemberLimit: project.member_limit
  });

  return project;
};

/**
 * Lock expired trial project
 * @param {string} projectId - Project ID
 * @returns {Promise<Object>} Locked project
 */
export const lockExpiredTrialProject = async (projectId) => {
  if (!projectId) {
    throw new Error('Project ID is required');
  }

  // Use database function to lock the project
  const { data, error } = await platformDb
    .rpc('lock_expired_trial_project', { p_project_id: projectId });

  if (error) {
    console.error('Error locking expired trial project:', error);
    throw new Error(error.message || 'Failed to lock expired trial project');
  }

  if (!data) {
    throw new Error('Project not found or could not be locked');
  }

  console.log('Trial project locked:', { projectId });

  return data;
};

/**
 * Get all trial projects for current user's account
 * @returns {Promise<Array>} List of trial projects with status
 */
export const getUserTrialProjects = async () => {
  const { data: { user }, error: userError } = await platformDb.auth.getUser();

  if (userError || !user) {
    throw new Error('User not authenticated');
  }

  // Get user's account
  const { data: account } = await platformDb
    .from('accounts')
    .select('id')
    .eq('owner_user_id', user.id)
    .single();

  if (!account) {
    return [];
  }

  // Get trial projects with tracking info
  const { data, error } = await platformDb
    .from('projects')
    .select(`
      *,
      trial_tracking:trial_project_tracking(*)
    `)
    .eq('account_id', account.id)
    .eq('project_mode', 'trial')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching user trial projects:', error);
    throw new Error(error.message || 'Failed to fetch trial projects');
  }

  return data || [];
};

/**
 * Check if a project is locked due to trial expiry
 * @param {string} projectId - Project ID
 * @returns {Promise<boolean>} True if locked
 */
export const isProjectLocked = async (projectId) => {
  if (!projectId) {
    throw new Error('Project ID is required');
  }

  const { data, error } = await platformDb
    .from('projects')
    .select('status, locked_at, project_mode')
    .eq('id', projectId)
    .single();

  if (error) {
    console.error('Error checking project lock status:', error);
    return false;
  }

  return data.status === 'locked' && data.locked_at !== null;
};

/**
 * Get trial expiry date for a project
 * @param {string} projectId - Project ID
 * @returns {Promise<string|null>} ISO date string or null
 */
export const getTrialExpiryDate = async (projectId) => {
  if (!projectId) {
    throw new Error('Project ID is required');
  }

  const { data, error } = await platformDb
    .from('projects')
    .select('trial_expiry_date')
    .eq('id', projectId)
    .eq('project_mode', 'trial')
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching trial expiry date:', error);
    throw new Error(error.message || 'Failed to fetch trial expiry date');
  }

  return data?.trial_expiry_date || null;
};

export default {
  createTrialProject,
  getTrialStatus,
  calculateDaysRemaining,
  upgradeTrialProject,
  lockExpiredTrialProject,
  getUserTrialProjects,
  isProjectLocked,
  getTrialExpiryDate
};

/**
 * Daily Log Entry Service
 * Provides daily log entry management functionality
 */

import { platformDb } from './supabase/supabaseClient';

/**
 * Add a new entry to a daily log
 * @param {string} logId - Daily log ID
 * @param {Object} entryData - Entry data
 * @returns {Promise<Object>} Created entry
 */
export async function addEntry(logId, entryData) {
  try {
    const { data: { user } } = await platformDb.auth.getUser();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    // Get user ID from users table
    const { data: userRecord, error: userError } = await platformDb
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('is_deleted', false)
      .single();

    if (userError || !userRecord) {
      return { success: false, error: 'User record not found' };
    }

    const { data, error } = await platformDb
      .from('daily_log_entries')
      .insert({
        daily_log_id: logId,
        entry_date: entryData.entry_date || new Date().toISOString().split('T')[0],
        entry_type: entryData.entry_type,
        description: entryData.description,
        person_responsible_id: entryData.person_responsible_id || null,
        person_responsible_name: entryData.person_responsible_name || null,
        target_date: entryData.target_date || null,
        priority: entryData.priority || null,
        tags: entryData.tags || [],
        is_private: entryData.is_private || false,
        status: entryData.status || 'open',
        created_by: userRecord.id
      })
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error adding daily log entry:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update a daily log entry
 * @param {string} entryId - Entry ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated entry
 */
export async function updateEntry(entryId, updates) {
  try {
    const { data, error } = await platformDb
      .from('daily_log_entries')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', entryId)
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error updating daily log entry:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete a daily log entry (soft delete)
 * @param {string} entryId - Entry ID
 * @returns {Promise<Object>} Result
 */
export async function deleteEntry(entryId) {
  try {
    const { data: { user } } = await platformDb.auth.getUser();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { data: userRecord } = await platformDb
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('is_deleted', false)
      .single();

    const { error } = await platformDb
      .from('daily_log_entries')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: userRecord?.id || null
      })
      .eq('id', entryId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error deleting daily log entry:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get entries for a daily log
 * @param {string} logId - Daily log ID
 * @param {Object} filters - Filter options
 * @returns {Promise<Object>} Entries data
 */
export async function getEntries(logId, filters = {}) {
  try {
    let query = platformDb
      .from('daily_log_entries')
      .select(`
        *,
        person_responsible:person_responsible_id(id, full_name, email),
        created_by_user:created_by(id, full_name, email),
        completed_by_user:completed_by(id, full_name, email)
      `)
      .eq('daily_log_id', logId)
      .eq('is_deleted', false);

    // Apply filters
    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    if (filters.entry_type) {
      query = query.eq('entry_type', filters.entry_type);
    }

    if (filters.person_responsible_id) {
      query = query.eq('person_responsible_id', filters.person_responsible_id);
    }

    if (filters.start_date) {
      query = query.gte('entry_date', filters.start_date);
    }

    if (filters.end_date) {
      query = query.lte('entry_date', filters.end_date);
    }

    if (filters.search) {
      query = query.or(`description.ilike.%${filters.search}%`);
    }

    if (filters.tags && filters.tags.length > 0) {
      query = query.contains('tags', filters.tags);
    }

    // Order by entry date descending (newest first)
    query = query.order('entry_date', { ascending: false })
                 .order('entry_number', { ascending: false });

    const { data, error } = await query;

    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error getting daily log entries:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get entry by ID
 * @param {string} entryId - Entry ID
 * @returns {Promise<Object>} Entry data
 */
export async function getEntryById(entryId) {
  try {
    const { data, error } = await platformDb
      .from('daily_log_entries')
      .select(`
        *,
        daily_log:daily_log_id(id, log_reference, project_id, visibility),
        person_responsible:person_responsible_id(id, full_name, email),
        created_by_user:created_by(id, full_name, email),
        completed_by_user:completed_by(id, full_name, email)
      `)
      .eq('id', entryId)
      .eq('is_deleted', false)
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error getting daily log entry by ID:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Complete an entry
 * @param {string} entryId - Entry ID
 * @param {string} results - Results/outcome description
 * @returns {Promise<Object>} Updated entry
 */
export async function completeEntry(entryId, results) {
  try {
    const { data, error } = await platformDb
      .from('daily_log_entries')
      .update({
        status: 'completed',
        results: results,
        completed_at: new Date().toISOString()
      })
      .eq('id', entryId)
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error completing daily log entry:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Reopen an entry
 * @param {string} entryId - Entry ID
 * @returns {Promise<Object>} Updated entry
 */
export async function reopenEntry(entryId) {
  try {
    const { data, error } = await platformDb
      .from('daily_log_entries')
      .update({
        status: 'open',
        completed_at: null,
        completed_by: null
      })
      .eq('id', entryId)
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error reopening daily log entry:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Cancel an entry
 * @param {string} entryId - Entry ID
 * @param {string} reason - Cancellation reason
 * @returns {Promise<Object>} Updated entry
 */
export async function cancelEntry(entryId, reason) {
  try {
    const { data, error } = await platformDb
      .from('daily_log_entries')
      .update({
        status: 'cancelled',
        results: reason
      })
      .eq('id', entryId)
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error cancelling daily log entry:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get entries by type
 * @param {string} logId - Daily log ID
 * @param {string} type - Entry type
 * @returns {Promise<Object>} Entries data
 */
export async function getEntriesByType(logId, type) {
  return getEntries(logId, { entry_type: type });
}

/**
 * Get entries by status
 * @param {string} logId - Daily log ID
 * @param {string} status - Entry status
 * @returns {Promise<Object>} Entries data
 */
export async function getEntriesByStatus(logId, status) {
  return getEntries(logId, { status });
}

/**
 * Get entries by person
 * @param {string} logId - Daily log ID
 * @param {string} personId - Person responsible ID
 * @returns {Promise<Object>} Entries data
 */
export async function getEntriesByPerson(logId, personId) {
  return getEntries(logId, { person_responsible_id: personId });
}

/**
 * Get entries by date range
 * @param {string} logId - Daily log ID
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @returns {Promise<Object>} Entries data
 */
export async function getEntriesByDateRange(logId, startDate, endDate) {
  return getEntries(logId, { start_date: startDate, end_date: endDate });
}

/**
 * Get overdue entries
 * @param {string} projectId - Project ID
 * @returns {Promise<Object>} Overdue entries
 */
export async function getOverdueEntries(projectId) {
  try {
    const { data, error } = await platformDb.rpc('get_overdue_entries', {
      p_project_id: projectId
    });

    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error getting overdue entries:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Search entries
 * @param {string} logId - Daily log ID
 * @param {string} searchTerm - Search term
 * @returns {Promise<Object>} Matching entries
 */
export async function searchEntries(logId, searchTerm) {
  return getEntries(logId, { search: searchTerm });
}

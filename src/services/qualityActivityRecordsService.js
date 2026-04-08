/**
 * Quality Activity Records Service
 * Manages quality records (test plans, checklists, evidence, reports) linked to quality activities
 */

import { supabase } from './supabaseClient';

/**
 * Get records for a quality activity
 * @param {string} activityType - 'review', 'inspection', 'audit', 'test'
 * @param {string} activityId - Activity ID
 * @returns {Promise<Object>} Records array
 */
export async function getRecords(activityType, activityId) {
  try {
    const { data, error } = await supabase
      .from('quality_activity_records')
      .select(`
        *,
        created_by_user:created_by(id, full_name, email),
        updated_by_user:updated_by(id, full_name, email)
      `)
      .eq('activity_type', activityType)
      .eq('activity_id', activityId)
      .eq('is_deleted', false)
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error getting quality activity records:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Add a record to a quality activity
 * @param {string} activityType - 'review', 'inspection', 'audit', 'test'
 * @param {string} activityId - Activity ID
 * @param {Object} recordData - Record data
 * @returns {Promise<Object>} Created record
 */
export async function addRecord(activityType, activityId, recordData) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Get user ID from users table
    const { data: userRecord } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('is_deleted', false)
      .single();

    if (!userRecord) {
      throw new Error('User record not found');
    }

    const insertData = {
      activity_type: activityType,
      activity_id: activityId,
      record_type: recordData.record_type,
      record_reference: recordData.record_reference || null,
      record_title: recordData.record_title,
      record_description: recordData.record_description || null,
      record_url: recordData.record_url || null,
      document_id: recordData.document_id || null,
      is_mandatory: recordData.is_mandatory || false,
      display_order: recordData.display_order || 0,
      created_by: userRecord.id,
      updated_by: userRecord.id
    };

    const { data, error } = await supabase
      .from('quality_activity_records')
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error adding quality activity record:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update a quality activity record
 * @param {string} recordId - Record ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated record
 */
export async function updateRecord(recordId, updates) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Get user ID from users table
    const { data: userRecord } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('is_deleted', false)
      .single();

    if (!userRecord) {
      throw new Error('User record not found');
    }

    const updateData = {
      ...updates,
      updated_by: userRecord.id,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('quality_activity_records')
      .update(updateData)
      .eq('id', recordId)
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error updating quality activity record:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete a quality activity record (soft delete)
 * @param {string} recordId - Record ID
 * @returns {Promise<Object>} Deletion result
 */
export async function deleteRecord(recordId) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Get user ID from users table
    const { data: userRecord } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('is_deleted', false)
      .single();

    if (!userRecord) {
      throw new Error('User record not found');
    }

    const { error } = await supabase
      .from('quality_activity_records')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: userRecord.id,
        updated_by: userRecord.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', recordId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error deleting quality activity record:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Reorder records for an activity
 * @param {string} activityType - Activity type
 * @param {string} activityId - Activity ID
 * @param {Array<Object>} orders - Array of {record_id, display_order}
 * @returns {Promise<Object>} Update result
 */
export async function reorderRecords(activityType, activityId, orders) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Get user ID from users table
    const { data: userRecord } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('is_deleted', false)
      .single();

    if (!userRecord) {
      throw new Error('User record not found');
    }

    // Update each record's display order
    const updates = orders.map(order => 
      supabase
        .from('quality_activity_records')
        .update({
          display_order: order.display_order,
          updated_by: userRecord.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', order.record_id)
        .eq('activity_type', activityType)
        .eq('activity_id', activityId)
    );

    await Promise.all(updates);

    return { success: true };
  } catch (error) {
    console.error('Error reordering quality activity records:', error);
    return { success: false, error: error.message };
  }
}

export default {
  getRecords,
  addRecord,
  updateRecord,
  deleteRecord,
  reorderRecords
};

/**
 * Configuration Item Relationship Service
 * API functions for managing relationships between configuration items
 */

import { platformDb, supabase } from './supabaseClient';

/**
 * Create relationship between configuration items
 * @param {string} parentItemId - Parent Configuration Item ID
 * @param {string} childItemId - Child Configuration Item ID
 * @param {string} relationshipType - Relationship type
 * @param {string} description - Relationship description (optional)
 * @returns {Promise<Object>} Created relationship
 */
export async function createRelationship(parentItemId, childItemId, relationshipType, description = null) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: userRecord } = await platformDb
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('is_deleted', false)
      .single();

    if (!userRecord) throw new Error('User record not found');

    if (parentItemId === childItemId) {
      throw new Error('Cannot create relationship between an item and itself');
    }

    const { data, error } = await platformDb
      .from('configuration_item_relationships')
      .insert({
        parent_item_id: parentItemId,
        child_item_id: childItemId,
        relationship_type: relationshipType,
        relationship_description: description,
        created_by: userRecord.id
      })
      .select(`
        *,
        parent_item:parent_item_id(id, configuration_item_identifier, item_name),
        child_item:child_item_id(id, configuration_item_identifier, item_name)
      `)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating relationship:', error);
    throw error;
  }
}

/**
 * Get relationships by Configuration Item
 * @param {string} itemId - Configuration Item ID
 * @returns {Promise<Object>} Relationships (parent and child)
 */
export async function getRelationshipsByItem(itemId) {
  try {
    const [parentRelationships, childRelationships] = await Promise.all([
      // Where this item is the child (parent relationships)
      platformDb
        .from('configuration_item_relationships')
        .select(`
          *,
          parent_item:parent_item_id(id, configuration_item_identifier, item_name),
          child_item:child_item_id(id, configuration_item_identifier, item_name)
        `)
        .eq('child_item_id', itemId),
      // Where this item is the parent (child relationships)
      platformDb
        .from('configuration_item_relationships')
        .select(`
          *,
          parent_item:parent_item_id(id, configuration_item_identifier, item_name),
          child_item:child_item_id(id, configuration_item_identifier, item_name)
        `)
        .eq('parent_item_id', itemId)
    ]);

    return {
      parentItems: parentRelationships.data || [],
      childItems: childRelationships.data || []
    };
  } catch (error) {
    console.error('Error fetching relationships:', error);
    throw error;
  }
}

/**
 * Get parent items
 * @param {string} itemId - Configuration Item ID
 * @returns {Promise<Array>} Parent items
 */
export async function getParentItems(itemId) {
  try {
    const { data, error } = await platformDb
      .from('configuration_item_relationships')
      .select(`
        *,
        parent_item:parent_item_id(id, configuration_item_identifier, item_name, current_version),
        relationship_type,
        relationship_description
      `)
      .eq('child_item_id', itemId);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching parent items:', error);
    throw error;
  }
}

/**
 * Get child items
 * @param {string} itemId - Configuration Item ID
 * @returns {Promise<Array>} Child items
 */
export async function getChildItems(itemId) {
  try {
    const { data, error } = await platformDb
      .from('configuration_item_relationships')
      .select(`
        *,
        child_item:child_item_id(id, configuration_item_identifier, item_name, current_version),
        relationship_type,
        relationship_description
      `)
      .eq('parent_item_id', itemId);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching child items:', error);
    throw error;
  }
}

/**
 * Delete relationship
 * @param {string} relationshipId - Relationship ID
 * @returns {Promise<boolean>} Success
 */
export async function deleteRelationship(relationshipId) {
  try {
    const { error } = await platformDb
      .from('configuration_item_relationships')
      .delete()
      .eq('id', relationshipId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting relationship:', error);
    throw error;
  }
}

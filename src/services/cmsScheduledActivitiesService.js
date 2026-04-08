/**
 * CMS Scheduled Activities Service
 */

import { platformDb } from './supabaseClient';

export async function addActivity(cmsId, activityData) {
  try {
    const { data: existing } = await platformDb
      .from('cms_scheduled_activities')
      .select('display_order')
      .eq('cms_id', cmsId)
      .order('display_order', { ascending: false })
      .limit(1);

    const nextOrder = existing && existing.length > 0 ? existing[0].display_order + 1 : 0;

    const { data, error } = await platformDb
      .from('cms_scheduled_activities')
      .insert({ ...activityData, cms_id: cmsId, display_order: activityData.display_order ?? nextOrder })
      .select('*')
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error adding activity:', error);
    throw error;
  }
}

export async function updateActivity(activityId, updates) {
  try {
    const { data, error } = await platformDb
      .from('cms_scheduled_activities')
      .update(updates)
      .eq('id', activityId)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating activity:', error);
    throw error;
  }
}

export async function deleteActivity(activityId) {
  try {
    const { error } = await platformDb.from('cms_scheduled_activities').delete().eq('id', activityId);
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting activity:', error);
    throw error;
  }
}

export async function getActivities(cmsId) {
  try {
    const { data, error } = await platformDb
      .from('cms_scheduled_activities')
      .select('*')
      .eq('cms_id', cmsId)
      .order('display_order', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching activities:', error);
    throw error;
  }
}

export async function getUpcomingActivities(projectId) {
  try {
    const { data, error } = await platformDb.rpc('get_scheduled_communication_activities', {
      p_project_id: projectId,
      p_date_from: new Date().toISOString().split('T')[0],
      p_date_to: null
    });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching upcoming activities:', error);
    throw error;
  }
}

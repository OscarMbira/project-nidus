/**
 * CMS Communication Records Service
 */

import { platformDb } from './supabaseClient';

export async function addRecord(cmsId, recordData) {
  try {
    const { data: existing } = await platformDb
      .from('cms_communication_records')
      .select('display_order')
      .eq('cms_id', cmsId)
      .order('display_order', { ascending: false })
      .limit(1);

    const nextOrder = existing && existing.length > 0 ? existing[0].display_order + 1 : 0;

    const { data, error } = await platformDb
      .from('cms_communication_records')
      .insert({ ...recordData, cms_id: cmsId, display_order: recordData.display_order ?? nextOrder })
      .select('*')
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error adding record:', error);
    throw error;
  }
}

export async function updateRecord(recordId, updates) {
  try {
    const { data, error } = await platformDb
      .from('cms_communication_records')
      .update(updates)
      .eq('id', recordId)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating record:', error);
    throw error;
  }
}

export async function deleteRecord(recordId) {
  try {
    const { error } = await platformDb.from('cms_communication_records').delete().eq('id', recordId);
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting record:', error);
    throw error;
  }
}

export async function getRecords(cmsId) {
  try {
    const { data, error } = await platformDb
      .from('cms_communication_records')
      .select('*')
      .eq('cms_id', cmsId)
      .order('display_order', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching records:', error);
    throw error;
  }
}

export async function getMandatoryRecords(cmsId) {
  try {
    const { data, error } = await platformDb
      .from('cms_communication_records')
      .select('*')
      .eq('cms_id', cmsId)
      .eq('is_mandatory', true)
      .order('display_order', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching mandatory records:', error);
    throw error;
  }
}

/**
 * Persist and resolve user's selected simulator practice role (v734).
 */
import { simDb } from '../supabase/supabaseClient';
import { isValidSimulatorRoleId, getSimulatorRoleById } from '@nidus/shared/constants/simulatorRoles';

const STORAGE_KEY = 'simulator_preferred_role';

export function getStoredRole() {
  if (typeof window === 'undefined') return null;
  const role = localStorage.getItem(STORAGE_KEY);
  return isValidSimulatorRoleId(role) ? role : null;
}

export function setStoredRole(roleId) {
  if (!isValidSimulatorRoleId(roleId)) throw new Error('Invalid simulator role');
  if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, roleId);
}

export async function getPreferredRole(userId) {
  if (!userId) return getStoredRole();
  const { data, error } = await simDb
    .from('user_progress')
    .select('preferred_role')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  const role = data?.preferred_role;
  if (isValidSimulatorRoleId(role)) return role;
  return getStoredRole();
}

export async function savePreferredRole(userId, roleId) {
  if (!isValidSimulatorRoleId(roleId)) throw new Error('Invalid simulator role');
  setStoredRole(roleId);

  if (!userId) return { roleId };

  const { data, error } = await simDb
    .from('user_progress')
    .upsert({
      user_id: userId,
      preferred_role: roleId,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export function getDashboardPathForRole(roleId) {
  return getSimulatorRoleById(roleId)?.dashboardPath || '/simulator/dashboard';
}

export async function switchRole(userId, roleId) {
  await savePreferredRole(userId, roleId);
  return getDashboardPathForRole(roleId);
}

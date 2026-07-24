/**
 * Role-specific learning paths (v734).
 */
import { simDb } from '../supabase/supabaseClient';

export async function getLearningPathsForRole(roleId) {
  const { data, error } = await simDb
    .from('learning_paths')
    .select('*')
    .eq('role_id', roleId)
    .eq('is_active', true)
    .order('sequence', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function getLearningPathProgress(userId, pathId) {
  const { data, error } = await simDb
    .from('learning_path_progress')
    .select('*')
    .eq('user_id', userId)
    .eq('path_id', pathId);
  if (error) throw error;
  return data || [];
}

export async function updateModuleProgress(userId, pathId, moduleId, { status, score } = {}) {
  const { data, error } = await simDb
    .from('learning_path_progress')
    .upsert({
      user_id: userId,
      path_id: pathId,
      module_id: moduleId,
      status: status || 'in_progress',
      score: score ?? null,
      completed_at: status === 'completed' ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,path_id,module_id' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export function computePathCompletion(path, progressRows = []) {
  const modules = path?.modules || [];
  if (!modules.length) return 0;
  const completed = modules.filter((m) =>
    progressRows.some((p) => p.module_id === m.id && p.status === 'completed'),
  ).length;
  return Math.round((completed / modules.length) * 100);
}

export async function getNextModule(userId, path) {
  const progress = await getLearningPathProgress(userId, path.id);
  const modules = [...(path.modules || [])].sort((a, b) => (a.order || 0) - (b.order || 0));
  for (const mod of modules) {
    const row = progress.find((p) => p.module_id === mod.id);
    if (!row || row.status !== 'completed') return mod;
  }
  return null;
}

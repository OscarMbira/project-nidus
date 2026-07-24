/**
 * Role-specific certificate eligibility (v734).
 */
import { simDb } from '../supabase/supabaseClient';
import { computePathCompletion, getLearningPathsForRole, getLearningPathProgress } from './learningPathService';

export async function getCertificateTemplatesForRole(roleId) {
  const { data, error } = await simDb
    .from('certificate_templates')
    .select('*')
    .eq('role_id', roleId)
    .eq('is_active', true);
  if (error) throw error;
  return data || [];
}

export async function checkCertificateEligibility(userId, templateCode) {
  const { data: template, error } = await simDb
    .from('certificate_templates')
    .select('*')
    .eq('template_code', templateCode)
    .eq('is_active', true)
    .maybeSingle();
  if (error) throw error;
  if (!template) return { eligible: false, reason: 'Template not found' };

  const paths = await getLearningPathsForRole(template.role_id);
  const path = paths[0];
  if (!path) return { eligible: false, reason: 'No learning path configured' };

  const progress = await getLearningPathProgress(userId, path.id);
  const completion = computePathCompletion(path, progress);
  const requiredModules = template.required_modules || [];
  const modulesDone = requiredModules.every((id) =>
    progress.some((p) => p.module_id === id && p.status === 'completed'),
  );

  if (!modulesDone || completion < 100) {
    return { eligible: false, reason: 'Learning path incomplete', completion };
  }

  const criteria = template.criteria || {};
  if (criteria.scenario_template) {
    const { data: scenarios } = await simDb
      .from('scenarios')
      .select('id')
      .contains('scenario_data', { template_code: criteria.scenario_template });
    const scenarioIds = (scenarios || []).map((s) => s.id);
    if (scenarioIds.length) {
      const minScore = template.min_score || 75;
      const { data: runs } = await simDb
        .from('simulation_runs')
        .select('total_score, max_possible_score')
        .eq('user_id', userId)
        .eq('status', 'completed')
        .in('scenario_id', scenarioIds);
      const passed = (runs || []).some((r) => {
        const pct = r.max_possible_score ? (r.total_score / r.max_possible_score) * 100 : r.total_score;
        return pct >= minScore;
      });
      if (!passed) return { eligible: false, reason: 'Required scenario score not met' };
    }
  }

  return { eligible: true, template, completion };
}

/**
 * Collaborative Team mode (v736 Phase G) — eligibility for the
 * 'pmo_collaborative_practice' certificate. Deliberately NOT routed through
 * checkCertificateEligibility() above: that function's whole eligibility
 * model is "completed a role's learning path modules + passed a scenario
 * score," which doesn't apply here — this certificate's criteria is a
 * completed session's team coordination_score (computed server-side by
 * complete_collaborative_session_if_ready(), v746).
 */
export async function checkCollaborativeCertificateEligibility(userId, sessionId) {
  const { data: template, error: templateErr } = await simDb
    .from('certificate_templates')
    .select('*')
    .eq('template_code', 'pmo_collaborative_practice')
    .eq('is_active', true)
    .maybeSingle();
  if (templateErr) throw templateErr;
  if (!template) return { eligible: false, reason: 'Template not found' };

  const { data: session, error: sessionErr } = await simDb
    .from('collaborative_sessions')
    .select('status')
    .eq('id', sessionId)
    .single();
  if (sessionErr) throw sessionErr;
  if (session.status !== 'completed') {
    return { eligible: false, reason: 'Session has not finished yet' };
  }

  const { data: participant } = await simDb
    .from('collaborative_session_participants')
    .select('id')
    .eq('session_id', sessionId)
    .eq('user_id', userId)
    .eq('status', 'joined')
    .maybeSingle();
  if (!participant) {
    return { eligible: false, reason: 'You were not a participant in this session' };
  }

  const { data: scoreRow, error: scoreErr } = await simDb
    .from('collaborative_session_scores')
    .select('coordination_score')
    .eq('session_id', sessionId)
    .maybeSingle();
  if (scoreErr) throw scoreErr;

  const minScore = template.criteria?.min_coordination_score ?? template.min_score ?? 70;
  if (scoreRow?.coordination_score == null) {
    return { eligible: false, reason: 'No escalations were coordinated in this session — nothing to score', template };
  }
  if (scoreRow.coordination_score < minScore) {
    return { eligible: false, reason: `Coordination score ${scoreRow.coordination_score} is below the required ${minScore}`, template, coordinationScore: scoreRow.coordination_score };
  }

  return { eligible: true, template, coordinationScore: scoreRow.coordination_score };
}

export async function issueCollaborativeCertificateIfEligible(userId, sessionId) {
  const check = await checkCollaborativeCertificateEligibility(userId, sessionId);
  if (!check.eligible) return check;

  const { data: existing } = await simDb
    .from('certificates')
    .select('id')
    .eq('user_id', userId)
    .contains('metadata', { template_code: 'pmo_collaborative_practice', session_id: sessionId })
    .maybeSingle();
  if (existing) return { eligible: true, alreadyIssued: true, certificateId: existing.id };

  const certNumber = `SIM-PMOCOLLAB-${Date.now()}`;
  const verificationCode = crypto.randomUUID().replace(/-/g, '');

  const { data, error } = await simDb
    .from('certificates')
    .insert({
      user_id: userId,
      certificate_type: 'collaborative_session',
      certificate_name: check.template.certificate_name,
      certificate_number: certNumber,
      verification_code: verificationCode,
      metadata: { template_code: 'pmo_collaborative_practice', session_id: sessionId, coordination_score: check.coordinationScore },
    })
    .select()
    .single();
  if (error) throw error;
  return { eligible: true, certificate: data };
}

export async function issueCertificateIfEligible(userId, templateCode) {
  const check = await checkCertificateEligibility(userId, templateCode);
  if (!check.eligible) return check;

  const { data: existing } = await simDb
    .from('certificates')
    .select('id')
    .eq('user_id', userId)
    .contains('metadata', { template_code: templateCode })
    .maybeSingle();

  if (existing) return { eligible: true, alreadyIssued: true, certificateId: existing.id };

  const certNumber = `SIM-${templateCode.toUpperCase()}-${Date.now()}`;
  const verificationCode = crypto.randomUUID().replace(/-/g, '');

  const { data, error } = await simDb
    .from('certificates')
    .insert({
      user_id: userId,
      certificate_type: 'role_mastery',
      certificate_name: check.template.certificate_name,
      certificate_number: certNumber,
      verification_code: verificationCode,
      metadata: { template_code: templateCode, role_id: check.template.role_id },
    })
    .select()
    .single();
  if (error) throw error;
  return { eligible: true, certificate: data };
}

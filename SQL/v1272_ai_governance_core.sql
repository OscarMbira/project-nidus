-- ============================================================================
-- v1272: AI agents foundation — Phase 0 governance core
-- PRD:  projectprd/v1272_ai_agents_foundation_PRD.md  (D1–D8, D16a, D18)
-- Plan: projectplan/v1272_ai_agents_foundation_plan.md (SQL #1)
--
--   * public.ai_platform_settings   global singleton: kill switch, model routing, model prices,
--                                   credit unit, retention defaults and min/max, trial credits
--   * public.ai_settings            + consent, retention, admin overrides (one row per organisation;
--                                   covers Platform, Simulator and Planner — organisation config)
--   * public.ai_credit_ledger       allowance top-ups, adjustments and usage (account billing data)
--   * public|sim.agent_runs / agent_steps   audit trail for every AI run, per app schema
--   * public.ai_ui_messages         fixed AI UI messages per language (D18)
--   * plan allowances: subscription_plans.monthly_ai_credits, planner_plan_limits.monthly_ai_credits
--   * public|sim.languages.ai_supported
--   * functions: ai_period_start, ai_account_allowance, ai_account_used, ai_org_status,
--                ai_accept_consent, ai_update_org_settings, ai_purge_preview
--   * RLS fixes: public.ai_settings policies compared accounts.owner_user_id (users.id) with
--     auth.uid(); sim.ai_settings allowed ALL to everyone. Both replaced.
--
-- Prerequisites: v321/v322/v330 (AI tables), v762 (languages), v1016 (auth_user_can_access_account),
--                v1119 (is_pmo_admin_or_owner_for_account, current_internal_user_id),
--                v1247/v1248 (product_edition, planner_plan_limits, platform_subscriptions planner rows).
-- Idempotent. Run v1272_ai_governance_core_tests.sql afterwards.
-- After running: re-run SQL/v1251_planner_table_wall.sql (new public tables, CLAUDE.md rule 6).
-- ============================================================================

-- ── 1. Global settings (singleton) ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ai_platform_settings (
  id                             BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id),
  kill_switch                    BOOLEAN NOT NULL DEFAULT FALSE,
  kill_switch_reason             TEXT,
  model_routing                  TEXT NOT NULL DEFAULT 'claude-haiku-5-5',
  model_quick                    TEXT NOT NULL DEFAULT 'claude-haiku-5-5',
  model_agent                    TEXT NOT NULL DEFAULT 'claude-sonnet-5-5',
  approved_models                TEXT[] NOT NULL DEFAULT ARRAY['claude-haiku-5-5', 'claude-sonnet-5-5', 'claude-opus-5-5'],
  -- USD per 1M tokens, used to turn token usage into credits
  model_prices                   JSONB NOT NULL DEFAULT '{
    "claude-haiku-5-5":  {"input": 0.10, "output": 0.50,  "cache_read": 0.01, "cache_write": 0.125},
    "claude-sonnet-5-5": {"input": 2.00, "output": 10.00, "cache_read": 0.20, "cache_write": 2.50},
    "claude-opus-5-5":   {"input": 4.00, "output": 20.00, "cache_read": 0.20, "cache_write": 5.00}
  }'::jsonb,
  credit_unit_usd                NUMERIC(12, 6) NOT NULL DEFAULT 0.001 CHECK (credit_unit_usd > 0),
  warn_percent                   INTEGER NOT NULL DEFAULT 80 CHECK (warn_percent BETWEEN 1 AND 99),
  -- Platform organisations with no paid subscription (Platform trial). 0 = no AI until set in Admin.
  default_trial_credits          INTEGER NOT NULL DEFAULT 0 CHECK (default_trial_credits >= 0),
  conversation_retention_months  INTEGER NOT NULL DEFAULT 12,
  audit_retention_months         INTEGER NOT NULL DEFAULT 24,
  retention_min_months           INTEGER NOT NULL DEFAULT 1,
  retention_max_months           INTEGER NOT NULL DEFAULT 60,
  max_agent_iterations           INTEGER NOT NULL DEFAULT 8 CHECK (max_agent_iterations BETWEEN 1 AND 30),
  query_row_cap                  INTEGER NOT NULL DEFAULT 500 CHECK (query_row_cap BETWEEN 10 AND 5000),
  query_timeout_ms               INTEGER NOT NULL DEFAULT 5000 CHECK (query_timeout_ms BETWEEN 500 AND 30000),
  updated_at                     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by_admin               UUID,
  CONSTRAINT ai_platform_settings_retention_bounds CHECK (
    retention_min_months >= 1 AND retention_max_months >= retention_min_months
    AND conversation_retention_months BETWEEN retention_min_months AND retention_max_months
    AND audit_retention_months BETWEEN retention_min_months AND retention_max_months
  )
);
INSERT INTO public.ai_platform_settings (id) VALUES (TRUE) ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.ai_platform_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ai_platform_settings_read ON public.ai_platform_settings;
CREATE POLICY ai_platform_settings_read ON public.ai_platform_settings
  FOR SELECT TO authenticated USING (TRUE);
GRANT SELECT ON public.ai_platform_settings TO authenticated;
GRANT ALL ON public.ai_platform_settings TO service_role;
-- No client write policy: Admin writes through public.admin_ai_* RPCs (Admin SQL v236).

-- Server-side job configuration (cron → edge function calls). Never readable by clients.
CREATE TABLE IF NOT EXISTS public.ai_job_config (
  id                  BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id),
  functions_base_url  TEXT,          -- e.g. https://<project>.supabase.co/functions/v1
  cron_secret         TEXT,          -- must equal the AI_CRON_SECRET edge secret
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO public.ai_job_config (id) VALUES (TRUE) ON CONFLICT (id) DO NOTHING;
ALTER TABLE public.ai_job_config ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ai_job_config FROM anon, authenticated;
GRANT ALL ON public.ai_job_config TO service_role;

-- ── 2. Organisation settings (public.ai_settings, one row per organisation) ──
ALTER TABLE public.ai_settings
  ADD COLUMN IF NOT EXISTS consent_accepted_by            UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS conversation_retention_months  INTEGER,
  ADD COLUMN IF NOT EXISTS audit_retention_months         INTEGER,
  ADD COLUMN IF NOT EXISTS retention_admin_override       BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS credit_allowance_override      INTEGER CHECK (credit_allowance_override IS NULL OR credit_allowance_override >= 0),
  ADD COLUMN IF NOT EXISTS admin_ai_disabled              BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS admin_disabled_reason          TEXT,
  ADD COLUMN IF NOT EXISTS report_language_code           TEXT,
  ADD COLUMN IF NOT EXISTS last_warning_period_start      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_by                     UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_at                     TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- D7: AI is off until consent. ai_enabled now means "the organisation has switched AI on";
-- the effective state also needs data_privacy_accepted_at (see ai_org_status).
ALTER TABLE public.ai_settings ALTER COLUMN ai_enabled SET DEFAULT FALSE;

ALTER TABLE public.ai_settings DROP CONSTRAINT IF EXISTS ai_settings_retention_positive;
ALTER TABLE public.ai_settings ADD CONSTRAINT ai_settings_retention_positive CHECK (
  (conversation_retention_months IS NULL OR conversation_retention_months >= 1)
  AND (audit_retention_months IS NULL OR audit_retention_months >= 1)
);

DROP POLICY IF EXISTS "Users read org ai settings" ON public.ai_settings;
DROP POLICY IF EXISTS "PMO admins manage ai settings" ON public.ai_settings;
DROP POLICY IF EXISTS ai_settings_select_members ON public.ai_settings;
CREATE POLICY ai_settings_select_members ON public.ai_settings
  FOR SELECT TO authenticated USING (public.auth_user_can_access_account(organisation_id));
-- Writes only through ai_accept_consent / ai_update_org_settings (bounds checked) and Admin RPCs.
GRANT SELECT ON public.ai_settings TO authenticated;

-- sim.ai_settings (v330) allowed ALL to everyone. Organisation AI settings live in
-- public.ai_settings from v1272; the sim table is kept read-only for legacy readers.
DROP POLICY IF EXISTS "Users read sim ai settings" ON sim.ai_settings;
DROP POLICY IF EXISTS "PMO admins manage sim ai settings" ON sim.ai_settings;
DROP POLICY IF EXISTS sim_ai_settings_select_members ON sim.ai_settings;
CREATE POLICY sim_ai_settings_select_members ON sim.ai_settings
  FOR SELECT TO authenticated USING (public.auth_user_can_access_account(organisation_id));

-- ── 3. Plan allowances ──────────────────────────────────────────────────────
ALTER TABLE public.subscription_plans
  ADD COLUMN IF NOT EXISTS monthly_ai_credits INTEGER CHECK (monthly_ai_credits IS NULL OR monthly_ai_credits >= 0);
COMMENT ON COLUMN public.subscription_plans.monthly_ai_credits IS
  'v1272 D6: monthly AI credit allowance for organisations on this plan type (NULL/0 = none). Planner plans use planner_plan_limits.monthly_ai_credits instead.';

ALTER TABLE public.planner_plan_limits
  ADD COLUMN IF NOT EXISTS monthly_ai_credits INTEGER CHECK (monthly_ai_credits IS NULL OR monthly_ai_credits >= 0);
COMMENT ON COLUMN public.planner_plan_limits.monthly_ai_credits IS
  'v1272 D16a: trial = fixed credits for the whole trial; paid = credits per seat per month, pooled at account level.';
COMMENT ON COLUMN public.planner_plan_limits.max_ai_drafts IS
  'Retired by v1272 (D16a): AI usage is limited by monthly_ai_credits. Kept for backward compatibility only.';

-- ── 4. Credit ledger (account billing data, all apps) ───────────────────────
CREATE TABLE IF NOT EXISTS public.ai_credit_ledger (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id     UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  entry_type     TEXT NOT NULL CHECK (entry_type IN ('usage', 'topup', 'adjustment')),
  credits        NUMERIC(14, 3) NOT NULL,   -- usage: positive amount used; topup: positive; adjustment: +/-
  app            TEXT CHECK (app IN ('platform', 'simulator', 'planner')),
  agent          TEXT,
  agent_run_id   UUID,                      -- public.agent_runs.id or sim.agent_runs.id (app says which)
  note           TEXT,
  created_by     UUID,                      -- users.id (usage) or admin user id (top-ups)
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_credit_ledger_account_created ON public.ai_credit_ledger (account_id, created_at DESC);
ALTER TABLE public.ai_credit_ledger ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ai_credit_ledger_select_admins ON public.ai_credit_ledger;
CREATE POLICY ai_credit_ledger_select_admins ON public.ai_credit_ledger
  FOR SELECT TO authenticated USING (public.is_pmo_admin_or_owner_for_account(account_id));
GRANT SELECT ON public.ai_credit_ledger TO authenticated;
GRANT ALL ON public.ai_credit_ledger TO service_role;

-- ── 5. Agent runs / steps (public and sim) ──────────────────────────────────
DO $$
DECLARE s TEXT;
BEGIN
  FOREACH s IN ARRAY ARRAY['public', 'sim'] LOOP
    EXECUTE format($f$
      CREATE TABLE IF NOT EXISTS %1$I.agent_runs (
        id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        account_id         UUID REFERENCES public.accounts(id) ON DELETE CASCADE,
        user_id            UUID REFERENCES auth.users(id) ON DELETE SET NULL,
        project_id         UUID,
        conversation_id    UUID,
        app                TEXT NOT NULL CHECK (app IN ('platform', 'simulator', 'planner')),
        agent              TEXT NOT NULL,
        model              TEXT,
        status             TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'succeeded', 'failed', 'blocked')),
        block_reason       TEXT,
        input_tokens       INTEGER NOT NULL DEFAULT 0,
        output_tokens      INTEGER NOT NULL DEFAULT 0,
        cache_read_tokens  INTEGER NOT NULL DEFAULT 0,
        cache_write_tokens INTEGER NOT NULL DEFAULT 0,
        credits            NUMERIC(14, 3) NOT NULL DEFAULT 0,
        tool_calls         INTEGER NOT NULL DEFAULT 0,
        language_code      TEXT,
        question_text      TEXT,      -- removed by retention purge when the conversation is purged
        answer_text        TEXT,      -- idem
        error_text         TEXT,
        started_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        finished_at        TIMESTAMPTZ,
        duration_ms        INTEGER
      )$f$, s);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_agent_runs_account_started ON %1$I.agent_runs (account_id, started_at DESC)', s);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_agent_runs_user_started ON %1$I.agent_runs (user_id, started_at DESC)', s);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_agent_runs_conversation ON %1$I.agent_runs (conversation_id)', s);

    EXECUTE format($f$
      CREATE TABLE IF NOT EXISTS %1$I.agent_steps (
        id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        run_id              UUID NOT NULL REFERENCES %1$I.agent_runs(id) ON DELETE CASCADE,
        step_no             INTEGER NOT NULL,
        step_type           TEXT NOT NULL CHECK (step_type IN ('model', 'tool')),
        tool_name           TEXT,
        tool_input          JSONB,
        tool_output_summary JSONB,
        is_error            BOOLEAN NOT NULL DEFAULT FALSE,
        input_tokens        INTEGER NOT NULL DEFAULT 0,
        output_tokens       INTEGER NOT NULL DEFAULT 0,
        duration_ms         INTEGER,
        created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )$f$, s);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_agent_steps_run ON %1$I.agent_steps (run_id, step_no)', s);

    EXECUTE format('ALTER TABLE %1$I.agent_runs ENABLE ROW LEVEL SECURITY', s);
    EXECUTE format('ALTER TABLE %1$I.agent_steps ENABLE ROW LEVEL SECURITY', s);

    EXECUTE format('DROP POLICY IF EXISTS agent_runs_select ON %1$I.agent_runs', s);
    EXECUTE format($f$
      CREATE POLICY agent_runs_select ON %1$I.agent_runs FOR SELECT TO authenticated
      USING (user_id = auth.uid() OR public.is_pmo_admin_or_owner_for_account(account_id))$f$, s);
    EXECUTE format('DROP POLICY IF EXISTS agent_steps_select ON %1$I.agent_steps', s);
    EXECUTE format($f$
      CREATE POLICY agent_steps_select ON %1$I.agent_steps FOR SELECT TO authenticated
      USING (EXISTS (SELECT 1 FROM %1$I.agent_runs r WHERE r.id = run_id
                     AND (r.user_id = auth.uid() OR public.is_pmo_admin_or_owner_for_account(r.account_id))))$f$, s);
    -- Inserts/updates come from edge functions with the service role only.
    EXECUTE format('GRANT SELECT ON %1$I.agent_runs, %1$I.agent_steps TO authenticated', s);
    EXECUTE format('GRANT ALL ON %1$I.agent_runs, %1$I.agent_steps TO service_role', s);
  END LOOP;
END $$;

-- sim.ai_conversations had no organisation column; needed for retention per organisation.
ALTER TABLE sim.ai_conversations ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL;
ALTER TABLE sim.ai_messages ADD COLUMN IF NOT EXISTS structured_data JSONB;
ALTER TABLE sim.ai_messages DROP CONSTRAINT IF EXISTS ai_messages_processed_by_check;
ALTER TABLE sim.ai_messages ADD CONSTRAINT ai_messages_processed_by_check
  CHECK (processed_by IS NULL OR processed_by IN ('local', 'external', 'data', 'docs', 'agent'));
ALTER TABLE public.ai_messages DROP CONSTRAINT IF EXISTS ai_messages_processed_by_check;
ALTER TABLE public.ai_messages ADD CONSTRAINT ai_messages_processed_by_check
  CHECK (processed_by IS NULL OR processed_by IN ('local', 'external', 'data', 'docs', 'agent'));
ALTER TABLE public.ai_conversations DROP CONSTRAINT IF EXISTS ai_conversations_domain_check;
ALTER TABLE public.ai_conversations ADD CONSTRAINT ai_conversations_domain_check
  CHECK (domain IN ('platform', 'simulator', 'planner'));

-- ── 6. Languages (D18) ──────────────────────────────────────────────────────
ALTER TABLE public.languages ADD COLUMN IF NOT EXISTS ai_supported BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE sim.languages    ADD COLUMN IF NOT EXISTS ai_supported BOOLEAN NOT NULL DEFAULT FALSE;
-- Initial AI languages = the languages already active in the system (Admin can change this).
UPDATE public.languages SET ai_supported = TRUE
 WHERE code IN ('en-US', 'en-GB', 'fr-FR', 'es-ES', 'de-DE', 'pt-BR', 'it-IT') AND is_active AND NOT ai_supported;
UPDATE sim.languages SET ai_supported = TRUE
 WHERE code IN ('en-US', 'en-GB', 'fr-FR', 'es-ES', 'de-DE', 'pt-BR', 'it-IT') AND is_active AND NOT ai_supported;

-- Fixed AI UI messages (not AI-generated) per language.
CREATE TABLE IF NOT EXISTS public.ai_ui_messages (
  message_key    TEXT NOT NULL,
  language_code  TEXT NOT NULL,
  message_text   TEXT NOT NULL,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (message_key, language_code)
);
ALTER TABLE public.ai_ui_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ai_ui_messages_read ON public.ai_ui_messages;
CREATE POLICY ai_ui_messages_read ON public.ai_ui_messages FOR SELECT TO authenticated USING (TRUE);
GRANT SELECT ON public.ai_ui_messages TO authenticated;
GRANT ALL ON public.ai_ui_messages TO service_role;

INSERT INTO public.ai_ui_messages (message_key, language_code, message_text) VALUES
  ('not_enabled',        'en', 'AI isn''t enabled for your organisation yet. Ask {owner} to turn it on in AI Settings.'),
  ('not_enabled',        'fr', 'L''IA n''est pas encore activée pour votre organisation. Demandez à {owner} de l''activer dans les paramètres IA.'),
  ('not_enabled',        'es', 'La IA aún no está habilitada para su organización. Pida a {owner} que la active en la configuración de IA.'),
  ('not_enabled',        'de', 'KI ist für Ihre Organisation noch nicht aktiviert. Bitten Sie {owner}, sie in den KI-Einstellungen einzuschalten.'),
  ('not_enabled',        'pt', 'A IA ainda não está ativada para a sua organização. Peça a {owner} para ativá-la nas configurações de IA.'),
  ('not_enabled',        'it', 'L''IA non è ancora attiva per la tua organizzazione. Chiedi a {owner} di attivarla nelle impostazioni IA.'),
  ('kill_switch',        'en', 'AI features are temporarily unavailable. Please try again later.'),
  ('kill_switch',        'fr', 'Les fonctionnalités d''IA sont temporairement indisponibles. Veuillez réessayer plus tard.'),
  ('kill_switch',        'es', 'Las funciones de IA no están disponibles temporalmente. Inténtelo de nuevo más tarde.'),
  ('kill_switch',        'de', 'KI-Funktionen sind vorübergehend nicht verfügbar. Bitte versuchen Sie es später erneut.'),
  ('kill_switch',        'pt', 'Os recursos de IA estão temporariamente indisponíveis. Tente novamente mais tarde.'),
  ('kill_switch',        'it', 'Le funzioni di IA sono temporaneamente non disponibili. Riprova più tardi.'),
  ('admin_disabled',     'en', 'AI has been switched off for your organisation by the system administrator.'),
  ('admin_disabled',     'fr', 'L''IA a été désactivée pour votre organisation par l''administrateur système.'),
  ('admin_disabled',     'es', 'El administrador del sistema ha desactivado la IA para su organización.'),
  ('admin_disabled',     'de', 'KI wurde vom Systemadministrator für Ihre Organisation deaktiviert.'),
  ('admin_disabled',     'pt', 'A IA foi desativada para a sua organização pelo administrador do sistema.'),
  ('admin_disabled',     'it', 'L''IA è stata disattivata per la tua organizzazione dall''amministratore di sistema.'),
  ('quota_warning',      'en', 'Your organisation has used {percent}% of this month''s AI credits.'),
  ('quota_warning',      'fr', 'Votre organisation a utilisé {percent} % des crédits IA de ce mois.'),
  ('quota_warning',      'es', 'Su organización ha usado el {percent} % de los créditos de IA de este mes.'),
  ('quota_warning',      'de', 'Ihre Organisation hat {percent} % der KI-Credits dieses Monats verbraucht.'),
  ('quota_warning',      'pt', 'A sua organização usou {percent}% dos créditos de IA deste mês.'),
  ('quota_warning',      'it', 'La tua organizzazione ha usato il {percent}% dei crediti IA di questo mese.'),
  ('quota_blocked',      'en', 'Your organisation has used all of this period''s AI credits. They renew on {renews}. Contact {owner} to upgrade or add credits.'),
  ('quota_blocked',      'fr', 'Votre organisation a utilisé tous les crédits IA de cette période. Ils se renouvellent le {renews}. Contactez {owner} pour passer à une offre supérieure ou ajouter des crédits.'),
  ('quota_blocked',      'es', 'Su organización ha usado todos los créditos de IA de este periodo. Se renuevan el {renews}. Contacte con {owner} para mejorar el plan o añadir créditos.'),
  ('quota_blocked',      'de', 'Ihre Organisation hat alle KI-Credits dieses Zeitraums verbraucht. Sie werden am {renews} erneuert. Wenden Sie sich an {owner}, um ein Upgrade durchzuführen oder Credits hinzuzufügen.'),
  ('quota_blocked',      'pt', 'A sua organização usou todos os créditos de IA deste período. Eles renovam em {renews}. Contacte {owner} para fazer upgrade ou adicionar créditos.'),
  ('quota_blocked',      'it', 'La tua organizzazione ha usato tutti i crediti IA di questo periodo. Si rinnovano il {renews}. Contatta {owner} per un upgrade o per aggiungere crediti.'),
  ('read_only',          'en', 'Your trial has ended, so Ask Nidus is read-only. Upgrade to keep asking questions.'),
  ('read_only',          'fr', 'Votre essai est terminé : Ask Nidus est en lecture seule. Passez à l''offre payante pour continuer à poser des questions.'),
  ('read_only',          'es', 'Su prueba ha terminado, por lo que Ask Nidus es de solo lectura. Mejore su plan para seguir preguntando.'),
  ('read_only',          'de', 'Ihre Testphase ist beendet, Ask Nidus ist schreibgeschützt. Führen Sie ein Upgrade durch, um weiter Fragen zu stellen.'),
  ('read_only',          'pt', 'O seu período de teste terminou, por isso o Ask Nidus está só de leitura. Faça upgrade para continuar a perguntar.'),
  ('read_only',          'it', 'La prova è terminata, quindi Ask Nidus è di sola lettura. Passa a un piano a pagamento per continuare a fare domande.'),
  ('not_in_edition',     'en', 'That information isn''t available in the Project Planner edition. Ask Nidus here covers schedule, resources and dependencies; the full Project Nidus platform also covers risks, issues, budgets, changes and more.'),
  ('not_in_edition',     'fr', 'Cette information n''est pas disponible dans l''édition Project Planner. Ici, Ask Nidus couvre le planning, les ressources et les dépendances ; la plateforme Project Nidus complète couvre aussi les risques, problèmes, budgets, changements et plus.'),
  ('not_in_edition',     'es', 'Esa información no está disponible en la edición Project Planner. Aquí Ask Nidus cubre cronograma, recursos y dependencias; la plataforma completa de Project Nidus también cubre riesgos, incidencias, presupuestos, cambios y más.'),
  ('not_in_edition',     'de', 'Diese Information ist in der Project-Planner-Edition nicht verfügbar. Ask Nidus deckt hier Terminplan, Ressourcen und Abhängigkeiten ab; die vollständige Project-Nidus-Plattform umfasst auch Risiken, Probleme, Budgets, Änderungen und mehr.'),
  ('not_in_edition',     'pt', 'Essa informação não está disponível na edição Project Planner. Aqui o Ask Nidus cobre cronograma, recursos e dependências; a plataforma Project Nidus completa também cobre riscos, problemas, orçamentos, mudanças e mais.'),
  ('not_in_edition',     'it', 'Questa informazione non è disponibile nell''edizione Project Planner. Qui Ask Nidus copre pianificazione, risorse e dipendenze; la piattaforma Project Nidus completa copre anche rischi, problemi, budget, modifiche e altro.'),
  -- Suggested starter questions per app ('|'-separated)
  ('suggestions_platform',  'en', 'Which projects are behind schedule?|How many open high risks do we have by project?|Which issues are overdue?'),
  ('suggestions_platform',  'fr', 'Quels projets sont en retard ?|Combien de risques élevés ouverts avons-nous par projet ?|Quels problèmes sont en retard ?'),
  ('suggestions_platform',  'es', '¿Qué proyectos van retrasados?|¿Cuántos riesgos altos abiertos tenemos por proyecto?|¿Qué incidencias están vencidas?'),
  ('suggestions_platform',  'de', 'Welche Projekte liegen hinter dem Zeitplan?|Wie viele offene hohe Risiken haben wir je Projekt?|Welche Probleme sind überfällig?'),
  ('suggestions_platform',  'pt', 'Que projetos estão atrasados?|Quantos riscos altos abertos temos por projeto?|Que problemas estão em atraso?'),
  ('suggestions_platform',  'it', 'Quali progetti sono in ritardo?|Quanti rischi alti aperti abbiamo per progetto?|Quali problemi sono scaduti?'),
  ('suggestions_simulator', 'en', 'How is my practice project doing?|Which practice risks are still open?|Which tasks are late?'),
  ('suggestions_simulator', 'fr', 'Où en est mon projet d''entraînement ?|Quels risques d''entraînement sont encore ouverts ?|Quelles tâches sont en retard ?'),
  ('suggestions_simulator', 'es', '¿Cómo va mi proyecto de práctica?|¿Qué riesgos de práctica siguen abiertos?|¿Qué tareas van retrasadas?'),
  ('suggestions_simulator', 'de', 'Wie läuft mein Übungsprojekt?|Welche Übungsrisiken sind noch offen?|Welche Aufgaben sind verspätet?'),
  ('suggestions_simulator', 'pt', 'Como está o meu projeto de prática?|Que riscos de prática ainda estão abertos?|Que tarefas estão atrasadas?'),
  ('suggestions_simulator', 'it', 'Come sta andando il mio progetto di pratica?|Quali rischi di pratica sono ancora aperti?|Quali attività sono in ritardo?'),
  ('suggestions_planner',   'en', 'Which tasks drive the finish date?|Who is over-allocated next month?|Which tasks are late?'),
  ('suggestions_planner',   'fr', 'Quelles tâches déterminent la date de fin ?|Qui est surchargé le mois prochain ?|Quelles tâches sont en retard ?'),
  ('suggestions_planner',   'es', '¿Qué tareas determinan la fecha de fin?|¿Quién está sobreasignado el próximo mes?|¿Qué tareas van retrasadas?'),
  ('suggestions_planner',   'de', 'Welche Aufgaben bestimmen das Enddatum?|Wer ist nächsten Monat überlastet?|Welche Aufgaben sind verspätet?'),
  ('suggestions_planner',   'pt', 'Que tarefas determinam a data de fim?|Quem está sobrealocado no próximo mês?|Que tarefas estão atrasadas?'),
  ('suggestions_planner',   'it', 'Quali attività determinano la data di fine?|Chi è sovraccarico il mese prossimo?|Quali attività sono in ritardo?')
ON CONFLICT (message_key, language_code) DO UPDATE SET message_text = EXCLUDED.message_text, updated_at = NOW();

-- ── 7. Functions ────────────────────────────────────────────────────────────

-- Start of the organisation's current credit period: the latest monthly anniversary of the
-- active subscription's start (planner trial: the trial start), else of the account creation.
CREATE OR REPLACE FUNCTION public.ai_period_start(p_account_id UUID)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
DECLARE
  v_anchor TIMESTAMPTZ;
  v_trial  BOOLEAN := FALSE;
  v_months INTEGER;
BEGIN
  SELECT ps.started_at, COALESCE(ps.is_trial, FALSE) INTO v_anchor, v_trial
    FROM public.platform_subscriptions ps
   WHERE ps.account_id = p_account_id
     AND ps.status IN ('active', 'trial', 'trialing')
   ORDER BY (ps.status = 'active' AND NOT COALESCE(ps.is_trial, FALSE)) DESC, ps.started_at DESC NULLS LAST
   LIMIT 1;
  IF v_anchor IS NULL THEN
    SELECT created_at INTO v_anchor FROM public.accounts WHERE id = p_account_id;
  END IF;
  IF v_anchor IS NULL THEN RETURN date_trunc('month', NOW()); END IF;
  IF v_trial THEN RETURN v_anchor; END IF;   -- trial allowance covers the whole trial
  v_months := (EXTRACT(YEAR FROM age(NOW(), v_anchor)) * 12 + EXTRACT(MONTH FROM age(NOW(), v_anchor)))::INT;
  RETURN v_anchor + make_interval(months => GREATEST(v_months, 0));
END;
$$;

-- Monthly allowance (credits) before top-ups. Admin override wins.
CREATE OR REPLACE FUNCTION public.ai_account_allowance(p_account_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
DECLARE
  v_override INTEGER;
  v_edition  TEXT;
  v_status   JSONB;
  v_paid     BOOLEAN;
  v_seats    INTEGER;
  v_credits  INTEGER;
  v_plan     TEXT;
BEGIN
  SELECT credit_allowance_override INTO v_override FROM public.ai_settings WHERE organisation_id = p_account_id;
  IF v_override IS NOT NULL THEN RETURN v_override; END IF;

  SELECT product_edition INTO v_edition FROM public.accounts WHERE id = p_account_id;

  IF v_edition = 'planner' THEN
    v_status := public.account_planner_status(p_account_id);
    v_paid := COALESCE((v_status ->> 'is_paid')::BOOLEAN, FALSE);
    SELECT monthly_ai_credits INTO v_credits FROM public.planner_plan_limits
     WHERE plan_code = CASE WHEN v_paid THEN 'paid' ELSE 'trial' END AND is_active;
    IF v_paid THEN
      SELECT GREATEST(COALESCE(max_team_members, 1), 1) INTO v_seats FROM public.platform_subscriptions
       WHERE account_id = p_account_id AND plan_type = 'planner' AND status = 'active' AND NOT COALESCE(is_trial, FALSE)
       ORDER BY created_at DESC LIMIT 1;
      RETURN COALESCE(v_credits, 0) * COALESCE(v_seats, 1);
    END IF;
    RETURN COALESCE(v_credits, 0);
  END IF;

  SELECT ps.plan_type INTO v_plan FROM public.platform_subscriptions ps
   WHERE ps.account_id = p_account_id AND ps.status = 'active' AND NOT COALESCE(ps.is_trial, FALSE)
     AND (ps.expires_at IS NULL OR ps.expires_at > NOW() OR COALESCE(ps.is_in_grace_period, FALSE))
   ORDER BY ps.created_at DESC LIMIT 1;
  IF v_plan IS NOT NULL THEN
    SELECT MAX(sp.monthly_ai_credits) INTO v_credits FROM public.subscription_plans sp
     WHERE sp.plan_type = v_plan AND sp.is_active;
    IF v_credits IS NOT NULL THEN RETURN v_credits; END IF;
  END IF;
  RETURN (SELECT default_trial_credits FROM public.ai_platform_settings WHERE id);
END;
$$;

CREATE OR REPLACE FUNCTION public.ai_account_used(p_account_id UUID, p_since TIMESTAMPTZ)
RETURNS NUMERIC
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
  SELECT COALESCE(SUM(CASE WHEN entry_type = 'usage' THEN credits ELSE 0 END), 0)
       - COALESCE(SUM(CASE WHEN entry_type IN ('topup', 'adjustment') THEN credits ELSE 0 END), 0)
    FROM public.ai_credit_ledger
   WHERE account_id = p_account_id AND created_at >= p_since;
$$;

-- Everything the UI and the edge gate need, for one organisation (default: the caller's current one).
CREATE OR REPLACE FUNCTION public.ai_org_status(p_account_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
DECLARE
  v_account   UUID := COALESCE(p_account_id, public.auth_user_current_account_id());
  v_platform  public.ai_platform_settings%ROWTYPE;
  v_settings  public.ai_settings%ROWTYPE;
  v_edition   TEXT;
  v_planner   JSONB;
  v_start     TIMESTAMPTZ;
  v_allowance NUMERIC;
  v_used      NUMERIC;
  v_percent   NUMERIC;
  v_owner     TEXT;
  v_accepted_by TEXT;
  v_level     TEXT := 'none';
  v_reason    TEXT := NULL;
  v_conv      INTEGER;
  v_audit     INTEGER;
BEGIN
  IF v_account IS NULL OR NOT public.auth_user_can_access_account(v_account) THEN
    RETURN jsonb_build_object('allowed', FALSE, 'reason', 'no_account');
  END IF;

  SELECT * INTO v_platform FROM public.ai_platform_settings WHERE id;
  SELECT * INTO v_settings FROM public.ai_settings WHERE organisation_id = v_account;
  SELECT product_edition INTO v_edition FROM public.accounts WHERE id = v_account;
  v_planner := CASE WHEN v_edition = 'planner' THEN public.account_planner_status(v_account) END;

  SELECT COALESCE(u.full_name, u.display_name, u.email) INTO v_owner
    FROM public.accounts a JOIN public.users u ON u.id = a.owner_user_id WHERE a.id = v_account;
  SELECT COALESCE(u.full_name, u.display_name, u.email) INTO v_accepted_by
    FROM public.users u WHERE u.id = v_settings.consent_accepted_by;

  v_start     := public.ai_period_start(v_account);
  v_allowance := public.ai_account_allowance(v_account)
               + COALESCE((SELECT SUM(credits) FROM public.ai_credit_ledger
                            WHERE account_id = v_account AND entry_type IN ('topup', 'adjustment') AND created_at >= v_start), 0);
  v_used      := COALESCE((SELECT SUM(credits) FROM public.ai_credit_ledger
                            WHERE account_id = v_account AND entry_type = 'usage' AND created_at >= v_start), 0);
  v_percent   := CASE WHEN v_allowance > 0 THEN ROUND(v_used * 100 / v_allowance, 1) ELSE 100 END;

  IF v_percent >= 100 THEN v_level := 'blocked';
  ELSIF v_percent >= v_platform.warn_percent THEN v_level := 'warn';
  END IF;

  v_conv  := COALESCE(v_settings.conversation_retention_months, v_platform.conversation_retention_months);
  v_audit := COALESCE(v_settings.audit_retention_months, v_platform.audit_retention_months);

  IF v_platform.kill_switch THEN v_reason := 'kill_switch';
  ELSIF COALESCE(v_settings.admin_ai_disabled, FALSE) THEN v_reason := 'admin_disabled';
  ELSIF v_settings.data_privacy_accepted_at IS NULL OR NOT COALESCE(v_settings.ai_enabled, FALSE) THEN v_reason := 'not_enabled';
  ELSIF COALESCE((v_planner ->> 'read_only')::BOOLEAN, FALSE) THEN v_reason := 'read_only';
  ELSIF v_level = 'blocked' THEN v_reason := 'quota_blocked';
  END IF;

  RETURN jsonb_build_object(
    'account_id',          v_account,
    'edition',             COALESCE(v_edition, 'platform'),
    'allowed',             v_reason IS NULL,
    'reason',              v_reason,
    'kill_switch',         v_platform.kill_switch,
    'admin_disabled',      COALESCE(v_settings.admin_ai_disabled, FALSE),
    'ai_enabled',          COALESCE(v_settings.ai_enabled, FALSE),
    'consent_accepted',    v_settings.data_privacy_accepted_at IS NOT NULL,
    'consent_accepted_at', v_settings.data_privacy_accepted_at,
    'consent_accepted_by', v_accepted_by,
    'owner_name',          v_owner,
    'can_manage',          public.is_pmo_admin_or_owner_for_account(v_account),
    'allowance',           v_allowance,
    'used',                v_used,
    'remaining',           GREATEST(v_allowance - v_used, 0),
    'percent',             v_percent,
    'warning_level',       v_level,
    'warn_percent',        v_platform.warn_percent,
    'period_start',        v_start,
    'period_end',          CASE WHEN COALESCE((v_planner ->> 'is_trial')::BOOLEAN, FALSE)
                                THEN (v_planner ->> 'trial_end')::TIMESTAMPTZ
                                ELSE v_start + INTERVAL '1 month' END,
    'conversation_retention_months', v_conv,
    'audit_retention_months',        v_audit,
    'retention_min_months',          v_platform.retention_min_months,
    'retention_max_months',          v_platform.retention_max_months,
    'retention_admin_override',      COALESCE(v_settings.retention_admin_override, FALSE),
    'report_language_code',          v_settings.report_language_code,
    'last_warning_period_start',     v_settings.last_warning_period_start
  );
END;
$$;

-- D7: Account Owner / PMO Admin accepts the AI data-processing notice for the organisation.
CREATE OR REPLACE FUNCTION public.ai_accept_consent(p_account_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
DECLARE
  v_account UUID := COALESCE(p_account_id, public.auth_user_current_account_id());
  v_user    UUID := public.current_internal_user_id();
BEGIN
  IF v_account IS NULL OR NOT public.is_pmo_admin_or_owner_for_account(v_account) THEN
    RAISE EXCEPTION 'Only the Account Owner or a PMO Admin can accept the AI notice' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.ai_settings (organisation_id, ai_enabled, data_privacy_accepted_at, consent_accepted_by, updated_by, updated_at)
  VALUES (v_account, TRUE, NOW(), v_user, v_user, NOW())
  ON CONFLICT (organisation_id) DO UPDATE SET
    ai_enabled = TRUE,
    data_privacy_accepted_at = NOW(),
    consent_accepted_by = v_user,
    updated_by = v_user,
    updated_at = NOW();
  RETURN public.ai_org_status(v_account);
END;
$$;

-- Organisation-level changes (AI on/off, retention within Admin min/max, report language).
CREATE OR REPLACE FUNCTION public.ai_update_org_settings(
  p_account_id UUID,
  p_ai_enabled BOOLEAN,
  p_conversation_retention_months INTEGER,
  p_audit_retention_months INTEGER,
  p_report_language_code TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
DECLARE
  v_account  UUID := COALESCE(p_account_id, public.auth_user_current_account_id());
  v_user     UUID := public.current_internal_user_id();
  v_platform public.ai_platform_settings%ROWTYPE;
  v_current  public.ai_settings%ROWTYPE;
BEGIN
  IF v_account IS NULL OR NOT public.is_pmo_admin_or_owner_for_account(v_account) THEN
    RAISE EXCEPTION 'Only the Account Owner or a PMO Admin can change AI settings' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_platform FROM public.ai_platform_settings WHERE id;
  SELECT * INTO v_current FROM public.ai_settings WHERE organisation_id = v_account;

  IF COALESCE(p_ai_enabled, FALSE) AND v_current.data_privacy_accepted_at IS NULL THEN
    RAISE EXCEPTION 'Accept the AI data-processing notice before switching AI on';
  END IF;
  -- An Admin per-organisation retention override can only be changed in Admin.
  IF COALESCE(v_current.retention_admin_override, FALSE)
     AND (p_conversation_retention_months IS DISTINCT FROM v_current.conversation_retention_months
          OR p_audit_retention_months IS DISTINCT FROM v_current.audit_retention_months) THEN
    RAISE EXCEPTION 'Retention for this organisation is set by the system administrator';
  END IF;
  IF NOT COALESCE(v_current.retention_admin_override, FALSE) THEN
    IF p_conversation_retention_months IS NOT NULL
       AND p_conversation_retention_months NOT BETWEEN v_platform.retention_min_months AND v_platform.retention_max_months THEN
      RAISE EXCEPTION 'Conversation retention must be between % and % months', v_platform.retention_min_months, v_platform.retention_max_months;
    END IF;
    IF p_audit_retention_months IS NOT NULL
       AND p_audit_retention_months NOT BETWEEN v_platform.retention_min_months AND v_platform.retention_max_months THEN
      RAISE EXCEPTION 'Audit retention must be between % and % months', v_platform.retention_min_months, v_platform.retention_max_months;
    END IF;
  END IF;
  IF p_report_language_code IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.languages WHERE code = p_report_language_code AND is_active AND ai_supported
  ) THEN
    RAISE EXCEPTION 'Unsupported report language';
  END IF;

  INSERT INTO public.ai_settings (organisation_id, ai_enabled, conversation_retention_months, audit_retention_months,
                                  report_language_code, updated_by, updated_at)
  VALUES (v_account, COALESCE(p_ai_enabled, FALSE), p_conversation_retention_months, p_audit_retention_months,
          p_report_language_code, v_user, NOW())
  ON CONFLICT (organisation_id) DO UPDATE SET
    ai_enabled = COALESCE(p_ai_enabled, FALSE),
    conversation_retention_months = p_conversation_retention_months,
    audit_retention_months = p_audit_retention_months,
    report_language_code = p_report_language_code,
    updated_by = v_user,
    updated_at = NOW();
  RETURN public.ai_org_status(v_account);
END;
$$;

-- How many conversations a shorter conversation-retention period would delete (D8 warning).
CREATE OR REPLACE FUNCTION public.ai_purge_preview(p_account_id UUID, p_conversation_retention_months INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
DECLARE v_count INTEGER;
BEGIN
  IF p_account_id IS NULL OR NOT public.is_pmo_admin_or_owner_for_account(p_account_id) THEN
    RAISE EXCEPTION 'Not allowed' USING ERRCODE = '42501';
  END IF;
  SELECT (SELECT COUNT(*) FROM public.ai_conversations
           WHERE organisation_id = p_account_id
             AND updated_at < NOW() - make_interval(months => p_conversation_retention_months))
       + (SELECT COUNT(*) FROM sim.ai_conversations
           WHERE organisation_id = p_account_id
             AND updated_at < NOW() - make_interval(months => p_conversation_retention_months))
    INTO v_count;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.ai_period_start(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ai_account_allowance(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ai_account_used(UUID, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ai_period_start(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.ai_account_allowance(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.ai_account_used(UUID, TIMESTAMPTZ) TO service_role;
GRANT EXECUTE ON FUNCTION public.ai_org_status(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ai_accept_consent(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ai_update_org_settings(UUID, BOOLEAN, INTEGER, INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ai_purge_preview(UUID, INTEGER) TO authenticated;

-- ── 8. Register new tables ──────────────────────────────────────────────────
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('ai_platform_settings', 'Global AI settings: kill switch, model routing and prices, credit unit, retention defaults (v1272)', true, true),
  ('ai_job_config',        'Server-only configuration for scheduled AI jobs (v1272)', true, true),
  ('ai_credit_ledger',     'AI credit usage, top-ups and adjustments per organisation (v1272)', true, true),
  ('agent_runs',           'Audit trail of AI agent runs: who, model, tokens, credits, outcome (v1272)', true, true),
  ('agent_steps',          'Individual model and tool steps within an AI agent run (v1272)', true, true),
  ('sim.agent_runs',       'Simulator audit trail of AI agent runs (v1272)', true, true),
  ('sim.agent_steps',      'Simulator model and tool steps within an AI agent run (v1272)', true, true),
  ('ai_ui_messages',       'Fixed AI interface messages per language (v1272)', true, true)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  is_system_table = EXCLUDED.is_system_table,
  updated_at = NOW();

NOTIFY pgrst, 'reload schema';

DO $$ BEGIN RAISE NOTICE 'v1272_ai_governance_core.sql completed — now re-run SQL/v1251_planner_table_wall.sql'; END $$;

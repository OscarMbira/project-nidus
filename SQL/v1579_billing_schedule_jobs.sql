-- ============================================================================
-- v1579 — Billing schedules, revenue view and background jobs (v1353 slices 3 and 4)
-- Run after v1578. Jobs: billing.schedule_due, billing.recurring_drafts (SQL, daily,
-- organisation time) and billing.overdue_reminders (handler). The handler file is
-- supabase/functions/background-job-worker/handlers/billing.overdue_reminders.js.
-- Idempotent.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.billing_schedule_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  basis TEXT NOT NULL,
  milestone_id UUID,
  amount NUMERIC(18,2),
  percent_of_contract NUMERIC(8,2),
  due_date DATE,
  frequency TEXT,
  next_due DATE,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT billing_schedule_basis CHECK (basis IN ('milestone', 'date', 'recurring')),
  CONSTRAINT billing_schedule_status CHECK (status IN ('open', 'invoiced', 'cancelled')),
  CONSTRAINT billing_schedule_percent CHECK (percent_of_contract IS NULL OR (percent_of_contract > 0 AND percent_of_contract <= 100))
);
CREATE TABLE IF NOT EXISTS sim.billing_schedule_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  basis TEXT NOT NULL,
  milestone_id UUID,
  amount NUMERIC(18,2),
  percent_of_contract NUMERIC(8,2),
  due_date DATE,
  frequency TEXT,
  next_due DATE,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT billing_schedule_basis CHECK (basis IN ('milestone', 'date', 'recurring')),
  CONSTRAINT billing_schedule_status CHECK (status IN ('open', 'invoiced', 'cancelled')),
  CONSTRAINT billing_schedule_percent CHECK (percent_of_contract IS NULL OR (percent_of_contract > 0 AND percent_of_contract <= 100))
);

ALTER TABLE public.billing_schedule_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.billing_schedule_lines ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.billing_schedule_lines, sim.billing_schedule_lines TO authenticated;
GRANT ALL ON public.billing_schedule_lines, sim.billing_schedule_lines TO service_role;
DROP POLICY IF EXISTS billing_schedule_lines_all ON public.billing_schedule_lines;
CREATE POLICY billing_schedule_lines_all ON public.billing_schedule_lines FOR ALL TO authenticated
  USING (public.auth_user_can_access_project(project_id)) WITH CHECK (public.auth_user_can_access_project(project_id));
DROP POLICY IF EXISTS billing_schedule_lines_all ON sim.billing_schedule_lines;
CREATE POLICY billing_schedule_lines_all ON sim.billing_schedule_lines FOR ALL TO authenticated
  USING (sim.qra_can_access(project_id)) WITH CHECK (sim.qra_can_access(project_id));

-- Dated and milestone lines that are due become a draft invoice line. Recurring lines move their next date.
CREATE OR REPLACE FUNCTION public.billing_schedule_due(p_context JSONB DEFAULT '{}'::jsonb)
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public SET row_security = off AS $$
DECLARE n INTEGER := 0; r RECORD; v_invoice UUID; v_amount NUMERIC; v_client UUID; v_value NUMERIC;
BEGIN
  FOR r IN
    SELECT l.*, s.client_id, s.contract_value, s.currency, c.kind, c.default_tax_code_id, c.payment_terms_days, p.account_id
    FROM public.billing_schedule_lines l
    JOIN public.project_billing_settings s ON s.project_id = l.project_id
    JOIN public.clients c ON c.id = s.client_id
    JOIN public.projects p ON p.id = l.project_id
    WHERE l.status = 'open' AND (
      (l.basis = 'date' AND l.due_date IS NOT NULL AND l.due_date <= CURRENT_DATE)
      OR (l.basis = 'milestone' AND l.milestone_id IS NOT NULL AND (
            (p_context ? 'milestone_id' AND l.milestone_id = (p_context ->> 'milestone_id')::uuid)
            OR EXISTS (SELECT 1 FROM public.milestones m WHERE m.id = l.milestone_id AND m.status = 'achieved' AND COALESCE(m.is_deleted, FALSE) = FALSE)
          ))
    )
  LOOP
    v_amount := COALESCE(r.amount, round(COALESCE(r.contract_value, 0) * COALESCE(r.percent_of_contract, 0) / 100, 2));
    SELECT id INTO v_invoice FROM public.client_invoices
     WHERE project_id = r.project_id AND status = 'draft' AND period_start = CURRENT_DATE LIMIT 1;
    IF v_invoice IS NULL THEN
      INSERT INTO public.client_invoices (account_id, client_id, project_id, status, invoice_date, due_date, period_start, period_end, currency)
      VALUES (r.account_id, r.client_id, r.project_id, 'draft', CURRENT_DATE, CURRENT_DATE + COALESCE(r.payment_terms_days, 30), CURRENT_DATE, CURRENT_DATE, COALESCE(r.currency, 'USD'))
      RETURNING id INTO v_invoice;
    END IF;
    INSERT INTO public.client_invoice_lines (invoice_id, source, source_id, description, quantity, unit, rate, amount, tax_code_id, tax_amount)
    VALUES (v_invoice, 'schedule', r.id, r.description, 1, 'each', v_amount, v_amount, r.default_tax_code_id,
      CASE WHEN r.kind = 'internal' THEN 0 ELSE round(v_amount * COALESCE((SELECT rate_percent FROM public.tax_codes WHERE id = r.default_tax_code_id), 0) / 100, 2) END);
    UPDATE public.client_invoices SET
      net_amount = (SELECT COALESCE(SUM(amount), 0) FROM public.client_invoice_lines WHERE invoice_id = v_invoice AND NOT voided),
      tax_amount = (SELECT COALESCE(SUM(tax_amount), 0) FROM public.client_invoice_lines WHERE invoice_id = v_invoice AND NOT voided),
      gross_amount = (SELECT COALESCE(SUM(amount + tax_amount), 0) FROM public.client_invoice_lines WHERE invoice_id = v_invoice AND NOT voided),
      updated_at = NOW()
    WHERE id = v_invoice;
    UPDATE public.billing_schedule_lines SET status = 'invoiced' WHERE id = r.id;
    n := n + 1;
  END LOOP;
  RETURN n;
END;
$$;

CREATE OR REPLACE FUNCTION public.billing_recurring_drafts(p_context JSONB DEFAULT '{}'::jsonb)
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public SET row_security = off AS $$
DECLARE n INTEGER := 0; r RECORD; v_invoice UUID; v_amount NUMERIC;
BEGIN
  FOR r IN
    SELECT l.*, s.client_id, s.contract_value, s.currency, c.kind, c.default_tax_code_id, c.payment_terms_days, p.account_id
    FROM public.billing_schedule_lines l
    JOIN public.project_billing_settings s ON s.project_id = l.project_id
    JOIN public.clients c ON c.id = s.client_id
    JOIN public.projects p ON p.id = l.project_id
    WHERE l.status = 'open' AND l.basis = 'recurring' AND l.next_due IS NOT NULL AND l.next_due <= CURRENT_DATE
  LOOP
    v_amount := COALESCE(r.amount, round(COALESCE(r.contract_value, 0) * COALESCE(r.percent_of_contract, 0) / 100, 2));
    INSERT INTO public.client_invoices (account_id, client_id, project_id, status, invoice_date, due_date, period_start, period_end, currency)
    VALUES (r.account_id, r.client_id, r.project_id, 'draft', r.next_due, r.next_due + COALESCE(r.payment_terms_days, 30), r.next_due, r.next_due, COALESCE(r.currency, 'USD'))
    RETURNING id INTO v_invoice;
    INSERT INTO public.client_invoice_lines (invoice_id, source, source_id, description, quantity, unit, rate, amount, tax_amount)
    VALUES (v_invoice, 'schedule', NULL, r.description || ' (' || r.next_due || ')', 1, 'each', v_amount, v_amount,
      CASE WHEN r.kind = 'internal' THEN 0 ELSE round(v_amount * COALESCE((SELECT rate_percent FROM public.tax_codes WHERE id = r.default_tax_code_id), 0) / 100, 2) END);
    UPDATE public.client_invoices SET net_amount = v_amount, tax_amount = (SELECT tax_amount FROM public.client_invoice_lines WHERE invoice_id = v_invoice), gross_amount = v_amount + (SELECT tax_amount FROM public.client_invoice_lines WHERE invoice_id = v_invoice) WHERE id = v_invoice;
    UPDATE public.billing_schedule_lines SET next_due = CASE r.frequency
      WHEN 'weekly' THEN r.next_due + 7
      WHEN 'quarterly' THEN (r.next_due + INTERVAL '3 months')::date
      ELSE (r.next_due + INTERVAL '1 month')::date END
    WHERE id = r.id;
    n := n + 1;
  END LOOP;
  RETURN n;
END;
$$;

-- Rows the overdue handler emails. One step (7, then 14, then 30 days) is prepared once.
CREATE OR REPLACE FUNCTION public.billing_overdue_pending()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public SET row_security = off AS $$
DECLARE out JSONB := '[]'::jsonb; r RECORD; v_step TEXT; v_id UUID; v_to TEXT;
BEGIN
  FOR r IN
    SELECT i.*, c.name AS client_name
    FROM public.client_invoices i
    JOIN public.clients c ON c.id = i.client_id
    WHERE i.status IN ('issued', 'part_paid') AND i.due_date IS NOT NULL AND i.due_date < CURRENT_DATE
      AND c.kind = 'external'
  LOOP
    v_step := CASE
      WHEN CURRENT_DATE >= r.due_date + 30 THEN '30'
      WHEN CURRENT_DATE >= r.due_date + 14 THEN '14'
      WHEN CURRENT_DATE >= r.due_date + 7 THEN '7'
      ELSE NULL END;
    IF v_step IS NULL OR EXISTS (SELECT 1 FROM public.client_invoice_sends s WHERE s.invoice_id = r.id AND s.step = v_step) THEN
      CONTINUE;
    END IF;
    SELECT string_agg(email, ', ') INTO v_to FROM public.client_contacts WHERE client_id = r.client_id AND is_billing_contact AND email IS NOT NULL;
    IF v_to IS NULL THEN CONTINUE; END IF;
    INSERT INTO public.client_invoice_sends (invoice_id, recipients, kind, step)
    VALUES (r.id, v_to, 'reminder', v_step) RETURNING id INTO v_id;
    out := out || jsonb_build_array(jsonb_build_object(
      'send_id', v_id, 'to', v_to,
      'subject', 'Invoice ' || COALESCE(NULLIF(r.invoice_reference, ''), 'reminder') || ' is overdue',
      'html', '<p>Invoice ' || COALESCE(r.invoice_reference, '') || ' for ' || r.client_name || ' was due on ' || r.due_date || '.</p>'
    ));
  END LOOP;
  RETURN out;
END;
$$;

CREATE OR REPLACE FUNCTION public.billing_mark_reminder_sent(p_send_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public SET row_security = off AS $$
BEGIN
  UPDATE public.client_invoice_sends SET sent_at = NOW() WHERE id = p_send_id AND sent_at IS NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.billing_on_milestone_achieved()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public SET row_security = off AS $$
BEGIN
  IF NEW.status = 'achieved' AND OLD.status IS DISTINCT FROM 'achieved' THEN
    PERFORM public.billing_schedule_due(jsonb_build_object('milestone_id', NEW.id));
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_billing_on_milestone_achieved ON public.milestones;
CREATE TRIGGER trg_billing_on_milestone_achieved
  AFTER UPDATE OF status ON public.milestones
  FOR EACH ROW EXECUTE FUNCTION public.billing_on_milestone_achieved();

REVOKE ALL ON FUNCTION public.billing_schedule_due(JSONB), public.billing_recurring_drafts(JSONB),
  public.billing_overdue_pending(), public.billing_mark_reminder_sent(UUID), public.billing_on_milestone_achieved() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.billing_schedule_due(JSONB), public.billing_recurring_drafts(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.billing_overdue_pending(), public.billing_mark_reminder_sent(UUID) TO service_role;

SELECT public.background_job_register(
  p_code => 'billing.schedule_due',
  p_name => 'Billing schedule due',
  p_kind => 'sql',
  p_description => 'Adds due dated and completed-milestone billing lines to a draft client invoice.',
  p_owner_system => 'platform',
  p_sql_function => 'public.billing_schedule_due',
  p_cron => '15 6 * * *',
  p_time_basis => 'organisation'
);
SELECT public.background_job_register(
  p_code => 'billing.recurring_drafts',
  p_name => 'Recurring billing drafts',
  p_kind => 'sql',
  p_description => 'Creates a draft invoice for each recurring billing line that is due, once per period.',
  p_owner_system => 'platform',
  p_sql_function => 'public.billing_recurring_drafts',
  p_cron => '20 6 * * *',
  p_time_basis => 'organisation'
);
SELECT public.background_job_register(
  p_code => 'billing.overdue_reminders',
  p_name => 'Overdue invoice reminders',
  p_kind => 'handler',
  p_description => 'Emails client billing contacts once at 7, 14 and 30 days overdue.',
  p_owner_system => 'platform',
  p_cron => '30 6 * * *',
  p_time_basis => 'organisation'
);

CREATE OR REPLACE VIEW public.billing_project_figures AS
SELECT p.id AS project_id,
  COALESCE((
    SELECT SUM(i.net_amount * i.exchange_rate) FROM public.client_invoices i
    WHERE i.project_id = p.id AND i.status IN ('issued', 'part_paid', 'paid')
  ), 0) - COALESCE((
    SELECT SUM(n.net_amount * i.exchange_rate)
    FROM public.client_credit_notes n JOIN public.client_invoices i ON i.id = n.invoice_id
    WHERE i.project_id = p.id
  ), 0) AS revenue,
  COALESCE((
    SELECT SUM(t.hours_worked) FROM public.timesheet_entries t
    WHERE t.project_id = p.id AND t.status = 'approved' AND t.is_billable AND NOT t.is_deleted AND t.client_invoice_line_id IS NULL
  ), 0) AS unbilled_hours
FROM public.projects p WHERE COALESCE(p.is_deleted, FALSE) = FALSE;
GRANT SELECT ON public.billing_project_figures TO authenticated;

CREATE OR REPLACE VIEW sim.billing_project_figures AS
SELECT p.id AS project_id,
  COALESCE((
    SELECT SUM(i.net_amount * i.exchange_rate) FROM sim.client_invoices i
    WHERE i.project_id = p.id AND i.status IN ('issued', 'part_paid', 'paid')
  ), 0) - COALESCE((
    SELECT SUM(n.net_amount * i.exchange_rate)
    FROM sim.client_credit_notes n JOIN sim.client_invoices i ON i.id = n.invoice_id
    WHERE i.project_id = p.id
  ), 0) AS revenue,
  COALESCE((
    SELECT SUM(t.hours_worked) FROM sim.timesheet_entries t
    WHERE t.project_id = p.id AND t.status = 'approved' AND t.is_billable AND NOT t.is_deleted AND t.client_invoice_line_id IS NULL
  ), 0) AS unbilled_hours
FROM sim.practice_projects p;
GRANT SELECT ON sim.billing_project_figures TO authenticated;

CREATE UNIQUE INDEX IF NOT EXISTS uq_invoice_document_settings_account ON public.invoice_document_settings (account_id) WHERE account_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_sim_invoice_document_settings_user ON sim.invoice_document_settings (user_id) WHERE user_id IS NOT NULL;

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active) VALUES
  ('billing_schedule_lines', 'Fixed-price and recurring lines that become invoice lines when due', FALSE, TRUE),
  ('sim.billing_schedule_lines', 'Simulator billing schedule lines', FALSE, TRUE)
ON CONFLICT (table_name) DO UPDATE SET table_description = EXCLUDED.table_description, is_active = TRUE, updated_at = NOW();
INSERT INTO public.planner_table_allowlist (table_name) VALUES ('billing_schedule_lines') ON CONFLICT (table_name) DO NOTHING;

INSERT INTO public.field_help (help_key, title, purpose, examples, format_notes, extra_notes, module_code) VALUES
  ('public.billing_schedule_lines.description', 'Description', 'What this charge is for. It is copied onto the invoice line.', '- Design complete', NULL, NULL, 'billing'),
  ('public.billing_schedule_lines.basis', 'When it is billed', 'A milestone line is billed when that milestone is complete. A date line is billed on its date. A recurring line is billed on each next date.', '- Milestone', NULL, NULL, 'billing'),
  ('public.billing_schedule_lines.amount', 'Amount', 'A fixed amount. Leave blank if you use a percent of the contract value instead.', '- 25000', 'Amounts show in {currency}. Type 10t for 10,000, then press Enter.', NULL, 'billing'),
  ('public.billing_schedule_lines.percent_of_contract', 'Percent of contract', 'Billed as this percent of the contract value on the project billing settings.', '- 25', 'From 0 to 100.', NULL, 'billing'),
  ('public.billing_schedule_lines.due_date', 'Due date', 'The day a date-based line becomes billable.', '- {example_date}', 'Dates show as {date_format}.', NULL, 'billing'),
  ('public.billing_schedule_lines.frequency', 'Repeats', 'How often a recurring line is drafted again after it is billed.', '- Monthly', NULL, NULL, 'billing'),
  ('public.billing_schedule_lines.next_due', 'Next due', 'The next day a recurring line should be drafted.', '- {example_date}', 'Dates show as {date_format}.', NULL, 'billing')
ON CONFLICT (help_key, form_key, locale) DO UPDATE SET
  title = EXCLUDED.title, purpose = EXCLUDED.purpose, examples = EXCLUDED.examples,
  format_notes = EXCLUDED.format_notes, module_code = EXCLUDED.module_code, is_active = TRUE, updated_at = NOW();
INSERT INTO public.field_help_aliases (alias_key, help_key)
SELECT replace(help_key, 'public.', 'sim.'), help_key FROM public.field_help WHERE help_key LIKE 'public.billing_schedule_lines.%'
ON CONFLICT (alias_key) DO UPDATE SET help_key = EXCLUDED.help_key;

CREATE OR REPLACE FUNCTION sim.issue_client_invoice(p_invoice_id UUID, p_notes TEXT)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = sim, public SET row_security = off AS $$
DECLARE v sim.client_invoices%ROWTYPE;
BEGIN
  IF NULLIF(btrim(COALESCE(p_notes, '')), '') IS NULL THEN RAISE EXCEPTION 'BILLING_NOTES: A justification is required'; END IF;
  SELECT * INTO v FROM sim.client_invoices WHERE id = p_invoice_id;
  IF v.id IS NULL OR v.status <> 'pending_approval' THEN RAISE EXCEPTION 'BILLING_STATE: Submit the invoice for approval first'; END IF;
  IF NOT sim.qra_can_access(v.project_id) THEN RAISE EXCEPTION 'BILLING_FORBIDDEN: You cannot issue this invoice'; END IF;
  UPDATE sim.client_invoices SET status = 'issued', approval_notes = btrim(p_notes), issued_at = NOW(),
    invoice_date = COALESCE(invoice_date, CURRENT_DATE), exchange_rate = COALESCE(NULLIF(exchange_rate, 0), 1), updated_at = NOW()
  WHERE id = p_invoice_id;
  RETURN p_invoice_id;
END;
$$;
CREATE OR REPLACE FUNCTION sim.record_client_payment(p_invoice_id UUID, p_amount NUMERIC, p_date DATE, p_method TEXT, p_reference TEXT)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = sim, public SET row_security = off AS $$
DECLARE v sim.client_invoices%ROWTYPE; v_paid NUMERIC; v_id UUID;
BEGIN
  SELECT * INTO v FROM sim.client_invoices WHERE id = p_invoice_id;
  IF v.status NOT IN ('issued', 'part_paid') THEN RAISE EXCEPTION 'BILLING_STATE: Only an issued invoice can take a payment'; END IF;
  IF NOT sim.qra_can_access(v.project_id) THEN RAISE EXCEPTION 'BILLING_FORBIDDEN: You cannot record this payment'; END IF;
  INSERT INTO sim.client_payments (invoice_id, paid_on, amount, method, reference)
  VALUES (p_invoice_id, COALESCE(p_date, CURRENT_DATE), p_amount, p_method, p_reference) RETURNING id INTO v_id;
  SELECT COALESCE(SUM(amount), 0) INTO v_paid FROM sim.client_payments WHERE invoice_id = p_invoice_id;
  UPDATE sim.client_invoices SET amount_paid = v_paid,
    status = CASE WHEN v_paid >= gross_amount THEN 'paid' WHEN v_paid > 0 THEN 'part_paid' ELSE status END, updated_at = NOW()
  WHERE id = p_invoice_id;
  RETURN v_id;
END;
$$;
CREATE OR REPLACE FUNCTION sim.credit_client_invoice(p_invoice_id UUID, p_line_ids UUID[], p_reason TEXT)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = sim, public SET row_security = off AS $$
DECLARE v sim.client_invoices%ROWTYPE; v_id UUID; v_line sim.client_invoice_lines%ROWTYPE; v_net NUMERIC := 0; v_tax NUMERIC := 0;
BEGIN
  IF NULLIF(btrim(COALESCE(p_reason, '')), '') IS NULL THEN RAISE EXCEPTION 'BILLING_NOTES: A credit note needs a reason'; END IF;
  SELECT * INTO v FROM sim.client_invoices WHERE id = p_invoice_id;
  IF v.status NOT IN ('issued', 'part_paid', 'paid') THEN RAISE EXCEPTION 'BILLING_STATE: Credit an issued invoice'; END IF;
  IF NOT sim.qra_can_access(v.project_id) THEN RAISE EXCEPTION 'BILLING_FORBIDDEN: You cannot credit this invoice'; END IF;
  INSERT INTO sim.client_credit_notes (invoice_id, reason) VALUES (p_invoice_id, btrim(p_reason)) RETURNING id INTO v_id;
  FOR v_line IN SELECT * FROM sim.client_invoice_lines WHERE invoice_id = p_invoice_id AND id = ANY(p_line_ids) AND NOT voided LOOP
    INSERT INTO sim.client_credit_note_lines (credit_note_id, invoice_line_id, amount, tax_amount) VALUES (v_id, v_line.id, v_line.amount, v_line.tax_amount);
    UPDATE sim.client_invoice_lines SET voided = TRUE WHERE id = v_line.id;
    UPDATE sim.timesheet_entries SET client_invoice_line_id = NULL WHERE client_invoice_line_id = v_line.id;
    v_net := v_net + v_line.amount; v_tax := v_tax + v_line.tax_amount;
  END LOOP;
  UPDATE sim.client_credit_notes SET net_amount = v_net, tax_amount = v_tax WHERE id = v_id;
  RETURN v_id;
END;
$$;
GRANT EXECUTE ON FUNCTION sim.issue_client_invoice(UUID, TEXT), sim.record_client_payment(UUID, NUMERIC, DATE, TEXT, TEXT), sim.credit_client_invoice(UUID, UUID[], TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION sim.issue_client_invoice(p_invoice_id UUID, p_notes TEXT)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = sim, public SET row_security = off AS $$
DECLARE v sim.client_invoices%ROWTYPE;
BEGIN
  IF NULLIF(btrim(COALESCE(p_notes, '')), '') IS NULL THEN RAISE EXCEPTION 'BILLING_NOTES: A justification is required'; END IF;
  SELECT * INTO v FROM sim.client_invoices WHERE id = p_invoice_id;
  IF v.id IS NULL OR v.status <> 'pending_approval' THEN RAISE EXCEPTION 'BILLING_STATE: Submit the invoice for approval first'; END IF;
  IF NOT sim.qra_can_access(v.project_id) THEN RAISE EXCEPTION 'BILLING_FORBIDDEN: You cannot issue this invoice'; END IF;
  UPDATE sim.client_invoices SET status = 'issued', approval_notes = btrim(p_notes), issued_at = NOW(),
    invoice_date = COALESCE(invoice_date, CURRENT_DATE), exchange_rate = COALESCE(NULLIF(exchange_rate, 0), 1), updated_at = NOW()
  WHERE id = p_invoice_id;
  RETURN p_invoice_id;
END;
$$;
CREATE OR REPLACE FUNCTION sim.record_client_payment(p_invoice_id UUID, p_amount NUMERIC, p_date DATE, p_method TEXT, p_reference TEXT)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = sim, public SET row_security = off AS $$
DECLARE v sim.client_invoices%ROWTYPE; v_paid NUMERIC; v_id UUID;
BEGIN
  SELECT * INTO v FROM sim.client_invoices WHERE id = p_invoice_id;
  IF v.status NOT IN ('issued', 'part_paid') THEN RAISE EXCEPTION 'BILLING_STATE: Only an issued invoice can take a payment'; END IF;
  IF NOT sim.qra_can_access(v.project_id) THEN RAISE EXCEPTION 'BILLING_FORBIDDEN: You cannot record this payment'; END IF;
  INSERT INTO sim.client_payments (invoice_id, paid_on, amount, method, reference)
  VALUES (p_invoice_id, COALESCE(p_date, CURRENT_DATE), p_amount, p_method, p_reference) RETURNING id INTO v_id;
  SELECT COALESCE(SUM(amount), 0) INTO v_paid FROM sim.client_payments WHERE invoice_id = p_invoice_id;
  UPDATE sim.client_invoices SET amount_paid = v_paid,
    status = CASE WHEN v_paid >= gross_amount THEN 'paid' WHEN v_paid > 0 THEN 'part_paid' ELSE status END, updated_at = NOW()
  WHERE id = p_invoice_id;
  RETURN v_id;
END;
$$;
CREATE OR REPLACE FUNCTION sim.credit_client_invoice(p_invoice_id UUID, p_line_ids UUID[], p_reason TEXT)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = sim, public SET row_security = off AS $$
DECLARE v sim.client_invoices%ROWTYPE; v_id UUID; v_line sim.client_invoice_lines%ROWTYPE; v_net NUMERIC := 0; v_tax NUMERIC := 0;
BEGIN
  IF NULLIF(btrim(COALESCE(p_reason, '')), '') IS NULL THEN RAISE EXCEPTION 'BILLING_NOTES: A credit note needs a reason'; END IF;
  SELECT * INTO v FROM sim.client_invoices WHERE id = p_invoice_id;
  IF v.status NOT IN ('issued', 'part_paid', 'paid') THEN RAISE EXCEPTION 'BILLING_STATE: Credit an issued invoice'; END IF;
  IF NOT sim.qra_can_access(v.project_id) THEN RAISE EXCEPTION 'BILLING_FORBIDDEN: You cannot credit this invoice'; END IF;
  INSERT INTO sim.client_credit_notes (invoice_id, reason) VALUES (p_invoice_id, btrim(p_reason)) RETURNING id INTO v_id;
  FOR v_line IN SELECT * FROM sim.client_invoice_lines WHERE invoice_id = p_invoice_id AND id = ANY(p_line_ids) AND NOT voided LOOP
    INSERT INTO sim.client_credit_note_lines (credit_note_id, invoice_line_id, amount, tax_amount) VALUES (v_id, v_line.id, v_line.amount, v_line.tax_amount);
    UPDATE sim.client_invoice_lines SET voided = TRUE WHERE id = v_line.id;
    UPDATE sim.timesheet_entries SET client_invoice_line_id = NULL WHERE client_invoice_line_id = v_line.id;
    v_net := v_net + v_line.amount; v_tax := v_tax + v_line.tax_amount;
  END LOOP;
  UPDATE sim.client_credit_notes SET net_amount = v_net, tax_amount = v_tax WHERE id = v_id;
  RETURN v_id;
END;
$$;
GRANT EXECUTE ON FUNCTION sim.issue_client_invoice(UUID, TEXT), sim.record_client_payment(UUID, NUMERIC, DATE, TEXT, TEXT), sim.credit_client_invoice(UUID, UUID[], TEXT) TO authenticated;

INSERT INTO public.client_portal_sections (portal_id, section_key, section_label, is_visible, sort_order)
SELECT c.id, 'invoices', 'Invoices', TRUE, 80
FROM public.client_portal_configs c
WHERE NOT EXISTS (SELECT 1 FROM public.client_portal_sections s WHERE s.portal_id = c.id AND s.section_key = 'invoices');

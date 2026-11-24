-- ============================================================================
-- v1578 — Client invoices (v1353 slice 2)
-- Billable time, rechargeable expenses, invoice lifecycle, credit notes, payments.
-- Run after v1577. Then Admin SQL v259 so invoices and credit notes get display ids.
-- Idempotent.
-- ============================================================================

ALTER TABLE public.timesheet_entries ADD COLUMN IF NOT EXISTS is_billable BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE public.timesheet_entries ADD COLUMN IF NOT EXISTS client_invoice_line_id UUID;
ALTER TABLE sim.timesheet_entries ADD COLUMN IF NOT EXISTS is_billable BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE sim.timesheet_entries ADD COLUMN IF NOT EXISTS client_invoice_line_id UUID;
ALTER TABLE public.timesheet_work_categories ADD COLUMN IF NOT EXISTS billable_default BOOLEAN;
ALTER TABLE public.expense_categories ADD COLUMN IF NOT EXISTS rechargeable_default BOOLEAN;
ALTER TABLE public.project_expense_claim_items ADD COLUMN IF NOT EXISTS is_rechargeable BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.project_expense_claim_items ADD COLUMN IF NOT EXISTS client_invoice_line_id UUID;
ALTER TABLE public.project_expense_claims ADD COLUMN IF NOT EXISTS is_rechargeable BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.project_expense_claims ADD COLUMN IF NOT EXISTS client_invoice_line_id UUID;
ALTER TABLE sim.expense_categories ADD COLUMN IF NOT EXISTS rechargeable_default BOOLEAN;
ALTER TABLE sim.project_expense_claim_items ADD COLUMN IF NOT EXISTS is_rechargeable BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE sim.project_expense_claim_items ADD COLUMN IF NOT EXISTS client_invoice_line_id UUID;
ALTER TABLE sim.project_expense_claims ADD COLUMN IF NOT EXISTS is_rechargeable BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE sim.project_expense_claims ADD COLUMN IF NOT EXISTS client_invoice_line_id UUID;

CREATE TABLE IF NOT EXISTS public.client_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID,
  client_id UUID NOT NULL REFERENCES public.clients(id),
  project_id UUID NOT NULL REFERENCES public.projects(id),
  invoice_reference TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft',
  invoice_date DATE,
  due_date DATE,
  period_start DATE,
  period_end DATE,
  currency TEXT NOT NULL DEFAULT 'USD',
  exchange_rate NUMERIC(18,6) NOT NULL DEFAULT 1,
  net_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  gross_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  amount_paid NUMERIC(18,2) NOT NULL DEFAULT 0,
  approval_notes TEXT,
  issued_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT client_invoices_status CHECK (status IN ('draft', 'pending_approval', 'issued', 'part_paid', 'paid', 'cancelled'))
);
CREATE TABLE IF NOT EXISTS sim.client_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  client_id UUID NOT NULL REFERENCES sim.clients(id),
  project_id UUID NOT NULL REFERENCES sim.practice_projects(id),
  invoice_reference TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft',
  invoice_date DATE,
  due_date DATE,
  period_start DATE,
  period_end DATE,
  currency TEXT NOT NULL DEFAULT 'USD',
  exchange_rate NUMERIC(18,6) NOT NULL DEFAULT 1,
  net_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  gross_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  amount_paid NUMERIC(18,2) NOT NULL DEFAULT 0,
  approval_notes TEXT,
  issued_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT client_invoices_status CHECK (status IN ('draft', 'pending_approval', 'issued', 'part_paid', 'paid', 'cancelled'))
);

CREATE TABLE IF NOT EXISTS public.client_invoice_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.client_invoices(id) ON DELETE CASCADE,
  source TEXT NOT NULL DEFAULT 'manual',
  source_id UUID,
  description TEXT NOT NULL,
  quantity NUMERIC(18,2) NOT NULL DEFAULT 1,
  unit TEXT,
  rate NUMERIC(18,2) NOT NULL DEFAULT 0,
  amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  tax_code_id UUID REFERENCES public.tax_codes(id),
  tax_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  voided BOOLEAN NOT NULL DEFAULT FALSE,
  CONSTRAINT client_invoice_lines_source CHECK (source IN ('time', 'expense', 'schedule', 'manual'))
);
CREATE TABLE IF NOT EXISTS sim.client_invoice_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES sim.client_invoices(id) ON DELETE CASCADE,
  source TEXT NOT NULL DEFAULT 'manual',
  source_id UUID,
  description TEXT NOT NULL,
  quantity NUMERIC(18,2) NOT NULL DEFAULT 1,
  unit TEXT,
  rate NUMERIC(18,2) NOT NULL DEFAULT 0,
  amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  tax_code_id UUID REFERENCES sim.tax_codes(id),
  tax_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  voided BOOLEAN NOT NULL DEFAULT FALSE,
  CONSTRAINT client_invoice_lines_source CHECK (source IN ('time', 'expense', 'schedule', 'manual'))
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_client_invoice_line_source ON public.client_invoice_lines (source, source_id) WHERE source_id IS NOT NULL AND NOT voided;
CREATE UNIQUE INDEX IF NOT EXISTS uq_sim_client_invoice_line_source ON sim.client_invoice_lines (source, source_id) WHERE source_id IS NOT NULL AND NOT voided;

CREATE TABLE IF NOT EXISTS public.client_credit_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.client_invoices(id),
  credit_note_reference TEXT NOT NULL DEFAULT '',
  reason TEXT NOT NULL,
  net_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS sim.client_credit_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES sim.client_invoices(id),
  credit_note_reference TEXT NOT NULL DEFAULT '',
  reason TEXT NOT NULL,
  net_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.client_credit_note_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_note_id UUID NOT NULL REFERENCES public.client_credit_notes(id) ON DELETE CASCADE,
  invoice_line_id UUID NOT NULL REFERENCES public.client_invoice_lines(id),
  amount NUMERIC(18,2) NOT NULL,
  tax_amount NUMERIC(18,2) NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS sim.client_credit_note_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_note_id UUID NOT NULL REFERENCES sim.client_credit_notes(id) ON DELETE CASCADE,
  invoice_line_id UUID NOT NULL REFERENCES sim.client_invoice_lines(id),
  amount NUMERIC(18,2) NOT NULL,
  tax_amount NUMERIC(18,2) NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.client_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.client_invoices(id),
  paid_on DATE NOT NULL,
  amount NUMERIC(18,2) NOT NULL,
  method TEXT,
  reference TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT client_payments_amount CHECK (amount > 0)
);
CREATE TABLE IF NOT EXISTS sim.client_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES sim.client_invoices(id),
  paid_on DATE NOT NULL,
  amount NUMERIC(18,2) NOT NULL,
  method TEXT,
  reference TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT client_payments_amount CHECK (amount > 0)
);

CREATE TABLE IF NOT EXISTS public.client_invoice_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.client_invoices(id) ON DELETE CASCADE,
  recipients TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'invoice',
  step TEXT,
  sent_at TIMESTAMPTZ,
  sent_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS sim.client_invoice_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES sim.client_invoices(id) ON DELETE CASCADE,
  recipients TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'invoice',
  step TEXT,
  sent_at TIMESTAMPTZ,
  sent_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_invoice_reminder_step ON public.client_invoice_sends (invoice_id, step) WHERE step IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_sim_invoice_reminder_step ON sim.client_invoice_sends (invoice_id, step) WHERE step IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.invoice_document_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE,
  payment_instructions TEXT,
  footer TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS sim.invoice_document_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  payment_instructions TEXT,
  footer TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_client_invoices_display_id ON public.client_invoices;
CREATE TRIGGER trg_client_invoices_display_id AFTER INSERT ON public.client_invoices
  FOR EACH ROW EXECUTE FUNCTION public.trg_apply_admin_display_id('public.client_invoices', 'invoice_reference');
DROP TRIGGER IF EXISTS trg_sim_client_invoices_display_id ON sim.client_invoices;
CREATE TRIGGER trg_sim_client_invoices_display_id AFTER INSERT ON sim.client_invoices
  FOR EACH ROW EXECUTE FUNCTION sim.trg_apply_admin_display_id('sim.client_invoices', 'invoice_reference');
DROP TRIGGER IF EXISTS trg_client_credit_notes_display_id ON public.client_credit_notes;
CREATE TRIGGER trg_client_credit_notes_display_id AFTER INSERT ON public.client_credit_notes
  FOR EACH ROW EXECUTE FUNCTION public.trg_apply_admin_display_id('public.client_credit_notes', 'credit_note_reference');
DROP TRIGGER IF EXISTS trg_sim_client_credit_notes_display_id ON sim.client_credit_notes;
CREATE TRIGGER trg_sim_client_credit_notes_display_id AFTER INSERT ON sim.client_credit_notes
  FOR EACH ROW EXECUTE FUNCTION sim.trg_apply_admin_display_id('sim.client_credit_notes', 'credit_note_reference');

CREATE OR REPLACE FUNCTION public.billing_lock_timesheet()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE v_status TEXT;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.client_invoice_line_id IS NULL AND OLD.client_invoice_line_id IS NOT NULL THEN
    RETURN NEW;
  END IF;
  IF OLD.client_invoice_line_id IS NULL THEN
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
  END IF;
  SELECT i.status INTO v_status
  FROM public.client_invoice_lines l JOIN public.client_invoices i ON i.id = l.invoice_id
  WHERE l.id = OLD.client_invoice_line_id;
  IF v_status IN ('issued', 'part_paid', 'paid') THEN
    RAISE EXCEPTION 'BILLING_LOCKED: This time is on an issued invoice. Raise a credit note to change it.';
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;
DROP TRIGGER IF EXISTS trg_billing_lock_timesheet ON public.timesheet_entries;
CREATE TRIGGER trg_billing_lock_timesheet BEFORE UPDATE OR DELETE ON public.timesheet_entries
  FOR EACH ROW EXECUTE FUNCTION public.billing_lock_timesheet();

CREATE OR REPLACE FUNCTION public.billing_lock_expense_item()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE v_status TEXT; v_line UUID;
BEGIN
  v_line := OLD.client_invoice_line_id;
  IF TG_OP = 'UPDATE' AND NEW.client_invoice_line_id IS NULL AND v_line IS NOT NULL THEN RETURN NEW; END IF;
  IF v_line IS NULL THEN RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END; END IF;
  SELECT i.status INTO v_status FROM public.client_invoice_lines l JOIN public.client_invoices i ON i.id = l.invoice_id WHERE l.id = v_line;
  IF v_status IN ('issued', 'part_paid', 'paid') THEN
    RAISE EXCEPTION 'BILLING_LOCKED: This expense is on an issued invoice. Raise a credit note to change it.';
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;
DROP TRIGGER IF EXISTS trg_billing_lock_expense_item ON public.project_expense_claim_items;
CREATE TRIGGER trg_billing_lock_expense_item BEFORE UPDATE OR DELETE ON public.project_expense_claim_items
  FOR EACH ROW EXECUTE FUNCTION public.billing_lock_expense_item();

CREATE OR REPLACE FUNCTION public.billing_invoice_immutable()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status IN ('issued', 'part_paid', 'paid') AND (
    NEW.net_amount IS DISTINCT FROM OLD.net_amount OR NEW.tax_amount IS DISTINCT FROM OLD.tax_amount
    OR NEW.exchange_rate IS DISTINCT FROM OLD.exchange_rate OR NEW.currency IS DISTINCT FROM OLD.currency
    OR NEW.client_id IS DISTINCT FROM OLD.client_id OR NEW.project_id IS DISTINCT FROM OLD.project_id
  ) THEN
    RAISE EXCEPTION 'BILLING_IMMUTABLE: An issued invoice cannot be edited. Raise a credit note.';
  END IF;
  IF OLD.status IN ('issued', 'part_paid', 'paid') AND NEW.status NOT IN ('issued', 'part_paid', 'paid') THEN
    RAISE EXCEPTION 'BILLING_IMMUTABLE: An issued invoice cannot be cancelled. Raise a credit note.';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_billing_invoice_immutable ON public.client_invoices;
CREATE TRIGGER trg_billing_invoice_immutable BEFORE UPDATE ON public.client_invoices
  FOR EACH ROW EXECUTE FUNCTION public.billing_invoice_immutable();
DROP TRIGGER IF EXISTS trg_billing_invoice_no_delete ON public.client_invoices;
CREATE OR REPLACE FUNCTION public.billing_invoice_no_delete()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status IN ('issued', 'part_paid', 'paid') THEN
    RAISE EXCEPTION 'BILLING_IMMUTABLE: An issued invoice cannot be deleted. Raise a credit note.';
  END IF;
  RETURN OLD;
END;
$$;
CREATE TRIGGER trg_billing_invoice_no_delete BEFORE DELETE ON public.client_invoices
  FOR EACH ROW EXECUTE FUNCTION public.billing_invoice_no_delete();

-- Draft from approved billable time and rechargeable expenses in the period.
CREATE OR REPLACE FUNCTION public.draft_client_invoice(p_project_id UUID, p_start DATE, p_end DATE)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public SET row_security = off AS $$
DECLARE
  v_settings public.project_billing_settings%ROWTYPE;
  v_client public.clients%ROWTYPE;
  v_id UUID;
  v_uid UUID;
  r RECORD;
  v_rate NUMERIC;
  v_amount NUMERIC;
  v_tax NUMERIC;
  v_markup NUMERIC;
  v_net NUMERIC := 0;
  v_tax_total NUMERIC := 0;
BEGIN
  IF NOT public.auth_user_can_access_project(p_project_id) THEN
    RAISE EXCEPTION 'BILLING_FORBIDDEN: You cannot bill this project';
  END IF;
  SELECT * INTO v_settings FROM public.project_billing_settings WHERE project_id = p_project_id;
  IF v_settings.client_id IS NULL THEN RAISE EXCEPTION 'BILLING_CLIENT: Choose a client on the project billing settings first'; END IF;
  SELECT * INTO v_client FROM public.clients WHERE id = v_settings.client_id;
  SELECT id INTO v_uid FROM public.users WHERE auth_user_id = auth.uid() LIMIT 1;
  INSERT INTO public.client_invoices (account_id, client_id, project_id, status, invoice_date, due_date, period_start, period_end, currency, created_by)
  VALUES (
    (SELECT account_id FROM public.projects WHERE id = p_project_id), v_client.id, p_project_id, 'draft', CURRENT_DATE,
    CURRENT_DATE + COALESCE(v_client.payment_terms_days, 30), p_start, p_end,
    COALESCE(v_settings.currency, v_client.currency, 'USD'), v_uid
  ) RETURNING id INTO v_id;

  FOR r IN
    SELECT t.id, t.hours_worked, t.entry_date, t.work_category, t.user_id, t.description
    FROM public.timesheet_entries t
    WHERE t.project_id = p_project_id AND t.status = 'approved' AND t.is_billable AND NOT t.is_deleted
      AND t.client_invoice_line_id IS NULL AND t.entry_date BETWEEN p_start AND p_end
  LOOP
    v_rate := COALESCE(public.resolve_charge_rate(p_project_id, r.user_id, NULL, r.work_category, 'hour', r.entry_date), 0);
    v_amount := round(r.hours_worked * v_rate, 2);
    v_tax := CASE WHEN v_client.kind = 'internal' THEN 0 ELSE round(v_amount * COALESCE((SELECT rate_percent FROM public.tax_codes WHERE id = v_client.default_tax_code_id), 0) / 100, 2) END;
    INSERT INTO public.client_invoice_lines (invoice_id, source, source_id, description, quantity, unit, rate, amount, tax_code_id, tax_amount)
    VALUES (v_id, 'time', r.id, COALESCE(r.description, r.work_category, 'Time'), r.hours_worked, 'hour', v_rate, v_amount, v_client.default_tax_code_id, v_tax);
    UPDATE public.timesheet_entries SET client_invoice_line_id = (SELECT id FROM public.client_invoice_lines WHERE invoice_id = v_id AND source_id = r.id) WHERE id = r.id;
    v_net := v_net + v_amount; v_tax_total := v_tax_total + v_tax;
  END LOOP;

  v_markup := COALESCE(v_settings.markup_percent, v_client.markup_percent, 0);
  FOR r IN
    SELECT i.id, i.amount, i.description FROM public.project_expense_claim_items i
    JOIN public.project_expense_claims c ON c.id = i.expense_claim_id
    WHERE c.project_id = p_project_id AND c.claim_status = 'approved' AND i.is_rechargeable AND i.client_invoice_line_id IS NULL
  LOOP
    v_amount := round(r.amount * (1 + v_markup / 100), 2);
    v_tax := CASE WHEN v_client.kind = 'internal' THEN 0 ELSE round(v_amount * COALESCE((SELECT rate_percent FROM public.tax_codes WHERE id = v_client.default_tax_code_id), 0) / 100, 2) END;
    INSERT INTO public.client_invoice_lines (invoice_id, source, source_id, description, quantity, unit, rate, amount, tax_code_id, tax_amount)
    VALUES (v_id, 'expense', r.id, COALESCE(r.description, 'Expense'), 1, 'each', v_amount, v_amount, v_client.default_tax_code_id, v_tax);
    UPDATE public.project_expense_claim_items SET client_invoice_line_id = (SELECT id FROM public.client_invoice_lines WHERE invoice_id = v_id AND source_id = r.id) WHERE id = r.id;
    v_net := v_net + v_amount; v_tax_total := v_tax_total + v_tax;
  END LOOP;

  UPDATE public.client_invoices SET net_amount = v_net, tax_amount = v_tax_total, gross_amount = v_net + v_tax_total, updated_at = NOW() WHERE id = v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.issue_client_invoice(p_invoice_id UUID, p_notes TEXT)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public SET row_security = off AS $$
DECLARE v public.client_invoices%ROWTYPE;
BEGIN
  IF NULLIF(btrim(COALESCE(p_notes, '')), '') IS NULL THEN RAISE EXCEPTION 'BILLING_NOTES: A justification is required'; END IF;
  SELECT * INTO v FROM public.client_invoices WHERE id = p_invoice_id;
  IF v.id IS NULL OR v.status <> 'pending_approval' THEN RAISE EXCEPTION 'BILLING_STATE: Submit the invoice for approval first'; END IF;
  IF NOT public.auth_user_can_access_project(v.project_id) THEN RAISE EXCEPTION 'BILLING_FORBIDDEN: You cannot issue this invoice'; END IF;
  UPDATE public.client_invoices
     SET status = 'issued', approval_notes = btrim(p_notes), issued_at = NOW(),
         invoice_date = COALESCE(invoice_date, CURRENT_DATE),
         exchange_rate = COALESCE(NULLIF(exchange_rate, 0), 1), updated_at = NOW()
   WHERE id = p_invoice_id;
  RETURN p_invoice_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_client_payment(p_invoice_id UUID, p_amount NUMERIC, p_date DATE, p_method TEXT, p_reference TEXT)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public SET row_security = off AS $$
DECLARE v public.client_invoices%ROWTYPE; v_paid NUMERIC; v_id UUID;
BEGIN
  SELECT * INTO v FROM public.client_invoices WHERE id = p_invoice_id;
  IF v.status NOT IN ('issued', 'part_paid') THEN RAISE EXCEPTION 'BILLING_STATE: Only an issued invoice can take a payment'; END IF;
  IF NOT public.auth_user_can_access_project(v.project_id) THEN RAISE EXCEPTION 'BILLING_FORBIDDEN: You cannot record this payment'; END IF;
  INSERT INTO public.client_payments (invoice_id, paid_on, amount, method, reference)
  VALUES (p_invoice_id, COALESCE(p_date, CURRENT_DATE), p_amount, p_method, p_reference) RETURNING id INTO v_id;
  SELECT COALESCE(SUM(amount), 0) INTO v_paid FROM public.client_payments WHERE invoice_id = p_invoice_id;
  UPDATE public.client_invoices
     SET amount_paid = v_paid,
         status = CASE WHEN v_paid >= gross_amount THEN 'paid' WHEN v_paid > 0 THEN 'part_paid' ELSE status END,
         updated_at = NOW()
   WHERE id = p_invoice_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.credit_client_invoice(p_invoice_id UUID, p_line_ids UUID[], p_reason TEXT)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public SET row_security = off AS $$
DECLARE v public.client_invoices%ROWTYPE; v_id UUID; v_line public.client_invoice_lines%ROWTYPE; v_net NUMERIC := 0; v_tax NUMERIC := 0;
BEGIN
  IF NULLIF(btrim(COALESCE(p_reason, '')), '') IS NULL THEN RAISE EXCEPTION 'BILLING_NOTES: A credit note needs a reason'; END IF;
  SELECT * INTO v FROM public.client_invoices WHERE id = p_invoice_id;
  IF v.status NOT IN ('issued', 'part_paid', 'paid') THEN RAISE EXCEPTION 'BILLING_STATE: Credit an issued invoice'; END IF;
  IF NOT public.auth_user_can_access_project(v.project_id) THEN RAISE EXCEPTION 'BILLING_FORBIDDEN: You cannot credit this invoice'; END IF;
  INSERT INTO public.client_credit_notes (invoice_id, reason) VALUES (p_invoice_id, btrim(p_reason)) RETURNING id INTO v_id;
  FOR v_line IN SELECT * FROM public.client_invoice_lines WHERE invoice_id = p_invoice_id AND id = ANY(p_line_ids) AND NOT voided LOOP
    INSERT INTO public.client_credit_note_lines (credit_note_id, invoice_line_id, amount, tax_amount)
    VALUES (v_id, v_line.id, v_line.amount, v_line.tax_amount);
    UPDATE public.client_invoice_lines SET voided = TRUE WHERE id = v_line.id;
    UPDATE public.timesheet_entries SET client_invoice_line_id = NULL WHERE client_invoice_line_id = v_line.id;
    UPDATE public.project_expense_claim_items SET client_invoice_line_id = NULL WHERE client_invoice_line_id = v_line.id;
    v_net := v_net + v_line.amount; v_tax := v_tax + v_line.tax_amount;
  END LOOP;
  UPDATE public.client_credit_notes SET net_amount = v_net, tax_amount = v_tax WHERE id = v_id;
  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.draft_client_invoice(UUID, DATE, DATE), public.issue_client_invoice(UUID, TEXT),
  public.record_client_payment(UUID, NUMERIC, DATE, TEXT, TEXT), public.credit_client_invoice(UUID, UUID[], TEXT) TO authenticated;

ALTER TABLE public.client_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_invoice_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_credit_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_credit_note_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_invoice_sends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_document_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.client_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.client_invoice_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.client_credit_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.client_credit_note_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.client_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.client_invoice_sends ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.invoice_document_settings ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_invoices, public.client_invoice_lines, public.client_credit_notes, public.client_credit_note_lines, public.client_payments, public.client_invoice_sends, public.invoice_document_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON sim.client_invoices, sim.client_invoice_lines, sim.client_credit_notes, sim.client_credit_note_lines, sim.client_payments, sim.client_invoice_sends, sim.invoice_document_settings TO authenticated;
GRANT ALL ON public.client_invoices, public.client_invoice_lines, public.client_credit_notes, public.client_credit_note_lines, public.client_payments, public.client_invoice_sends, public.invoice_document_settings,
  sim.client_invoices, sim.client_invoice_lines, sim.client_credit_notes, sim.client_credit_note_lines, sim.client_payments, sim.client_invoice_sends, sim.invoice_document_settings TO service_role;

DROP POLICY IF EXISTS client_invoices_all ON public.client_invoices;
CREATE POLICY client_invoices_all ON public.client_invoices FOR ALL TO authenticated
  USING (public.auth_user_can_access_project(project_id)) WITH CHECK (public.auth_user_can_access_project(project_id));
DROP POLICY IF EXISTS client_invoice_lines_all ON public.client_invoice_lines;
CREATE POLICY client_invoice_lines_all ON public.client_invoice_lines FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.client_invoices i WHERE i.id = invoice_id AND public.auth_user_can_access_project(i.project_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.client_invoices i WHERE i.id = invoice_id AND public.auth_user_can_access_project(i.project_id)));
DROP POLICY IF EXISTS client_credit_notes_all ON public.client_credit_notes;
CREATE POLICY client_credit_notes_all ON public.client_credit_notes FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.client_invoices i WHERE i.id = invoice_id AND public.auth_user_can_access_project(i.project_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.client_invoices i WHERE i.id = invoice_id AND public.auth_user_can_access_project(i.project_id)));
DROP POLICY IF EXISTS client_credit_note_lines_all ON public.client_credit_note_lines;
CREATE POLICY client_credit_note_lines_all ON public.client_credit_note_lines FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.client_credit_notes n JOIN public.client_invoices i ON i.id = n.invoice_id WHERE n.id = credit_note_id AND public.auth_user_can_access_project(i.project_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.client_credit_notes n JOIN public.client_invoices i ON i.id = n.invoice_id WHERE n.id = credit_note_id AND public.auth_user_can_access_project(i.project_id)));
DROP POLICY IF EXISTS client_payments_all ON public.client_payments;
CREATE POLICY client_payments_all ON public.client_payments FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.client_invoices i WHERE i.id = invoice_id AND public.auth_user_can_access_project(i.project_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.client_invoices i WHERE i.id = invoice_id AND public.auth_user_can_access_project(i.project_id)));
DROP POLICY IF EXISTS client_invoice_sends_all ON public.client_invoice_sends;
CREATE POLICY client_invoice_sends_all ON public.client_invoice_sends FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.client_invoices i WHERE i.id = invoice_id AND public.auth_user_can_access_project(i.project_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.client_invoices i WHERE i.id = invoice_id AND public.auth_user_can_access_project(i.project_id)));
DROP POLICY IF EXISTS invoice_document_settings_all ON public.invoice_document_settings;
CREATE POLICY invoice_document_settings_all ON public.invoice_document_settings FOR ALL TO authenticated
  USING (account_id IS NULL OR public.user_has_access_to_account(account_id))
  WITH CHECK (account_id IS NULL OR public.user_has_access_to_account(account_id));

DROP POLICY IF EXISTS client_invoices_all ON sim.client_invoices;
CREATE POLICY client_invoices_all ON sim.client_invoices FOR ALL TO authenticated
  USING (sim.qra_can_access(project_id)) WITH CHECK (sim.qra_can_access(project_id));
DROP POLICY IF EXISTS client_invoice_lines_all ON sim.client_invoice_lines;
CREATE POLICY client_invoice_lines_all ON sim.client_invoice_lines FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM sim.client_invoices i WHERE i.id = invoice_id AND sim.qra_can_access(i.project_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM sim.client_invoices i WHERE i.id = invoice_id AND sim.qra_can_access(i.project_id)));
DROP POLICY IF EXISTS client_credit_notes_all ON sim.client_credit_notes;
CREATE POLICY client_credit_notes_all ON sim.client_credit_notes FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM sim.client_invoices i WHERE i.id = invoice_id AND sim.qra_can_access(i.project_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM sim.client_invoices i WHERE i.id = invoice_id AND sim.qra_can_access(i.project_id)));
DROP POLICY IF EXISTS client_credit_note_lines_all ON sim.client_credit_note_lines;
CREATE POLICY client_credit_note_lines_all ON sim.client_credit_note_lines FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM sim.client_credit_notes n JOIN sim.client_invoices i ON i.id = n.invoice_id WHERE n.id = credit_note_id))
  WITH CHECK (EXISTS (SELECT 1 FROM sim.client_credit_notes n JOIN sim.client_invoices i ON i.id = n.invoice_id WHERE n.id = credit_note_id));
DROP POLICY IF EXISTS client_payments_all ON sim.client_payments;
CREATE POLICY client_payments_all ON sim.client_payments FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM sim.client_invoices i WHERE i.id = invoice_id AND sim.qra_can_access(i.project_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM sim.client_invoices i WHERE i.id = invoice_id AND sim.qra_can_access(i.project_id)));
DROP POLICY IF EXISTS client_invoice_sends_all ON sim.client_invoice_sends;
CREATE POLICY client_invoice_sends_all ON sim.client_invoice_sends FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM sim.client_invoices i WHERE i.id = invoice_id AND sim.qra_can_access(i.project_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM sim.client_invoices i WHERE i.id = invoice_id AND sim.qra_can_access(i.project_id)));
DROP POLICY IF EXISTS invoice_document_settings_all ON sim.invoice_document_settings;
CREATE POLICY invoice_document_settings_all ON sim.invoice_document_settings FOR ALL TO authenticated
  USING (user_id IS NULL OR user_id = auth.uid()) WITH CHECK (user_id IS NULL OR user_id = auth.uid());

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active) VALUES
  ('client_invoices', 'Invoices raised to clients', FALSE, TRUE),
  ('client_invoice_lines', 'Lines on a client invoice', FALSE, TRUE),
  ('client_credit_notes', 'Credit notes that reverse a client invoice', FALSE, TRUE),
  ('client_credit_note_lines', 'Invoice lines reversed by a credit note', FALSE, TRUE),
  ('client_payments', 'Payments received against a client invoice', FALSE, TRUE),
  ('client_invoice_sends', 'Emails of a client invoice or reminder', FALSE, TRUE),
  ('invoice_document_settings', 'Payment instructions and footer printed on invoices', FALSE, TRUE),
  ('sim.client_invoices', 'Simulator client invoices', FALSE, TRUE),
  ('sim.client_invoice_lines', 'Simulator client invoice lines', FALSE, TRUE),
  ('sim.client_credit_notes', 'Simulator credit notes', FALSE, TRUE),
  ('sim.client_credit_note_lines', 'Simulator credit note lines', FALSE, TRUE),
  ('sim.client_payments', 'Simulator client payments', FALSE, TRUE),
  ('sim.client_invoice_sends', 'Simulator invoice emails', FALSE, TRUE),
  ('sim.invoice_document_settings', 'Simulator invoice document text', FALSE, TRUE)
ON CONFLICT (table_name) DO UPDATE SET table_description = EXCLUDED.table_description, is_active = TRUE, updated_at = NOW();

INSERT INTO public.planner_table_allowlist (table_name) VALUES
  ('client_invoices'), ('client_invoice_lines'), ('client_credit_notes'), ('client_credit_note_lines'),
  ('client_payments'), ('client_invoice_sends'), ('invoice_document_settings')
ON CONFLICT (table_name) DO NOTHING;

INSERT INTO public.field_help (help_key, title, purpose, examples, format_notes, extra_notes, module_code) VALUES
  ('public.timesheet_entries.is_billable', 'Billable', 'Ticked time can go on a client invoice once it is approved. Untick time the client should not pay for, such as internal meetings.', '- Ticked', NULL, NULL, 'billing'),
  ('public.project_expense_claim_items.is_rechargeable', 'Recharge to the client', 'Ticked expenses are added to the next draft invoice, with the project or client mark-up. An invoiced line cannot be edited until it is credited.', '- Ticked', NULL, NULL, 'billing'),
  ('public.project_expense_claims.is_rechargeable', 'Recharge to the client', 'The whole claim can be recharged when it is not split into items.', '- Ticked', NULL, NULL, 'billing'),
  ('public.client_invoices.invoice_date', 'Invoice date', 'The date printed on the invoice. The exchange rate is the rate on this date.', '- {example_date}', 'Dates show as {date_format}.', NULL, 'billing'),
  ('public.client_invoices.exchange_rate', 'Exchange rate', 'How many organisation-currency units one invoice-currency unit was worth on the invoice date. Stored so later reports do not change.', '- 1.25', NULL, NULL, 'billing'),
  ('public.client_payments.amount', 'Amount received', 'The money received against this invoice.', '- 5000', 'Amounts show in {currency}.', NULL, 'billing'),
  ('public.client_payments.paid_on', 'Date received', 'When the payment arrived.', '- {example_date}', 'Dates show as {date_format}.', NULL, 'billing'),
  ('public.client_payments.method', 'Method', 'How the money arrived.', '- Bank transfer', NULL, NULL, 'billing'),
  ('public.client_payments.reference', 'Payment reference', 'The reference the client used, so the payment can be matched.', '- INV-014', NULL, NULL, 'billing'),
  ('public.client_credit_notes.reason', 'Reason', 'Why this invoice, or these lines, are being reversed.', '- Time was logged to the wrong project.', NULL, NULL, 'billing'),
  ('public.invoice_document_settings.payment_instructions', 'Payment instructions', 'Printed on every invoice. Bank details belong here.', '- Pay to Example Bank, account 00000000.', NULL, NULL, 'billing'),
  ('public.invoice_document_settings.footer', 'Footer', 'A short note printed at the bottom of every invoice.', '- Example Freight Ltd is a sample name.', NULL, NULL, 'billing'),
  ('public.timesheet_work_categories.billable_default', 'Billable by default', 'New time in this category starts billable or not, ahead of the project default.', '- Not billable', NULL, NULL, 'billing'),
  ('public.expense_categories.rechargeable_default', 'Rechargeable by default', 'New expenses in this category start as rechargeable to the client.', '- Ticked', NULL, NULL, 'billing')
ON CONFLICT (help_key, form_key, locale) DO UPDATE SET
  title = EXCLUDED.title, purpose = EXCLUDED.purpose, examples = EXCLUDED.examples,
  format_notes = EXCLUDED.format_notes, module_code = EXCLUDED.module_code, is_active = TRUE, updated_at = NOW();

INSERT INTO public.field_help_aliases (alias_key, help_key) VALUES
  ('sim.timesheet_entries.is_billable', 'public.timesheet_entries.is_billable'),
  ('sim.project_expense_claim_items.is_rechargeable', 'public.project_expense_claim_items.is_rechargeable'),
  ('sim.project_expense_claims.is_rechargeable', 'public.project_expense_claims.is_rechargeable'),
  ('sim.client_invoices.invoice_date', 'public.client_invoices.invoice_date'),
  ('sim.client_invoices.exchange_rate', 'public.client_invoices.exchange_rate'),
  ('sim.client_payments.amount', 'public.client_payments.amount'),
  ('sim.client_payments.paid_on', 'public.client_payments.paid_on'),
  ('sim.client_payments.method', 'public.client_payments.method'),
  ('sim.client_payments.reference', 'public.client_payments.reference'),
  ('sim.client_credit_notes.reason', 'public.client_credit_notes.reason'),
  ('sim.invoice_document_settings.payment_instructions', 'public.invoice_document_settings.payment_instructions'),
  ('sim.invoice_document_settings.footer', 'public.invoice_document_settings.footer')
ON CONFLICT (alias_key) DO UPDATE SET help_key = EXCLUDED.help_key;

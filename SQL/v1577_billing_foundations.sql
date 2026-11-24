-- ============================================================================
-- v1577 — Project billing foundations (v1353 slice 1)
-- Clients, contacts, rate cards, tax codes, project billing settings.
-- Then run Admin SQL v259 so new clients receive a display id.
-- Idempotent.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE,
  client_reference TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'external',
  billing_address TEXT,
  tax_number TEXT,
  currency TEXT NOT NULL DEFAULT 'USD',
  payment_terms_days INTEGER NOT NULL DEFAULT 30,
  markup_percent NUMERIC(8,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  CONSTRAINT clients_kind CHECK (kind IN ('external', 'internal')),
  CONSTRAINT clients_terms CHECK (payment_terms_days BETWEEN 0 AND 365)
);
CREATE TABLE IF NOT EXISTS sim.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  client_reference TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'external',
  billing_address TEXT,
  tax_number TEXT,
  currency TEXT NOT NULL DEFAULT 'USD',
  payment_terms_days INTEGER NOT NULL DEFAULT 30,
  markup_percent NUMERIC(8,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  CONSTRAINT clients_kind CHECK (kind IN ('external', 'internal')),
  CONSTRAINT clients_terms CHECK (payment_terms_days BETWEEN 0 AND 365)
);

CREATE TABLE IF NOT EXISTS public.client_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role_title TEXT,
  email TEXT,
  phone TEXT,
  is_billing_contact BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS sim.client_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES sim.clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role_title TEXT,
  email TEXT,
  phone TEXT,
  is_billing_contact BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.tax_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  label TEXT NOT NULL,
  rate_percent NUMERIC(8,4) NOT NULL DEFAULT 0,
  kind TEXT NOT NULL DEFAULT 'standard',
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT tax_codes_kind CHECK (kind IN ('standard', 'exempt', 'reverse_charge')),
  CONSTRAINT tax_codes_rate CHECK (rate_percent >= 0 AND rate_percent <= 100)
);
CREATE TABLE IF NOT EXISTS sim.tax_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  code TEXT NOT NULL,
  label TEXT NOT NULL,
  rate_percent NUMERIC(8,4) NOT NULL DEFAULT 0,
  kind TEXT NOT NULL DEFAULT 'standard',
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT tax_codes_kind CHECK (kind IN ('standard', 'exempt', 'reverse_charge')),
  CONSTRAINT tax_codes_rate CHECK (rate_percent >= 0 AND rate_percent <= 100)
);

ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS default_tax_code_id UUID REFERENCES public.tax_codes(id) ON DELETE SET NULL;
ALTER TABLE sim.clients ADD COLUMN IF NOT EXISTS default_tax_code_id UUID REFERENCES sim.tax_codes(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.rate_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT rate_cards_dates CHECK (effective_to IS NULL OR effective_to >= effective_from)
);
CREATE TABLE IF NOT EXISTS sim.rate_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  client_id UUID REFERENCES sim.clients(id) ON DELETE CASCADE,
  project_id UUID REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT rate_cards_dates CHECK (effective_to IS NULL OR effective_to >= effective_from)
);

CREATE TABLE IF NOT EXISTS public.rate_card_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rate_card_id UUID NOT NULL REFERENCES public.rate_cards(id) ON DELETE CASCADE,
  role_name TEXT,
  user_id UUID,
  work_category TEXT,
  unit TEXT NOT NULL DEFAULT 'hour',
  rate NUMERIC(18,2) NOT NULL,
  CONSTRAINT rate_card_lines_unit CHECK (unit IN ('hour', 'day')),
  CONSTRAINT rate_card_lines_rate CHECK (rate >= 0)
);
CREATE TABLE IF NOT EXISTS sim.rate_card_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rate_card_id UUID NOT NULL REFERENCES sim.rate_cards(id) ON DELETE CASCADE,
  role_name TEXT,
  user_id UUID,
  work_category TEXT,
  unit TEXT NOT NULL DEFAULT 'hour',
  rate NUMERIC(18,2) NOT NULL,
  CONSTRAINT rate_card_lines_unit CHECK (unit IN ('hour', 'day')),
  CONSTRAINT rate_card_lines_rate CHECK (rate >= 0)
);

CREATE TABLE IF NOT EXISTS public.project_billing_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  rate_card_id UUID REFERENCES public.rate_cards(id) ON DELETE SET NULL,
  billable_default BOOLEAN,
  markup_percent NUMERIC(8,2),
  contract_value NUMERIC(18,2),
  currency TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT project_billing_settings_project UNIQUE (project_id)
);
CREATE TABLE IF NOT EXISTS sim.project_billing_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
  client_id UUID REFERENCES sim.clients(id) ON DELETE SET NULL,
  rate_card_id UUID REFERENCES sim.rate_cards(id) ON DELETE SET NULL,
  billable_default BOOLEAN,
  markup_percent NUMERIC(8,2),
  contract_value NUMERIC(18,2),
  currency TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT project_billing_settings_project UNIQUE (project_id)
);

DROP TRIGGER IF EXISTS trg_clients_display_id ON public.clients;
CREATE TRIGGER trg_clients_display_id
  AFTER INSERT ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.trg_apply_admin_display_id('public.clients', 'client_reference');
DROP TRIGGER IF EXISTS trg_sim_clients_display_id ON sim.clients;
CREATE TRIGGER trg_sim_clients_display_id
  AFTER INSERT ON sim.clients
  FOR EACH ROW EXECUTE FUNCTION sim.trg_apply_admin_display_id('sim.clients', 'client_reference');

-- Same precedence as packages/planning/src/engine/billing.js.
CREATE OR REPLACE FUNCTION public.resolve_charge_rate(
  p_project_id UUID, p_person UUID, p_role TEXT, p_category TEXT, p_unit TEXT, p_on DATE
) RETURNS NUMERIC
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public SET row_security = off
AS $$
  WITH cards AS (
    SELECT rc.id, CASE WHEN rc.project_id IS NOT NULL THEN 1 WHEN rc.client_id IS NOT NULL THEN 2 ELSE 3 END AS scope_rank
    FROM public.rate_cards rc
    LEFT JOIN public.project_billing_settings s ON s.project_id = p_project_id
    WHERE rc.effective_from <= p_on AND (rc.effective_to IS NULL OR rc.effective_to >= p_on)
      AND (rc.project_id = p_project_id OR rc.id = s.rate_card_id OR rc.client_id = s.client_id
           OR (rc.project_id IS NULL AND rc.client_id IS NULL AND rc.account_id = (SELECT account_id FROM public.projects WHERE id = p_project_id)))
  ),
  ranked AS (
    SELECT l.rate,
      CASE WHEN l.user_id IS NOT NULL AND l.user_id = p_person THEN 0 ELSE cards.scope_rank END AS scope_rank,
      CASE WHEN l.user_id IS NOT NULL THEN 0
           WHEN l.role_name IS NOT NULL AND COALESCE(l.work_category, '') <> '' THEN 1
           WHEN l.role_name IS NOT NULL THEN 2
           WHEN COALESCE(l.work_category, '') <> '' THEN 3 ELSE 4 END AS spec
    FROM cards
    JOIN public.rate_card_lines l ON l.rate_card_id = cards.id
    WHERE l.unit = COALESCE(NULLIF(p_unit, ''), 'hour')
      AND (
        (l.user_id IS NOT NULL AND l.user_id = p_person)
        OR (l.user_id IS NULL AND (l.role_name IS NULL OR l.role_name = p_role) AND (l.work_category IS NULL OR l.work_category = '' OR l.work_category = p_category))
      )
  )
  SELECT rate FROM ranked ORDER BY scope_rank, spec LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION sim.resolve_charge_rate(
  p_project_id UUID, p_person UUID, p_role TEXT, p_category TEXT, p_unit TEXT, p_on DATE
) RETURNS NUMERIC
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = sim, public SET row_security = off
AS $$
  WITH cards AS (
    SELECT rc.id, CASE WHEN rc.project_id IS NOT NULL THEN 1 WHEN rc.client_id IS NOT NULL THEN 2 ELSE 3 END AS scope_rank
    FROM sim.rate_cards rc
    LEFT JOIN sim.project_billing_settings s ON s.project_id = p_project_id
    WHERE rc.effective_from <= p_on AND (rc.effective_to IS NULL OR rc.effective_to >= p_on)
      AND (rc.project_id = p_project_id OR rc.id = s.rate_card_id OR rc.client_id = s.client_id
           OR (rc.project_id IS NULL AND rc.client_id IS NULL))
  ),
  ranked AS (
    SELECT l.rate,
      CASE WHEN l.user_id IS NOT NULL AND l.user_id = p_person THEN 0 ELSE cards.scope_rank END AS scope_rank,
      CASE WHEN l.user_id IS NOT NULL THEN 0 WHEN l.role_name IS NOT NULL AND COALESCE(l.work_category, '') <> '' THEN 1
           WHEN l.role_name IS NOT NULL THEN 2 WHEN COALESCE(l.work_category, '') <> '' THEN 3 ELSE 4 END AS spec
    FROM cards
    JOIN sim.rate_card_lines l ON l.rate_card_id = cards.id
    WHERE l.unit = COALESCE(NULLIF(p_unit, ''), 'hour')
      AND ((l.user_id IS NOT NULL AND l.user_id = p_person)
        OR (l.user_id IS NULL AND (l.role_name IS NULL OR l.role_name = p_role) AND (l.work_category IS NULL OR l.work_category = '' OR l.work_category = p_category)))
  )
  SELECT rate FROM ranked ORDER BY scope_rank, spec LIMIT 1;
$$;

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_card_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_billing_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.client_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.tax_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.rate_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.rate_card_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.project_billing_settings ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients, public.client_contacts, public.tax_codes, public.rate_cards, public.rate_card_lines, public.project_billing_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON sim.clients, sim.client_contacts, sim.tax_codes, sim.rate_cards, sim.rate_card_lines, sim.project_billing_settings TO authenticated;
GRANT ALL ON public.clients, public.client_contacts, public.tax_codes, public.rate_cards, public.rate_card_lines, public.project_billing_settings,
  sim.clients, sim.client_contacts, sim.tax_codes, sim.rate_cards, sim.rate_card_lines, sim.project_billing_settings TO service_role;
GRANT EXECUTE ON FUNCTION public.resolve_charge_rate(UUID, UUID, TEXT, TEXT, TEXT, DATE), sim.resolve_charge_rate(UUID, UUID, TEXT, TEXT, TEXT, DATE) TO authenticated;

DROP POLICY IF EXISTS clients_all ON public.clients;
CREATE POLICY clients_all ON public.clients FOR ALL TO authenticated
  USING (account_id IS NULL OR public.user_has_access_to_account(account_id))
  WITH CHECK (account_id IS NULL OR public.user_has_access_to_account(account_id));
DROP POLICY IF EXISTS client_contacts_all ON public.client_contacts;
CREATE POLICY client_contacts_all ON public.client_contacts FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.clients c WHERE c.id = client_id AND (c.account_id IS NULL OR public.user_has_access_to_account(c.account_id))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.clients c WHERE c.id = client_id AND (c.account_id IS NULL OR public.user_has_access_to_account(c.account_id))));
DROP POLICY IF EXISTS tax_codes_all ON public.tax_codes;
CREATE POLICY tax_codes_all ON public.tax_codes FOR ALL TO authenticated
  USING (account_id IS NULL OR public.user_has_access_to_account(account_id))
  WITH CHECK (account_id IS NULL OR public.user_has_access_to_account(account_id));
DROP POLICY IF EXISTS rate_cards_all ON public.rate_cards;
CREATE POLICY rate_cards_all ON public.rate_cards FOR ALL TO authenticated
  USING (account_id IS NULL OR public.user_has_access_to_account(account_id) OR public.auth_user_can_access_project(project_id))
  WITH CHECK (account_id IS NULL OR public.user_has_access_to_account(account_id) OR public.auth_user_can_access_project(project_id));
DROP POLICY IF EXISTS rate_card_lines_all ON public.rate_card_lines;
CREATE POLICY rate_card_lines_all ON public.rate_card_lines FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.rate_cards rc WHERE rc.id = rate_card_id))
  WITH CHECK (EXISTS (SELECT 1 FROM public.rate_cards rc WHERE rc.id = rate_card_id));
DROP POLICY IF EXISTS project_billing_settings_all ON public.project_billing_settings;
CREATE POLICY project_billing_settings_all ON public.project_billing_settings FOR ALL TO authenticated
  USING (public.auth_user_can_access_project(project_id))
  WITH CHECK (public.auth_user_can_access_project(project_id));

DROP POLICY IF EXISTS clients_all ON sim.clients;
CREATE POLICY clients_all ON sim.clients FOR ALL TO authenticated
  USING (user_id IS NULL OR user_id = auth.uid()) WITH CHECK (user_id IS NULL OR user_id = auth.uid());
DROP POLICY IF EXISTS client_contacts_all ON sim.client_contacts;
CREATE POLICY client_contacts_all ON sim.client_contacts FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM sim.clients c WHERE c.id = client_id AND (c.user_id IS NULL OR c.user_id = auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM sim.clients c WHERE c.id = client_id AND (c.user_id IS NULL OR c.user_id = auth.uid())));
DROP POLICY IF EXISTS tax_codes_all ON sim.tax_codes;
CREATE POLICY tax_codes_all ON sim.tax_codes FOR ALL TO authenticated
  USING (user_id IS NULL OR user_id = auth.uid()) WITH CHECK (user_id IS NULL OR user_id = auth.uid());
DROP POLICY IF EXISTS rate_cards_all ON sim.rate_cards;
CREATE POLICY rate_cards_all ON sim.rate_cards FOR ALL TO authenticated
  USING (user_id IS NULL OR user_id = auth.uid() OR sim.qra_can_access(project_id))
  WITH CHECK (user_id IS NULL OR user_id = auth.uid() OR sim.qra_can_access(project_id));
DROP POLICY IF EXISTS rate_card_lines_all ON sim.rate_card_lines;
CREATE POLICY rate_card_lines_all ON sim.rate_card_lines FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM sim.rate_cards rc WHERE rc.id = rate_card_id))
  WITH CHECK (EXISTS (SELECT 1 FROM sim.rate_cards rc WHERE rc.id = rate_card_id));
DROP POLICY IF EXISTS project_billing_settings_all ON sim.project_billing_settings;
CREATE POLICY project_billing_settings_all ON sim.project_billing_settings FOR ALL TO authenticated
  USING (sim.qra_can_access(project_id)) WITH CHECK (sim.qra_can_access(project_id));

INSERT INTO public.roles (role_name, role_display_name, role_description, role_level, is_system_role, is_default_role, is_active, account_id)
SELECT 'finance_billing', 'Finance / Billing', 'Manages clients, rate cards, tax codes and client invoices. Cannot approve an invoice.', 2, TRUE, FALSE, TRUE, NULL
WHERE NOT EXISTS (SELECT 1 FROM public.roles WHERE role_name = 'finance_billing' AND account_id IS NULL);

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active) VALUES
  ('clients', 'Client organisations that projects are billed to', FALSE, TRUE),
  ('client_contacts', 'Billing contacts for a client', FALSE, TRUE),
  ('tax_codes', 'Organisation tax codes for client invoices', FALSE, TRUE),
  ('rate_cards', 'Charge-out rate cards', FALSE, TRUE),
  ('rate_card_lines', 'Role, person or work-category rates on a card', FALSE, TRUE),
  ('project_billing_settings', 'Which client and rate card a project uses', FALSE, TRUE),
  ('sim.clients', 'Simulator client organisations', FALSE, TRUE),
  ('sim.client_contacts', 'Simulator billing contacts', FALSE, TRUE),
  ('sim.tax_codes', 'Simulator tax codes', FALSE, TRUE),
  ('sim.rate_cards', 'Simulator charge-out rate cards', FALSE, TRUE),
  ('sim.rate_card_lines', 'Simulator rate card lines', FALSE, TRUE),
  ('sim.project_billing_settings', 'Simulator project billing settings', FALSE, TRUE)
ON CONFLICT (table_name) DO UPDATE SET table_description = EXCLUDED.table_description, is_active = TRUE, updated_at = NOW();

INSERT INTO public.planner_table_allowlist (table_name) VALUES
  ('clients'), ('client_contacts'), ('tax_codes'), ('rate_cards'), ('rate_card_lines'), ('project_billing_settings')
ON CONFLICT (table_name) DO NOTHING;

-- Example client only for an account that has none yet. The display id stays blank so Admin ID Generation fills it.
DO $$
DECLARE v_account UUID;
BEGIN
  SELECT id INTO v_account FROM public.accounts ORDER BY created_at LIMIT 1;
  IF v_account IS NULL OR EXISTS (SELECT 1 FROM public.clients WHERE name = 'Example Freight Ltd' AND account_id = v_account) THEN
    RETURN;
  END IF;
  INSERT INTO public.clients (account_id, client_reference, name, kind, billing_address, currency, payment_terms_days, notes)
  VALUES (v_account, '', 'Example Freight Ltd', 'external', '1 Example Wharf, London', 'USD', 30, 'Sample client for billing practice.');
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'SKIP example client — %', SQLERRM;
END $$;

INSERT INTO public.field_help (help_key, title, purpose, examples, format_notes, extra_notes, module_code) VALUES
  ('public.clients.name', 'Client name', 'The organisation you bill. One client can be linked to many projects.', '- Example Freight Ltd', NULL, NULL, 'billing'),
  ('public.clients.kind', 'Client kind', 'An external company is invoiced with tax. An internal department is not taxed and can be exported as a journal entry.', '- External', NULL, NULL, 'billing'),
  ('public.clients.billing_address', 'Billing address', 'The address printed on the invoice.', '- 1 Example Wharf, London', NULL, NULL, 'billing'),
  ('public.clients.tax_number', 'Tax number', 'The client’s tax registration, printed on the invoice when you have one.', '- GB000000000', NULL, NULL, 'billing'),
  ('public.clients.currency', 'Currency', 'Invoices for this client are raised in this currency. Reports convert them to the organisation currency at the rate stored on each invoice.', '- USD', NULL, NULL, 'billing'),
  ('public.clients.payment_terms_days', 'Payment terms (days)', 'How many days after the invoice date payment is due.', '- 30', 'A whole number from 0 to 365.', NULL, 'billing'),
  ('public.clients.markup_percent', 'Mark-up %', 'Added to rechargeable expenses for this client, unless the project sets its own mark-up.', '- 10', 'A percentage. 10 adds one tenth.', NULL, 'billing'),
  ('public.clients.default_tax_code_id', 'Default tax code', 'The tax code new invoice lines start with. Internal clients are not taxed even when a code is set.', '- VAT 20%', NULL, NULL, 'billing'),
  ('public.clients.notes', 'Notes', 'Anything Finance needs to remember about how this client is billed. Not printed on the invoice.', '- Send invoices to the billing contact only.', NULL, NULL, 'billing'),
  ('public.client_contacts.name', 'Contact name', 'A person at the client. Use a role title rather than a private name where you can.', '- Head of Finance', NULL, NULL, 'billing'),
  ('public.client_contacts.role_title', 'Role', 'What this person does for the client.', '- Accounts payable', NULL, NULL, 'billing'),
  ('public.client_contacts.email', 'Email', 'Where an issued invoice is sent when this person is a billing contact.', '- accounts@client.example', NULL, NULL, 'billing'),
  ('public.client_contacts.phone', 'Phone', 'A phone number for the billing contact.', '- +44 20 7946 0000', NULL, NULL, 'billing'),
  ('public.client_contacts.is_billing_contact', 'Billing contact', 'Issued invoices are emailed to every contact ticked here.', '- Ticked', NULL, NULL, 'billing'),
  ('public.tax_codes.code', 'Code', 'A short code you will recognise on an invoice line.', '- VAT20', NULL, NULL, 'billing'),
  ('public.tax_codes.label', 'Label', 'The name printed beside the tax on the invoice.', '- VAT 20%', NULL, NULL, 'billing'),
  ('public.tax_codes.rate_percent', 'Rate %', 'The tax percent. Exempt and reverse charge stay at zero on the invoice.', '- 20', 'From 0 to 100.', NULL, 'billing'),
  ('public.tax_codes.kind', 'Kind', 'Standard adds the rate. Exempt and reverse charge add no tax.', '- Standard', NULL, NULL, 'billing'),
  ('public.tax_codes.is_default', 'Organisation default', 'Used when a client has no default of their own.', '- Ticked', NULL, NULL, 'billing'),
  ('public.rate_cards.name', 'Rate card name', 'A name for this set of charge-out rates, such as the year or the client.', '- 2026 standard', NULL, NULL, 'billing'),
  ('public.rate_cards.currency', 'Currency', 'The currency these rates are quoted in.', '- USD', NULL, NULL, 'billing'),
  ('public.rate_cards.effective_from', 'Effective from', 'The first day these rates may be used.', '- {example_date}', 'Dates show as {date_format}.', NULL, 'billing'),
  ('public.rate_cards.effective_to', 'Effective to', 'The last day these rates may be used. Leave blank if they have no end date.', '- {example_date}', 'Dates show as {date_format}.', NULL, 'billing'),
  ('public.rate_card_lines.role_name', 'Role', 'The role this rate applies to. Leave blank for a rate that is only for one person or one work category.', '- Consultant', NULL, NULL, 'billing'),
  ('public.rate_card_lines.user_id', 'Person', 'A rate for one person. This wins over a role rate.', '- Project Manager', NULL, NULL, 'billing'),
  ('public.rate_card_lines.work_category', 'Work category', 'Limits the rate to one timesheet category, such as design.', '- design', NULL, NULL, 'billing'),
  ('public.rate_card_lines.unit', 'Unit', 'Whether the rate is for an hour or a day.', '- Hour', NULL, NULL, 'billing'),
  ('public.rate_card_lines.rate', 'Rate', 'The charge-out amount for one hour or one day. This is not the cost rate.', '- 150', 'Amounts show in {currency}. Type 10t for 10,000, then press Enter.', NULL, 'billing'),
  ('public.project_billing_settings.client_id', 'Client', 'Who this project is billed to.', '- Example Freight Ltd', NULL, NULL, 'billing'),
  ('public.project_billing_settings.rate_card_id', 'Project rate card', 'Charge-out rates for this project. A person rate still wins. If blank, the client card is used, then the organisation card.', '- 2026 project rates', NULL, NULL, 'billing'),
  ('public.project_billing_settings.billable_default', 'Time is billable', 'The starting point for a new timesheet entry. Time and materials usually starts ticked. A work category can override it.', '- Ticked', NULL, NULL, 'billing'),
  ('public.project_billing_settings.markup_percent', 'Expense mark-up %', 'Added to rechargeable expenses on this project. Leave blank to use the client’s mark-up.', '- 10', NULL, NULL, 'billing'),
  ('public.project_billing_settings.contract_value', 'Contract value', 'The fixed price. A billing schedule line can be a percent of this amount.', '- 120000', 'Amounts show in {currency}.', NULL, 'billing'),
  ('public.project_billing_settings.currency', 'Invoice currency', 'Leave blank to use the client’s currency.', '- USD', NULL, NULL, 'billing')
ON CONFLICT (help_key, form_key, locale) DO UPDATE SET
  title = EXCLUDED.title, purpose = EXCLUDED.purpose, examples = EXCLUDED.examples,
  format_notes = EXCLUDED.format_notes, module_code = EXCLUDED.module_code, is_active = TRUE, updated_at = NOW();

INSERT INTO public.field_help_aliases (alias_key, help_key)
SELECT replace(help_key, 'public.', 'sim.'), help_key FROM public.field_help
WHERE help_key LIKE 'public.clients.%' OR help_key LIKE 'public.client_contacts.%' OR help_key LIKE 'public.tax_codes.%'
   OR help_key LIKE 'public.rate_cards.%' OR help_key LIKE 'public.rate_card_lines.%' OR help_key LIKE 'public.project_billing_settings.%'
ON CONFLICT (alias_key) DO UPDATE SET help_key = EXCLUDED.help_key;

-- Finance menus in Money & Resources. Grants copy from the budget page, plus the Finance / Billing role.
INSERT INTO public.menu_items (id, menu_code, menu_label, menu_description, route_path, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, default_section_code, created_at, updated_at)
SELECT gen_random_uuid(), v.code, v.label, v.description, v.route, 3, v.sort_order, 'universal', 'wallet', TRUE, TRUE, 'money_resources', NOW(), NOW()
FROM (VALUES
  ('plat_fin_clients', 'Clients', 'Client organisations you bill (v1353).', '/platform/billing/clients', 80),
  ('plat_fin_rates', 'Rate cards', 'Charge-out rates by role, person and work category (v1353).', '/platform/billing/rate-cards', 81),
  ('plat_fin_tax', 'Tax codes', 'Tax codes used on client invoices (v1353).', '/platform/billing/tax-codes', 82),
  ('plat_fin_invoices', 'Client invoices', 'Draft, approve, issue and record payment (v1353).', '/platform/billing/invoices', 83),
  ('plat_fin_revenue', 'Revenue and margin', 'Billed revenue, unbilled work and margin (v1353).', '/platform/billing/revenue', 84),
  ('sim_fin_clients', 'Clients', 'Practice client organisations (v1353).', '/simulator/billing/clients', 80),
  ('sim_fin_rates', 'Rate cards', 'Practice charge-out rates (v1353).', '/simulator/billing/rate-cards', 81),
  ('sim_fin_tax', 'Tax codes', 'Practice tax codes (v1353).', '/simulator/billing/tax-codes', 82),
  ('sim_fin_invoices', 'Client invoices', 'Practice client invoices (v1353).', '/simulator/billing/invoices', 83),
  ('sim_fin_revenue', 'Revenue and margin', 'Practice revenue, unbilled work and margin (v1353).', '/simulator/billing/revenue', 84)
) AS v(code, label, description, route, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM public.menu_items m WHERE m.menu_code = v.code);

INSERT INTO public.menu_item_placements (menu_item_id, placement_key, section_code, sort_order)
SELECT mi.id, v.placement_key, 'money_resources', mi.sort_order
FROM public.menu_items mi
CROSS JOIN (VALUES ('pm'), ('pmo_oversight'), ('programme'), ('portfolio')) AS v(placement_key)
WHERE mi.menu_code LIKE '%\_fin\_%' AND COALESCE(mi.is_deleted, FALSE) = FALSE
ON CONFLICT (menu_item_id, placement_key) DO UPDATE SET section_code = EXCLUDED.section_code, sort_order = EXCLUDED.sort_order, is_active = TRUE, updated_at = NOW();

INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), r.id, mi.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.roles r
JOIN public.menu_items mi ON mi.menu_code LIKE 'plat_fin_%' OR mi.menu_code LIKE 'sim_fin_%'
WHERE r.role_name IN ('finance_billing', 'finance', 'pmo_admin', 'account_owner', 'project_manager') AND r.account_id IS NULL AND COALESCE(mi.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view = TRUE, can_use = TRUE, is_active = TRUE, updated_at = NOW();

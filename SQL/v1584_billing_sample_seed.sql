-- v1353 sample billing data (rule 18.2). Run after v1577–v1583 and Admin v259.
-- Idempotent. Display ids are left blank so Admin ID Generation assigns them.
-- Platform rows are attached to SEED334-PRJ-08 so the Client invoices list is not empty.

DO $$
DECLARE
  v_project UUID;
  v_account UUID;
  v_client UUID;
  v_tax UUID := 'a1584001-0000-4000-8000-000000000001';
  v_card UUID := 'a1584001-0000-4000-8000-000000000003';
  v_overdue UUID := 'a1584001-0000-4000-8000-000000000011';
  v_part UUID := 'a1584001-0000-4000-8000-000000000012';
  v_draft UUID := 'a1584001-0000-4000-8000-000000000013';
BEGIN
  SELECT id, account_id INTO v_project, v_account
  FROM public.projects
  WHERE project_code = 'SEED334-PRJ-08' AND COALESCE(is_deleted, FALSE) = FALSE
  LIMIT 1;
  IF v_project IS NULL THEN
    RAISE NOTICE 'SKIP v1584 platform — project SEED334-PRJ-08 was not found';
    RETURN;
  END IF;

  SELECT id INTO v_client FROM public.clients
   WHERE name = 'Example Freight Ltd' AND account_id = v_account AND COALESCE(is_deleted, FALSE) = FALSE
   LIMIT 1;
  IF v_client IS NULL THEN
    INSERT INTO public.clients (account_id, client_reference, name, kind, billing_address, currency, payment_terms_days, notes)
    VALUES (v_account, '', 'Example Freight Ltd', 'external', '1 Example Wharf, London', 'USD', 30, 'Sample client for billing practice.')
    RETURNING id INTO v_client;
  END IF;

  INSERT INTO public.tax_codes (id, account_id, code, label, rate_percent, kind, is_default) VALUES
    (v_tax, v_account, 'VAT20', 'VAT 20%', 20, 'standard', TRUE),
    ('a1584001-0000-4000-8000-000000000002', v_account, 'EXEMPT', 'Exempt', 0, 'exempt', FALSE)
  ON CONFLICT (id) DO NOTHING;
  UPDATE public.clients SET default_tax_code_id = v_tax WHERE id = v_client AND default_tax_code_id IS NULL;

  INSERT INTO public.client_contacts (id, client_id, name, role_title, email, phone, is_billing_contact)
  VALUES ('a1584001-0000-4000-8000-000000000005', v_client, 'Head of Finance', 'Accounts payable', 'accounts@client.example', '+44 20 7946 0000', TRUE)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.rate_cards (id, account_id, name, currency, effective_from)
  VALUES (v_card, v_account, '2026 standard', 'USD', DATE '2026-01-01')
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.rate_card_lines (id, rate_card_id, role_name, unit, rate)
  VALUES ('a1584001-0000-4000-8000-000000000004', v_card, 'Consultant', 'hour', 150)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.project_billing_settings (project_id, client_id, rate_card_id, billable_default, markup_percent, contract_value, currency)
  VALUES (v_project, v_client, v_card, TRUE, 10, 120000, 'USD')
  ON CONFLICT (project_id) DO UPDATE SET
    client_id = COALESCE(public.project_billing_settings.client_id, EXCLUDED.client_id),
    rate_card_id = COALESCE(public.project_billing_settings.rate_card_id, EXCLUDED.rate_card_id),
    contract_value = COALESCE(public.project_billing_settings.contract_value, EXCLUDED.contract_value);

  INSERT INTO public.billing_schedule_lines (id, project_id, description, basis, amount, due_date, status)
  VALUES ('a1584001-0000-4000-8000-000000000006', v_project, 'Mobilisation', 'date', 25000, DATE '2026-12-01', 'open')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.client_invoices (
    id, account_id, client_id, project_id, invoice_reference, status, invoice_date, due_date,
    currency, exchange_rate, net_amount, tax_amount, gross_amount, amount_paid, approval_notes, issued_at
  ) VALUES
    (v_overdue, v_account, v_client, v_project, '', 'issued', DATE '2026-01-15', DATE '2026-02-14', 'USD', 1, 1500, 300, 1800, 0, 'Sample: checked against the approved time.', NOW()),
    (v_part, v_account, v_client, v_project, '', 'issued', DATE '2026-10-01', DATE '2026-12-31', 'USD', 1, 1000, 200, 1200, 600, 'Sample: part of this invoice has been received.', NOW()),
    (v_draft, v_account, v_client, v_project, '', 'draft', DATE '2026-11-01', DATE '2026-12-01', 'USD', 1, 450, 90, 540, 0, NULL, NULL)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.client_invoice_lines (id, invoice_id, source, description, quantity, unit, rate, amount, tax_code_id, tax_amount) VALUES
    ('a1584001-0000-4000-8000-000000000021', v_overdue, 'manual', 'Consulting time, January', 10, 'hour', 150, 1500, v_tax, 300),
    ('a1584001-0000-4000-8000-000000000022', v_part, 'manual', 'Design review', 8, 'hour', 125, 1000, v_tax, 200),
    ('a1584001-0000-4000-8000-000000000023', v_draft, 'manual', 'Support time still in draft', 3, 'hour', 150, 450, v_tax, 90)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.client_payments (id, invoice_id, paid_on, amount, method, reference)
  VALUES ('a1584001-0000-4000-8000-000000000031', v_part, DATE '2026-10-20', 600, 'Bank transfer', 'SAMPLE-PAY-1')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.invoice_document_settings (account_id, payment_instructions, footer)
  SELECT v_account, 'Pay Example Bank, account 00000000, quoting the invoice number.', 'Thank you.'
  WHERE NOT EXISTS (SELECT 1 FROM public.invoice_document_settings WHERE account_id = v_account);

  INSERT INTO public.currency_exchange_rates (account_id, from_currency, to_currency, effective_date, rate)
  VALUES (v_account, 'GBP', 'USD', DATE '2026-01-01', 1.270000)
  ON CONFLICT (account_id, from_currency, to_currency, effective_date) DO NOTHING;

  RAISE NOTICE 'v1584 platform sample billing rows are in place for SEED334-PRJ-08';
END $$;

DO $$
DECLARE
  v_project UUID;
  v_user UUID;
  v_client UUID;
  v_tax UUID := 'a1584002-0000-4000-8000-000000000001';
BEGIN
  SELECT id, user_id INTO v_project, v_user FROM sim.practice_projects ORDER BY created_at LIMIT 1;
  IF v_project IS NULL THEN
    RAISE NOTICE 'SKIP v1584 simulator — no practice project';
    RETURN;
  END IF;

  SELECT id INTO v_client FROM sim.clients
   WHERE name = 'Example Freight Ltd' AND user_id = v_user AND COALESCE(is_deleted, FALSE) = FALSE
   LIMIT 1;
  IF v_client IS NULL THEN
    INSERT INTO sim.clients (user_id, client_reference, name, kind, billing_address, currency, payment_terms_days, notes)
    VALUES (v_user, '', 'Example Freight Ltd', 'external', '1 Example Wharf, London', 'USD', 30, 'Practice client. Not a real invoice.')
    RETURNING id INTO v_client;
  END IF;

  INSERT INTO sim.tax_codes (id, user_id, code, label, rate_percent, kind, is_default)
  VALUES (v_tax, v_user, 'VAT20', 'VAT 20%', 20, 'standard', TRUE)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO sim.client_invoices (
    id, user_id, client_id, project_id, invoice_reference, status, invoice_date, due_date,
    currency, exchange_rate, net_amount, tax_amount, gross_amount, amount_paid, approval_notes, issued_at
  ) VALUES (
    'a1584002-0000-4000-8000-000000000011', v_user, v_client, v_project, '', 'issued',
    DATE '2026-01-15', DATE '2026-02-14', 'USD', 1, 1500, 300, 1800, 0,
    'Practice sample. Not sent to a real client.', NOW()
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO sim.client_invoice_lines (id, invoice_id, source, description, quantity, unit, rate, amount, tax_code_id, tax_amount)
  VALUES ('a1584002-0000-4000-8000-000000000021', 'a1584002-0000-4000-8000-000000000011', 'manual', 'Practice consulting time', 10, 'hour', 150, 1500, v_tax, 300)
  ON CONFLICT (id) DO NOTHING;

  RAISE NOTICE 'v1584 simulator sample invoice is in place';
END $$;

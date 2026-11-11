-- ============================================================================
-- v1333: Product Takeover — one section per product in scope, with its Data Scope details
-- ============================================================================
-- Owner request 2026-10-24: the Data Migration Strategy's Product Takeover section must show each
-- product's actual takeover details (heading, introduction, rule bullets — like "LD Loans and Past
-- Dues", "AC accounts", "Accounts Dormancy and Inactivity" in a strategy document), not a bare list
-- of product names.
--
--   1. "Product Takeover Details" (linked records, v1332) is matched to the strategy's
--      "Banking & Financial Products in Scope" through Data Scope's "Product / Data Area":
--      the exports show one sub-section per selected product, in the order selected (a product with
--      no Data Scope record yet gets a short "not captured yet" note), and the bare product list is
--      left out of the exports (it stays on the form).
--   2. Order on the Product Takeover tab: products, approach, product details, then the two Yes/No
--      checks — so the product sections follow the approach directly.
-- Prerequisites: v1317, v1332. Idempotent.
-- ============================================================================

UPDATE public.local_register_fields f
SET dropdown_options = '[{"value":"fin_data_scope","label":"Data Scope","match_field":"products_in_scope","source_field":"product_area"}]'::jsonb,
    updated_at = NOW()
FROM public.local_registers lr
WHERE lr.id = f.register_id
  AND lr.register_key = 'fin_migration_strategy'
  AND f.field_key = 'product_takeover_details';

UPDATE public.local_register_fields f
SET display_order = v.display_order,
    updated_at = NOW()
FROM public.local_registers lr,
  (VALUES
    ('products_in_scope', 34),
    ('product_takeover_approach', 35),
    ('product_takeover_details', 36),
    ('balance_reconciliation_by_product', 37),
    ('product_owner_signoff_required', 38)
  ) AS v(field_key, display_order)
WHERE lr.id = f.register_id
  AND lr.register_key = 'fin_migration_strategy'
  AND f.field_key = v.field_key;

NOTIFY pgrst, 'reload schema';

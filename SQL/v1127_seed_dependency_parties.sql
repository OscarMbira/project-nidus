-- ============================================================================
-- v1127: Sample dependency parties (10 names per organisation)
-- ============================================================================
-- Run after v1125. If the first v1125 (without party_kind) already ran, run
-- v1126 first.
--
-- Inserts five internal and five external parties for every active account.
-- Safe to run again: a name already on that account is left as it is.
-- ============================================================================

INSERT INTO public.external_dependency_items (account_id, item_name, party_kind)
SELECT a.id, s.item_name, s.party_kind
FROM public.accounts a
CROSS JOIN (
  VALUES
    ('Finance Department', 'internal'),
    ('Legal and Compliance', 'internal'),
    ('IT Operations', 'internal'),
    ('Executive Steering Group', 'internal'),
    ('Internal Audit', 'internal'),
    ('Planning Authority', 'external'),
    ('Primary Supplier', 'external'),
    ('Regulator', 'external'),
    ('External Auditor', 'external'),
    ('Utility Provider', 'external')
) AS s(item_name, party_kind)
WHERE COALESCE(a.is_deleted, FALSE) = FALSE
  AND NOT EXISTS (
    SELECT 1
    FROM public.external_dependency_items e
    WHERE e.account_id = a.id
      AND lower(btrim(e.item_name)) = lower(s.item_name)
      AND e.is_deleted = FALSE
  );

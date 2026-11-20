-- ============================================================================
-- v1495: Field help — globally familiar, clearly fictional examples (v1345, owner requests 2026-11-20)
-- ============================================================================
-- Two owner rules for every help example:
--   1. Globally familiar places that users anywhere recognise at once (London, Cairo, Dubai,
--      Singapore, New York) rather than locally specific ones.
--   2. Nothing that looks like a real person or a real organisation: use role titles
--      ("Head of Finance") and obviously fictional organisations ("Example Freight Ltd"),
--      to avoid any claim over a name used in the product.
-- This updates the Stakeholder help seeded by v1491. Both rules are in CLAUDE.md rule 76 and
-- the v1345 guide. Idempotent. Prerequisite: v1491.
-- ============================================================================

UPDATE public.field_help h SET examples = v.examples, format_notes = COALESCE(v.format_notes, h.format_notes)
FROM (VALUES
  ('public.stakeholders.stakeholder_name',
   E'- Head of Finance (a person, named by role here)\n- London Branch Operations Team\n- Example Roads Authority, Dubai', NULL),
  ('public.stakeholders.stakeholder_title',
   E'- Head of Retail Banking\n- Compliance Officer', NULL),
  ('public.stakeholders.stakeholder_organization',
   E'- Example Freight Ltd (London)\n- Example Roads Authority (Dubai)', NULL),
  ('public.stakeholders.emails',
   E'- head.of.finance@company.example', NULL),
  ('public.stakeholders.phones',
   E'- +44 20 7946 0123 (London)\n- +971 4 555 0123 (Dubai)', 'Include the country code, e.g. +44 for the UK or +971 for the UAE.'),
  ('public.stakeholders.mobiles',
   E'- +20 100 555 0123 (Cairo)\n- +65 8555 0123 (Singapore)', 'Include the country code, e.g. +20 for Egypt or +65 for Singapore.'),
  ('public.stakeholders.office_location',
   E'- London head office, 3rd floor\n- Cairo regional office\n- Dubai site office', NULL),
  ('public.stakeholders.time_zone',
   E'- Europe/London\n- Africa/Cairo\n- Asia/Dubai', NULL),
  ('public.stakeholders.special_requirements',
   E'- Reports in Arabic and English\n- Wheelchair access for site visits', NULL),
  ('public.stakeholders.assigned_projects',
   E'- Example Core Banking Roll-out\n- Example Mobile Field Inspections', NULL)
) AS v(help_key, examples, format_notes)
WHERE h.help_key = v.help_key AND h.form_key = '' AND h.locale = 'en';

-- Check: no locally specific or real-looking example left in the Stakeholder help
SELECT help_key, examples
FROM public.field_help
WHERE module_code = 'stakeholders'
  AND (examples ~* '(harare|bulawayo|\+263|shona|rutendo|chikwanha|velocity freight|sarah)'
       OR format_notes ~* '\+263')
ORDER BY 1;

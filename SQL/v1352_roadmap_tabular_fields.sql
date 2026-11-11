-- ============================================================================
-- v1352: Technology Roadmap lists as tables (columns you can search and sort)
-- ============================================================================
-- The circled roadmap fields were one Item column. Their saved lines are already
-- "cell – cell" or tab-separated, which the table field reads without rewriting rows.
--   Initiatives            Initiative | Timeframe | Outcome
--   Milestones             Date | Milestone
--   Risks and mitigations  Risk | Mitigation
--   Roles and responsibilities  Role | Name   (saved lines are role – name)
-- Glossary, Appendices and Version History are re-applied on every document register
-- (same columns as v1326) in case v1324 ran afterwards and put them back to one column.
-- Prerequisites: v1324, v1326 (the 'table' field type). Idempotent.
-- Re-run this file if v1324 is applied again.
-- ============================================================================

UPDATE public.local_register_fields f
SET field_type = 'table',
    field_label = v.field_label,
    dropdown_options = v.columns::jsonb,
    updated_at = NOW()
FROM public.local_registers lr,
  (VALUES
    ('initiatives', 'Initiatives',
      '[{"value":"initiative","label":"Initiative"},{"value":"timeframe","label":"Timeframe"},{"value":"outcome","label":"Outcome"}]'),
    ('milestones', 'Milestones',
      '[{"value":"date","label":"Date","type":"date"},{"value":"milestone","label":"Milestone"}]'),
    ('risks_mitigations', 'Risks and mitigations',
      '[{"value":"risk","label":"Risk"},{"value":"mitigation","label":"Mitigation"}]'),
    ('roles_and_responsibilities', 'Roles and responsibilities',
      '[{"value":"role","label":"Role"},{"value":"name","label":"Name"}]')
  ) AS v(field_key, field_label, columns)
WHERE lr.id = f.register_id
  AND lr.register_key = 'ict_technology_roadmap'
  AND f.field_key = v.field_key;

UPDATE public.local_register_fields f
SET field_type = 'table',
    field_label = v.field_label,
    dropdown_options = v.columns::jsonb,
    updated_at = NOW()
FROM public.local_registers lr,
  (VALUES
    ('glossary', 'Glossary of Terms',
      '[{"value":"term","label":"Term"},{"value":"definition","label":"Definition"}]'),
    ('appendices', 'Appendices',
      '[{"value":"title","label":"Title"},{"value":"reference","label":"Reference / Link"}]'),
    ('version_history', 'Version History',
      '[{"value":"version","label":"Version"},{"value":"date","label":"Date","type":"date"},{"value":"author","label":"Author"},{"value":"change","label":"Change"}]')
  ) AS v(field_key, field_label, columns)
WHERE lr.id = f.register_id
  AND lr.is_document = TRUE
  AND f.field_key = v.field_key;

NOTIFY pgrst, 'reload schema';

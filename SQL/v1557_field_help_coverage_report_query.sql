-- ============================================================================
-- v1557: Field-level help — coverage and usefulness report (v1345 slice 5, G-D13 / G-D18)
-- READ-ONLY. Run in the SQL editor as the owner (service role / postgres) to see the report; changes nothing.
--
--   1. Help rows by module (active), largest first.
--   2. Most-opened help (last 90 days), Platform + Simulator events.
--   3. Least helpful help (at least 5 votes, last 180 days): share of "Yes".
--   4. Programme usefulness: share of "Yes" across all votes (target ≥ 80% where votes exist).
-- Code coverage (fields with help vs fields without) comes from `node scripts/check-field-help.mjs`
-- (monorepo) and `node scripts/check-field-help.mjs` in the Admin repo.
-- ============================================================================

-- 1. Help rows by module
SELECT module_code, COUNT(*) AS help_rows
FROM public.field_help
WHERE is_active
GROUP BY module_code
ORDER BY help_rows DESC, module_code;

-- 2. Most-opened help, last 90 days (both apps)
WITH ev AS (
  SELECT help_key, event_type, created_at, 'platform' AS app FROM public.field_help_events
  UNION ALL
  SELECT help_key, event_type, created_at, 'simulator' AS app FROM sim.field_help_events
)
SELECT help_key, COUNT(*) FILTER (WHERE app = 'platform') AS platform_opens,
       COUNT(*) FILTER (WHERE app = 'simulator') AS simulator_opens, COUNT(*) AS total_opens
FROM ev
WHERE event_type = 'open' AND created_at >= NOW() - INTERVAL '90 days'
GROUP BY help_key
ORDER BY total_opens DESC
LIMIT 50;

-- 3. Least helpful help (at least 5 votes in 180 days)
WITH ev AS (
  SELECT help_key, event_type, created_at FROM public.field_help_events
  UNION ALL
  SELECT help_key, event_type, created_at FROM sim.field_help_events
)
SELECT help_key,
       COUNT(*) FILTER (WHERE event_type = 'helpful_yes') AS yes_votes,
       COUNT(*) FILTER (WHERE event_type = 'helpful_no') AS no_votes,
       ROUND(100.0 * COUNT(*) FILTER (WHERE event_type = 'helpful_yes')
             / NULLIF(COUNT(*) FILTER (WHERE event_type IN ('helpful_yes', 'helpful_no')), 0), 1) AS percent_yes
FROM ev
WHERE event_type IN ('helpful_yes', 'helpful_no') AND created_at >= NOW() - INTERVAL '180 days'
GROUP BY help_key
HAVING COUNT(*) >= 5
ORDER BY percent_yes ASC, no_votes DESC
LIMIT 50;

-- 4. Programme usefulness (all votes)
WITH ev AS (
  SELECT event_type FROM public.field_help_events
  UNION ALL
  SELECT event_type FROM sim.field_help_events
)
SELECT COUNT(*) FILTER (WHERE event_type = 'helpful_yes') AS yes_votes,
       COUNT(*) FILTER (WHERE event_type = 'helpful_no') AS no_votes,
       ROUND(100.0 * COUNT(*) FILTER (WHERE event_type = 'helpful_yes')
             / NULLIF(COUNT(*) FILTER (WHERE event_type IN ('helpful_yes', 'helpful_no')), 0), 1) AS percent_yes
FROM ev;

-- ============================================================================
-- v1315 tests: public.lr_cf_build_rules (v1314). Pure function — reads and writes no data.
--
--   R1  required flag always present; empty settings → only {required}
--   R2  number min/max/default; min > max refused; default outside range refused
--   R3  text length + allowed characters preset → LDE pattern + message
--   R4  custom allowed characters are escaped inside the character class
--   R5  date earliest/latest + 'today' default; invalid date refused
--   R6  dropdown default given as label → stored as option value; unknown option refused
--   R7  multi-select defaults ⊂ options; min/max items
--   R8  keys that do not fit the type are dropped (e.g. min on a text field)
--   R9  client-supplied pattern is ignored
-- ============================================================================

CREATE TEMP TABLE IF NOT EXISTS v1315_results (test TEXT PRIMARY KEY, passed BOOLEAN, detail TEXT);
TRUNCATE v1315_results;

DO $$
DECLARE
  v   JSONB;
  err TEXT;
  FUNCTION_OK BOOLEAN := to_regprocedure('public.lr_cf_build_rules(text, boolean, jsonb, jsonb)') IS NOT NULL;
BEGIN
  IF NOT FUNCTION_OK THEN
    INSERT INTO v1315_results VALUES ('R0 function exists', FALSE, 'run v1314 first');
    RETURN;
  END IF;

  -- R1
  v := public.lr_cf_build_rules('text', TRUE, '{}'::jsonb, '[]'::jsonb);
  INSERT INTO v1315_results VALUES ('R1 required only', v = '{"required": true}'::jsonb, v::text);

  -- R2
  v := public.lr_cf_build_rules('number', FALSE, '{"min": "1", "max": 10, "defaultValue": "5"}'::jsonb, '[]'::jsonb);
  BEGIN
    PERFORM public.lr_cf_build_rules('number', FALSE, '{"min": 10, "max": 1}'::jsonb, '[]'::jsonb); err := NULL;
  EXCEPTION WHEN OTHERS THEN err := SQLERRM; END;
  INSERT INTO v1315_results VALUES ('R2 number range + default',
    (v ->> 'min')::numeric = 1 AND (v ->> 'max')::numeric = 10 AND (v ->> 'defaultValue')::numeric = 5
    AND err LIKE 'Minimum value cannot be greater%', v::text || ' / ' || COALESCE(err, ''));
  BEGIN
    PERFORM public.lr_cf_build_rules('number', FALSE, '{"min": 1, "max": 10, "defaultValue": 50}'::jsonb, '[]'::jsonb); err := NULL;
  EXCEPTION WHEN OTHERS THEN err := SQLERRM; END;
  INSERT INTO v1315_results VALUES ('R2b default outside range refused', err LIKE 'Default value must be within%', err);

  -- R3
  v := public.lr_cf_build_rules('text', FALSE, '{"minLength": 2, "maxLength": 20, "allowedCharacters": "reference"}'::jsonb, '[]'::jsonb);
  INSERT INTO v1315_results VALUES ('R3 text length + reference characters',
    (v ->> 'minLength')::int = 2 AND (v ->> 'maxLength')::int = 20
    AND v ->> 'pattern' = '^[A-Za-z0-9._/-]*$' AND v ->> 'allowedCharacters' = 'reference'
    AND 'AB-12/x.y' ~ (v ->> 'pattern') AND NOT ('AB 12' ~ (v ->> 'pattern')), v::text);

  -- R4
  v := public.lr_cf_build_rules('text', FALSE, '{"allowedCharacters": "custom", "allowedCharactersCustom": "AB-]^\\"}'::jsonb, '[]'::jsonb);
  INSERT INTO v1315_results VALUES ('R4 custom characters escaped',
    v ->> 'pattern' = '^[AB\-\]\^\\]*$' AND 'A-]^\B' ~ (v ->> 'pattern') AND NOT ('C' ~ (v ->> 'pattern')), v ->> 'pattern');

  -- R5
  v := public.lr_cf_build_rules('date', FALSE, '{"minDate": "2026-01-01", "maxDate": "2026-12-31", "defaultValue": "today"}'::jsonb, '[]'::jsonb);
  BEGIN
    PERFORM public.lr_cf_build_rules('date', FALSE, '{"minDate": "2026-02-30"}'::jsonb, '[]'::jsonb); err := NULL;
  EXCEPTION WHEN OTHERS THEN err := SQLERRM; END;
  INSERT INTO v1315_results VALUES ('R5 dates + today default',
    v ->> 'minDate' = '2026-01-01' AND v ->> 'maxDate' = '2026-12-31' AND v ->> 'defaultValue' = 'today'
    AND err LIKE '%not a valid date%', v::text || ' / ' || COALESCE(err, ''));

  -- R6
  v := public.lr_cf_build_rules('dropdown', FALSE, '{"defaultValue": "Very High"}'::jsonb, '["Low", "Very High"]'::jsonb);
  BEGIN
    PERFORM public.lr_cf_build_rules('dropdown', FALSE, '{"defaultValue": "Medium"}'::jsonb, '["Low", "High"]'::jsonb); err := NULL;
  EXCEPTION WHEN OTHERS THEN err := SQLERRM; END;
  INSERT INTO v1315_results VALUES ('R6 dropdown default → option value',
    v ->> 'defaultValue' = 'very_high' AND err LIKE 'Default value must be one of the options%', v::text);

  -- R7
  v := public.lr_cf_build_rules('multi_select', FALSE, '{"defaultValue": ["Branch", "Mobile"], "minItems": 1, "maxItems": 3}'::jsonb,
                                '["Branch", "Mobile", "ATM"]'::jsonb);
  INSERT INTO v1315_results VALUES ('R7 multi-select defaults + items',
    v -> 'defaultValue' @> '["branch", "mobile"]'::jsonb AND (v ->> 'minItems')::int = 1 AND (v ->> 'maxItems')::int = 3, v::text);

  -- R8 + R9
  v := public.lr_cf_build_rules('text', FALSE, '{"min": 1, "minDate": "2026-01-01", "pattern": ".*", "minItems": 2}'::jsonb, '[]'::jsonb);
  INSERT INTO v1315_results VALUES ('R8/R9 unrelated keys and client pattern dropped', v = '{"required": false}'::jsonb, v::text);
END $$;

SELECT test, passed, detail FROM v1315_results ORDER BY test;

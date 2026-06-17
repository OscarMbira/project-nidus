-- =============================================================================
-- v706: Fix generate_risk_identifier – wrong SUBSTRING offset
-- Root cause (v172): SUBSTRING(risk_identifier FROM 6) was used to extract the
-- sequence number from identifiers like 'R-2026-001'.  Position 6 lands inside
-- the year ('6' in '2026'), so the extracted string is '6-001' which cannot be
-- cast to INTEGER.
-- Fix: use SPLIT_PART(risk_identifier, '-', 3) which correctly extracts the
-- third dash-delimited segment ('001') regardless of year length.
-- =============================================================================

CREATE OR REPLACE FUNCTION generate_risk_identifier(p_risk_register_id UUID)
RETURNS VARCHAR AS $$
DECLARE
    v_year     INTEGER;
    v_sequence INTEGER;
    v_reference VARCHAR(50);
BEGIN
    v_year := EXTRACT(YEAR FROM CURRENT_DATE);

    -- Use SPLIT_PART to get the 3rd segment of 'R-YYYY-NNN' safely.
    -- SUBSTRING(... FROM 6) was wrong: for 'R-2026-001' it returned '6-001'.
    SELECT COALESCE(
        MAX(
            NULLIF(SPLIT_PART(risk_identifier, '-', 3), '')::INTEGER
        ), 0
    ) + 1
    INTO v_sequence
    FROM risks
    WHERE risk_register_id = p_risk_register_id
      AND risk_identifier LIKE 'R-' || v_year || '-%'
      AND is_deleted = FALSE;

    v_reference := 'R-' || v_year || '-' || LPAD(v_sequence::TEXT, 3, '0');
    RETURN v_reference;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_risk_identifier(UUID) IS
  'v706 fix: generates next risk identifier (R-YYYY-NNN) for a register. '
  'Uses SPLIT_PART instead of SUBSTRING to correctly extract the sequence number.';

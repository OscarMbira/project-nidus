-- ============================================================================
-- PM Simulator Custom Scenario Enhancements
-- Version: v76
-- Description: Enhancements for custom scenario upload, NLP extraction, validation, and sharing
-- ============================================================================

-- Add quality score column to custom scenarios
ALTER TABLE sim.custom_scenarios 
ADD COLUMN IF NOT EXISTS quality_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS quality_feedback TEXT,
ADD COLUMN IF NOT EXISTS extraction_metadata JSONB DEFAULT '{}';

-- Create storage bucket for scenario documents (run this in Supabase dashboard or via API)
-- CREATE BUCKET IF NOT EXISTS scenario-documents;

-- Function to calculate scenario quality score
CREATE OR REPLACE FUNCTION sim.calculate_scenario_quality_score(scenario_id_param UUID)
RETURNS INTEGER AS $$
DECLARE
  scenario_record RECORD;
  score INTEGER := 0;
  max_score INTEGER := 100;
  extracted_data JSONB;
BEGIN
  SELECT * INTO scenario_record
  FROM sim.custom_scenarios
  WHERE id = scenario_id_param;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  extracted_data := COALESCE(scenario_record.extracted_data, '{}'::jsonb);

  -- Required fields check (40 points)
  IF scenario_record.name IS NOT NULL AND scenario_record.name != '' THEN
    score := score + 8;
  END IF;
  
  IF scenario_record.description IS NOT NULL AND scenario_record.description != '' THEN
    score := score + 8;
  END IF;
  
  IF extracted_data->>'industry' IS NOT NULL THEN
    score := score + 8;
  END IF;
  
  IF extracted_data->>'methodology' IS NOT NULL THEN
    score := score + 8;
  END IF;
  
  IF extracted_data->>'difficulty_level' IS NOT NULL THEN
    score := score + 8;
  END IF;

  -- Description quality (20 points)
  IF LENGTH(COALESCE(scenario_record.description, '')) > 200 THEN
    score := score + 20;
  ELSIF LENGTH(COALESCE(scenario_record.description, '')) > 100 THEN
    score := score + 15;
  ELSIF LENGTH(COALESCE(scenario_record.description, '')) > 50 THEN
    score := score + 10;
  END IF;

  -- Learning objectives (20 points)
  IF jsonb_array_length(COALESCE(extracted_data->'learning_objectives', '[]'::jsonb)) >= 5 THEN
    score := score + 20;
  ELSIF jsonb_array_length(COALESCE(extracted_data->'learning_objectives', '[]'::jsonb)) >= 3 THEN
    score := score + 15;
  ELSIF jsonb_array_length(COALESCE(extracted_data->'learning_objectives', '[]'::jsonb)) >= 1 THEN
    score := score + 10;
  END IF;

  -- Skills covered (20 points)
  IF jsonb_array_length(COALESCE(extracted_data->'skills_covered', '[]'::jsonb)) >= 5 THEN
    score := score + 20;
  ELSIF jsonb_array_length(COALESCE(extracted_data->'skills_covered', '[]'::jsonb)) >= 3 THEN
    score := score + 15;
  ELSIF jsonb_array_length(COALESCE(extracted_data->'skills_covered', '[]'::jsonb)) >= 1 THEN
    score := score + 10;
  END IF;

  RETURN LEAST(score, max_score);
END;
$$ LANGUAGE plpgsql;

-- Function to validate custom scenario structure
CREATE OR REPLACE FUNCTION sim.validate_scenario_structure(scenario_id_param UUID)
RETURNS JSONB AS $$
DECLARE
  scenario_record RECORD;
  errors JSONB := '[]'::jsonb;
  extracted_data JSONB;
BEGIN
  SELECT * INTO scenario_record
  FROM sim.custom_scenarios
  WHERE id = scenario_id_param;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('isValid', false, 'errors', jsonb_build_array('Scenario not found'));
  END IF;

  extracted_data := COALESCE(scenario_record.extracted_data, '{}'::jsonb);

  -- Check required fields
  IF scenario_record.name IS NULL OR scenario_record.name = '' THEN
    errors := errors || '"Name is required"'::jsonb;
  END IF;

  IF scenario_record.description IS NULL OR scenario_record.description = '' THEN
    errors := errors || '"Description is required"'::jsonb;
  END IF;

  IF extracted_data->>'industry' IS NULL THEN
    errors := errors || '"Industry is required"'::jsonb;
  END IF;

  IF extracted_data->>'methodology' IS NULL THEN
    errors := errors || '"Methodology is required"'::jsonb;
  END IF;

  IF extracted_data->>'difficulty_level' IS NULL THEN
    errors := errors || '"Difficulty level is required"'::jsonb;
  END IF;

  -- Check description length
  IF LENGTH(COALESCE(scenario_record.description, '')) < 50 THEN
    errors := errors || '"Description must be at least 50 characters"'::jsonb;
  END IF;

  -- Check learning objectives
  IF jsonb_array_length(COALESCE(extracted_data->'learning_objectives', '[]'::jsonb)) = 0 THEN
    errors := errors || '"At least one learning objective is required"'::jsonb;
  END IF;

  -- Check skills covered
  IF jsonb_array_length(COALESCE(extracted_data->'skills_covered', '[]'::jsonb)) = 0 THEN
    errors := errors || '"At least one skill must be covered"'::jsonb;
  END IF;

  RETURN jsonb_build_object(
    'isValid', jsonb_array_length(errors) = 0,
    'errors', errors
  );
END;
$$ LANGUAGE plpgsql;

-- Trigger to update quality score when scenario is updated
CREATE OR REPLACE FUNCTION sim.update_scenario_quality_score()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.extracted_data IS DISTINCT FROM OLD.extracted_data OR
     NEW.description IS DISTINCT FROM OLD.description OR
     NEW.name IS DISTINCT FROM OLD.name THEN
    NEW.quality_score := sim.calculate_scenario_quality_score(NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_scenario_quality_score
  BEFORE UPDATE ON sim.custom_scenarios
  FOR EACH ROW
  EXECUTE FUNCTION sim.update_scenario_quality_score();

-- Index for public scenarios
CREATE INDEX IF NOT EXISTS idx_custom_scenarios_public 
ON sim.custom_scenarios(is_public, is_approved, quality_score DESC)
WHERE is_public = true AND is_approved = true;

-- Index for user scenarios
CREATE INDEX IF NOT EXISTS idx_custom_scenarios_user 
ON sim.custom_scenarios(user_id, created_at DESC);

-- Index for validation status
CREATE INDEX IF NOT EXISTS idx_custom_scenarios_validation 
ON sim.custom_scenarios(validation_status)
WHERE validation_status IN ('pending', 'processing');

-- View for public scenario marketplace
CREATE OR REPLACE VIEW sim.public_scenario_marketplace AS
SELECT
  cs.id,
  cs.name,
  cs.description,
  cs.extracted_data->>'industry' AS industry,
  cs.extracted_data->>'methodology' AS methodology,
  cs.extracted_data->>'difficulty_level' AS difficulty_level,
  cs.quality_score,
  cs.rating,
  cs.ratings_count,
  cs.downloads,
  cs.created_at,
  u.email AS creator_email,
  u.raw_user_meta_data->>'full_name' AS creator_name
FROM sim.custom_scenarios cs
JOIN auth.users u ON u.id = cs.user_id
WHERE cs.is_public = true
  AND cs.is_approved = true
  AND cs.validation_status = 'valid'
ORDER BY cs.quality_score DESC, cs.rating DESC, cs.downloads DESC;

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE 'Custom scenario enhancements created successfully';
  RAISE NOTICE 'Use sim.calculate_scenario_quality_score() to calculate quality';
  RAISE NOTICE 'Use sim.validate_scenario_structure() to validate scenarios';
  RAISE NOTICE 'View sim.public_scenario_marketplace for public scenarios';
END $$;


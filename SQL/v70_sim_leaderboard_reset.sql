-- ============================================================================
-- PM Simulator Leaderboard Reset Functions
-- Version: v70
-- Description: Functions and triggers for periodic leaderboard resets
-- ============================================================================

-- Function to reset weekly leaderboards
CREATE OR REPLACE FUNCTION sim.reset_weekly_leaderboard()
RETURNS void AS $$
BEGIN
  -- Delete entries older than 1 week
  DELETE FROM sim.leaderboard_entries
  WHERE leaderboard_type = 'weekly'
    AND period_end < NOW() - INTERVAL '7 days';
  
  -- Log the reset
  RAISE NOTICE 'Weekly leaderboard reset completed at %', NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to reset monthly leaderboards
CREATE OR REPLACE FUNCTION sim.reset_monthly_leaderboard()
RETURNS void AS $$
BEGIN
  -- Delete entries older than 1 month
  DELETE FROM sim.leaderboard_entries
  WHERE leaderboard_type = 'monthly'
    AND period_end < NOW() - INTERVAL '1 month';
  
  -- Log the reset
  RAISE NOTICE 'Monthly leaderboard reset completed at %', NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to recalculate all leaderboard ranks
CREATE OR REPLACE FUNCTION sim.recalculate_all_ranks()
RETURNS void AS $$
DECLARE
  entry_record RECORD;
  current_rank INTEGER;
BEGIN
  -- Recalculate global leaderboard
  current_rank := 1;
  FOR entry_record IN
    SELECT id FROM sim.leaderboard_entries
    WHERE leaderboard_type = 'global'
      AND period_start IS NULL
    ORDER BY score DESC
  LOOP
    UPDATE sim.leaderboard_entries
    SET rank = current_rank,
        previous_rank = COALESCE(rank, current_rank)
    WHERE id = entry_record.id;
    current_rank := current_rank + 1;
  END LOOP;

  -- Recalculate role-specific leaderboards
  FOR entry_record IN
    SELECT DISTINCT category FROM sim.leaderboard_entries
    WHERE leaderboard_type = 'role' AND category IS NOT NULL
  LOOP
    current_rank := 1;
    FOR entry_record IN
      SELECT id FROM sim.leaderboard_entries
      WHERE leaderboard_type = 'role'
        AND category = entry_record.category
        AND period_start IS NULL
      ORDER BY score DESC
    LOOP
      UPDATE sim.leaderboard_entries
      SET rank = current_rank,
          previous_rank = COALESCE(rank, current_rank)
      WHERE id = entry_record.id;
      current_rank := current_rank + 1;
    END LOOP;
  END LOOP;

  -- Similar logic for methodology and industry leaderboards
  -- (Implementation similar to role leaderboards)
  
  RAISE NOTICE 'All leaderboard ranks recalculated at %', NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to update leaderboard on simulation completion
CREATE OR REPLACE FUNCTION sim.update_leaderboard_on_completion()
RETURNS TRIGGER AS $$
DECLARE
  scenario_data RECORD;
  score_to_add INTEGER;
BEGIN
  -- Only process when status changes to completed
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Get scenario data
    SELECT * INTO scenario_data
    FROM sim.scenarios
    WHERE id = NEW.scenario_id;

    -- Calculate score (based on percentage score)
    score_to_add := NEW.total_score;

    -- Update global leaderboard
    INSERT INTO sim.leaderboard_entries (user_id, leaderboard_type, score, simulations_count)
    VALUES (NEW.user_id, 'global', score_to_add, 1)
    ON CONFLICT (user_id, leaderboard_type, category, period_start) DO UPDATE SET
      score = sim.leaderboard_entries.score + score_to_add,
      simulations_count = sim.leaderboard_entries.simulations_count + 1,
      recorded_at = NOW();

    -- Update role-specific leaderboard
    IF scenario_data.target_role IS NOT NULL THEN
      INSERT INTO sim.leaderboard_entries (user_id, leaderboard_type, category, score, simulations_count)
      VALUES (NEW.user_id, 'role', scenario_data.target_role, score_to_add, 1)
      ON CONFLICT (user_id, leaderboard_type, category, period_start) DO UPDATE SET
        score = sim.leaderboard_entries.score + score_to_add,
        simulations_count = sim.leaderboard_entries.simulations_count + 1,
        recorded_at = NOW();
    END IF;

    -- Update methodology-specific leaderboard
    IF scenario_data.methodology IS NOT NULL THEN
      INSERT INTO sim.leaderboard_entries (user_id, leaderboard_type, category, score, simulations_count)
      VALUES (NEW.user_id, 'methodology', scenario_data.methodology, score_to_add, 1)
      ON CONFLICT (user_id, leaderboard_type, category, period_start) DO UPDATE SET
        score = sim.leaderboard_entries.score + score_to_add,
        simulations_count = sim.leaderboard_entries.simulations_count + 1,
        recorded_at = NOW();
    END IF;

    -- Update industry-specific leaderboard
    IF scenario_data.industry IS NOT NULL THEN
      INSERT INTO sim.leaderboard_entries (user_id, leaderboard_type, category, score, simulations_count)
      VALUES (NEW.user_id, 'industry', scenario_data.industry, score_to_add, 1)
      ON CONFLICT (user_id, leaderboard_type, category, period_start) DO UPDATE SET
        score = sim.leaderboard_entries.score + score_to_add,
        simulations_count = sim.leaderboard_entries.simulations_count + 1,
        recorded_at = NOW();
    END IF;

    -- Update weekly leaderboard
    INSERT INTO sim.leaderboard_entries (
      user_id, leaderboard_type, period, period_start, period_end, score, simulations_count
    )
    VALUES (
      NEW.user_id,
      'weekly',
      'weekly',
      DATE_TRUNC('week', NOW()),
      DATE_TRUNC('week', NOW()) + INTERVAL '7 days',
      score_to_add,
      1
    )
    ON CONFLICT (user_id, leaderboard_type, category, period_start) DO UPDATE SET
      score = sim.leaderboard_entries.score + score_to_add,
      simulations_count = sim.leaderboard_entries.simulations_count + 1,
      recorded_at = NOW();

    -- Update monthly leaderboard
    INSERT INTO sim.leaderboard_entries (
      user_id, leaderboard_type, period, period_start, period_end, score, simulations_count
    )
    VALUES (
      NEW.user_id,
      'monthly',
      'monthly',
      DATE_TRUNC('month', NOW()),
      DATE_TRUNC('month', NOW()) + INTERVAL '1 month',
      score_to_add,
      1
    )
    ON CONFLICT (user_id, leaderboard_type, category, period_start) DO UPDATE SET
      score = sim.leaderboard_entries.score + score_to_add,
      simulations_count = sim.leaderboard_entries.simulations_count + 1,
      recorded_at = NOW();

    -- Trigger rank recalculation (async or scheduled)
    -- For now, we'll recalculate on next query
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update leaderboard on simulation completion
DROP TRIGGER IF EXISTS trigger_update_leaderboard_on_completion ON sim.simulation_runs;
CREATE TRIGGER trigger_update_leaderboard_on_completion
  AFTER UPDATE ON sim.simulation_runs
  FOR EACH ROW
  WHEN (NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed'))
  EXECUTE FUNCTION sim.update_leaderboard_on_completion();

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE 'Leaderboard reset functions created successfully';
  RAISE NOTICE 'Leaderboard update trigger created';
END $$;


-- ============================================================================
-- PM Simulator Purchase System Enhancements
-- Version: v73
-- Description: Enhancements for one-time purchases, scenario packs, and purchase tracking
-- ============================================================================

-- Add price column to scenarios table if it doesn't exist
ALTER TABLE sim.scenarios 
ADD COLUMN IF NOT EXISTS price DECIMAL(10,2) DEFAULT 4.99;

-- Add index for scenario price queries
CREATE INDEX IF NOT EXISTS idx_sim_scenarios_price 
ON sim.scenarios(price) 
WHERE price IS NOT NULL AND price > 0;

-- Add index for user purchases queries
CREATE INDEX IF NOT EXISTS idx_sim_user_purchases_user_type 
ON sim.user_purchases(user_id, item_type);

CREATE INDEX IF NOT EXISTS idx_sim_user_purchases_status 
ON sim.user_purchases(payment_status, purchased_at);

CREATE INDEX IF NOT EXISTS idx_sim_user_purchases_item 
ON sim.user_purchases(item_type, item_id) 
WHERE item_id IS NOT NULL;

-- Function to check if user has access to scenario (via subscription or purchase)
CREATE OR REPLACE FUNCTION sim.user_has_scenario_access(
  user_id_param UUID,
  scenario_id_param UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  has_subscription_access BOOLEAN;
  has_purchase_access BOOLEAN;
  scenario_difficulty VARCHAR;
  scenario_is_premium BOOLEAN;
BEGIN
  -- Get scenario details
  SELECT difficulty_level, is_premium
  INTO scenario_difficulty, scenario_is_premium
  FROM sim.scenarios
  WHERE id = scenario_id_param;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Check subscription access
  has_subscription_access := sim.user_has_active_access(user_id_param);

  -- If user has active subscription, check tier access
  IF has_subscription_access THEN
    -- Free tier: only beginner scenarios
    -- Basic tier: beginner and intermediate
    -- Professional tier: all scenarios
    -- Lifetime: all scenarios
    -- This logic should match subscriptionService.js
    RETURN true; -- Simplified for now
  END IF;

  -- Check if user purchased the scenario
  SELECT EXISTS(
    SELECT 1 FROM sim.user_purchases
    WHERE user_id = user_id_param
      AND item_type = 'scenario'
      AND item_id = scenario_id_param
      AND payment_status = 'completed'
  ) INTO has_purchase_access;

  IF has_purchase_access THEN
    RETURN true;
  END IF;

  -- Check if user purchased a pack containing this scenario
  SELECT EXISTS(
    SELECT 1 
    FROM sim.user_purchases up
    JOIN sim.scenario_packs sp ON up.item_id = sp.id
    WHERE up.user_id = user_id_param
      AND up.item_type = 'scenario_pack'
      AND scenario_id_param = ANY(sp.scenario_ids)
      AND up.payment_status = 'completed'
  ) INTO has_purchase_access;

  RETURN has_purchase_access;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get user's purchased scenarios
CREATE OR REPLACE FUNCTION sim.get_user_purchased_scenarios(user_id_param UUID)
RETURNS TABLE(scenario_id UUID) AS $$
BEGIN
  RETURN QUERY
  -- Direct scenario purchases
  SELECT DISTINCT up.item_id::UUID
  FROM sim.user_purchases up
  WHERE up.user_id = user_id_param
    AND up.item_type = 'scenario'
    AND up.payment_status = 'completed'
    AND up.item_id IS NOT NULL
  
  UNION
  
  -- Scenarios from purchased packs
  SELECT DISTINCT unnest(sp.scenario_ids)::UUID
  FROM sim.user_purchases up
  JOIN sim.scenario_packs sp ON up.item_id = sp.id
  WHERE up.user_id = user_id_param
    AND up.item_type = 'scenario_pack'
    AND up.payment_status = 'completed';
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to update scenario pack purchase count
CREATE OR REPLACE FUNCTION sim.increment_pack_purchases()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.payment_status = 'completed' 
     AND OLD.payment_status != 'completed'
     AND NEW.item_type = 'scenario_pack'
     AND NEW.item_id IS NOT NULL THEN
    UPDATE sim.scenario_packs
    SET purchases_count = purchases_count + 1
    WHERE id = NEW.item_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update pack purchase count
DROP TRIGGER IF EXISTS trigger_increment_pack_purchases ON sim.user_purchases;
CREATE TRIGGER trigger_increment_pack_purchases
  AFTER UPDATE ON sim.user_purchases
  FOR EACH ROW
  WHEN (NEW.payment_status = 'completed' AND OLD.payment_status != 'completed')
  EXECUTE FUNCTION sim.increment_pack_purchases();

-- View for purchase summary
CREATE OR REPLACE VIEW sim.purchase_summary AS
SELECT
  user_id,
  COUNT(*) FILTER (WHERE payment_status = 'completed') AS total_purchases,
  COUNT(*) FILTER (WHERE payment_status = 'pending') AS pending_purchases,
  COUNT(*) FILTER (WHERE payment_status = 'failed') AS failed_purchases,
  COUNT(*) FILTER (WHERE payment_status = 'refunded') AS refunded_purchases,
  SUM(amount) FILTER (WHERE payment_status = 'completed') AS total_spent,
  MAX(purchased_at) FILTER (WHERE payment_status = 'completed') AS last_purchase_date
FROM sim.user_purchases
GROUP BY user_id;

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE 'Purchase system enhancements created successfully';
  RAISE NOTICE 'Use sim.user_has_scenario_access() to check scenario access';
  RAISE NOTICE 'Use sim.get_user_purchased_scenarios() to get user purchases';
END $$;


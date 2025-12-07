-- ============================================================================
-- PM Simulator Subscription Grace Period & Expiration Handling
-- Version: v72
-- Description: Functions and triggers for handling subscription grace periods and expirations
-- ============================================================================

-- Add grace period fields to subscriptions table
ALTER TABLE sim.simulator_subscriptions 
ADD COLUMN IF NOT EXISTS current_period_start TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS grace_period_end TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS grace_period_days INTEGER DEFAULT 7,
ADD COLUMN IF NOT EXISTS is_in_grace_period BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS expiration_notified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN DEFAULT false;

-- Function to check and update subscription status
CREATE OR REPLACE FUNCTION sim.check_subscription_status()
RETURNS void AS $$
DECLARE
  sub_record RECORD;
  now_timestamp TIMESTAMP WITH TIME ZONE;
BEGIN
  now_timestamp := NOW();

  -- Process active subscriptions that have expired
  -- Use next_billing_date or expires_at as fallback if current_period_end is not set
  FOR sub_record IN
    SELECT * FROM sim.simulator_subscriptions
    WHERE status = 'active'
      AND is_lifetime = false
      AND (
        current_period_end IS NOT NULL AND current_period_end < now_timestamp
        OR (current_period_end IS NULL AND next_billing_date IS NOT NULL AND next_billing_date < now_timestamp)
        OR (current_period_end IS NULL AND next_billing_date IS NULL AND expires_at IS NOT NULL AND expires_at < now_timestamp)
      )
  LOOP
    -- Check if grace period should start
    IF sub_record.grace_period_end IS NULL THEN
      -- Start grace period
      -- Set current_period_end if not already set
      UPDATE sim.simulator_subscriptions
      SET 
        current_period_start = COALESCE(current_period_start, COALESCE(next_billing_date, expires_at, now_timestamp) - INTERVAL '30 days'),
        current_period_end = COALESCE(current_period_end, COALESCE(next_billing_date, expires_at, now_timestamp)),
        grace_period_end = now_timestamp + (COALESCE(sub_record.grace_period_days, 7) || ' days')::INTERVAL,
        is_in_grace_period = true,
        updated_at = now_timestamp
      WHERE id = sub_record.id;
      
      -- Log grace period start
      RAISE NOTICE 'Grace period started for subscription %', sub_record.id;
    ELSIF sub_record.grace_period_end < now_timestamp THEN
      -- Grace period expired, mark subscription as expired
      UPDATE sim.simulator_subscriptions
      SET 
        status = 'expired',
        expires_at = now_timestamp,
        is_in_grace_period = false,
        updated_at = now_timestamp
      WHERE id = sub_record.id;
      
      -- Log expiration
      RAISE NOTICE 'Subscription % expired after grace period', sub_record.id;
    END IF;
  END LOOP;

  -- Process subscriptions that are past due
  FOR sub_record IN
    SELECT * FROM sim.simulator_subscriptions
    WHERE status = 'past_due'
      AND is_lifetime = false
      AND (
        (current_period_end IS NOT NULL AND current_period_end < now_timestamp - INTERVAL '3 days')
        OR (current_period_end IS NULL AND next_billing_date IS NOT NULL AND next_billing_date < now_timestamp - INTERVAL '3 days')
        OR (current_period_end IS NULL AND next_billing_date IS NULL AND expires_at IS NOT NULL AND expires_at < now_timestamp - INTERVAL '3 days')
      )
  LOOP
    -- Move to expired if past due for more than 3 days
    UPDATE sim.simulator_subscriptions
    SET 
      status = 'expired',
      expires_at = now_timestamp,
      updated_at = now_timestamp
    WHERE id = sub_record.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to restore subscription after payment
CREATE OR REPLACE FUNCTION sim.restore_subscription_from_grace(
  subscription_id UUID,
  new_period_end TIMESTAMP WITH TIME ZONE
)
RETURNS void AS $$
BEGIN
  UPDATE sim.simulator_subscriptions
  SET 
    status = 'active',
    current_period_start = COALESCE(current_period_start, NOW()),
    current_period_end = new_period_end,
    next_billing_date = new_period_end,
    expires_at = NULL,
    grace_period_end = NULL,
    is_in_grace_period = false,
    expiration_notified = false,
    updated_at = NOW()
  WHERE id = subscription_id;
  
  RAISE NOTICE 'Subscription % restored from grace period', subscription_id;
END;
$$ LANGUAGE plpgsql;

-- Function to send expiration notifications
CREATE OR REPLACE FUNCTION sim.send_expiration_notifications()
RETURNS void AS $$
DECLARE
  sub_record RECORD;
  days_until_expiry INTEGER;
BEGIN
  -- Notify subscriptions expiring in 7 days
  FOR sub_record IN
    SELECT * FROM sim.simulator_subscriptions
    WHERE status = 'active'
      AND is_lifetime = false
      AND expiration_notified = false
      AND (
        (current_period_end IS NOT NULL AND current_period_end BETWEEN NOW() AND NOW() + INTERVAL '7 days')
        OR (current_period_end IS NULL AND next_billing_date IS NOT NULL AND next_billing_date BETWEEN NOW() AND NOW() + INTERVAL '7 days')
        OR (current_period_end IS NULL AND next_billing_date IS NULL AND expires_at IS NOT NULL AND expires_at BETWEEN NOW() AND NOW() + INTERVAL '7 days')
      )
  LOOP
    -- Calculate days until expiry using the first available date
    IF sub_record.current_period_end IS NOT NULL THEN
      days_until_expiry := EXTRACT(DAY FROM (sub_record.current_period_end - NOW()));
    ELSIF sub_record.next_billing_date IS NOT NULL THEN
      days_until_expiry := EXTRACT(DAY FROM (sub_record.next_billing_date - NOW()));
    ELSE
      days_until_expiry := EXTRACT(DAY FROM (sub_record.expires_at - NOW()));
    END IF;
    
    -- Mark as notified (in production, would send email here)
    UPDATE sim.simulator_subscriptions
    SET expiration_notified = true
    WHERE id = sub_record.id;
    
    RAISE NOTICE 'Expiration notification sent for subscription % (expires in % days)', 
      sub_record.id, days_until_expiry;
  END LOOP;

  -- Notify subscriptions in grace period
  FOR sub_record IN
    SELECT * FROM sim.simulator_subscriptions
    WHERE is_in_grace_period = true
      AND grace_period_end IS NOT NULL
      AND grace_period_end BETWEEN NOW() AND NOW() + INTERVAL '2 days'
      AND expiration_notified = false
  LOOP
    days_until_expiry := EXTRACT(DAY FROM (sub_record.grace_period_end - NOW()));
    
    -- Mark as notified
    UPDATE sim.simulator_subscriptions
    SET expiration_notified = true
    WHERE id = sub_record.id;
    
    RAISE NOTICE 'Grace period ending notification sent for subscription % (% days remaining)', 
      sub_record.id, days_until_expiry;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to handle subscription renewal
CREATE OR REPLACE FUNCTION sim.renew_subscription(
  subscription_id UUID,
  new_period_end TIMESTAMP WITH TIME ZONE,
  new_billing_date TIMESTAMP WITH TIME ZONE
)
RETURNS void AS $$
BEGIN
  UPDATE sim.simulator_subscriptions
  SET 
    status = 'active',
    current_period_start = NOW(),
    current_period_end = new_period_end,
    next_billing_date = new_billing_date,
    expires_at = NULL,
    grace_period_end = NULL,
    is_in_grace_period = false,
    expiration_notified = false,
    updated_at = NOW()
  WHERE id = subscription_id;
  
  RAISE NOTICE 'Subscription % renewed until %', subscription_id, new_period_end;
END;
$$ LANGUAGE plpgsql;

-- Function to check if user has active access (including grace period)
CREATE OR REPLACE FUNCTION sim.user_has_active_access(user_id_param UUID)
RETURNS BOOLEAN AS $$
DECLARE
  sub_record RECORD;
BEGIN
  SELECT status, is_lifetime, current_period_end, next_billing_date, expires_at, grace_period_end, is_in_grace_period
  INTO sub_record
  FROM sim.simulator_subscriptions
  WHERE user_id = user_id_param
    AND (status = 'active' OR status = 'past_due' OR is_in_grace_period = true)
  ORDER BY created_at DESC
  LIMIT 1;

  -- No subscription found
  IF sub_record.status IS NULL THEN
    RETURN false;
  END IF;

  -- Lifetime subscriptions always have access
  IF sub_record.is_lifetime = true THEN
    RETURN true;
  END IF;

  -- In grace period
  IF sub_record.is_in_grace_period = true AND sub_record.grace_period_end IS NOT NULL AND sub_record.grace_period_end > NOW() THEN
    RETURN true;
  END IF;

  -- Active subscription - check period end
  IF sub_record.status = 'active' THEN
    -- Use current_period_end if available, otherwise fall back to next_billing_date or expires_at
    IF sub_record.current_period_end IS NOT NULL AND sub_record.current_period_end > NOW() THEN
      RETURN true;
    ELSIF sub_record.current_period_end IS NULL AND sub_record.next_billing_date IS NOT NULL AND sub_record.next_billing_date > NOW() THEN
      RETURN true;
    ELSIF sub_record.current_period_end IS NULL AND sub_record.next_billing_date IS NULL AND sub_record.expires_at IS NOT NULL AND sub_record.expires_at > NOW() THEN
      RETURN true;
    END IF;
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql STABLE;

-- Create index for grace period queries
CREATE INDEX IF NOT EXISTS idx_sim_subscriptions_grace_period 
ON sim.simulator_subscriptions(is_in_grace_period, grace_period_end)
WHERE is_in_grace_period = true;

CREATE INDEX IF NOT EXISTS idx_sim_subscriptions_expiring 
ON sim.simulator_subscriptions(expiration_notified)
WHERE status = 'active' AND is_lifetime = false;

CREATE INDEX IF NOT EXISTS idx_sim_subscriptions_period_end 
ON sim.simulator_subscriptions(current_period_end)
WHERE current_period_end IS NOT NULL;

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE 'Subscription grace period and expiration handling functions created successfully';
  RAISE NOTICE 'Run sim.check_subscription_status() periodically to update subscription statuses';
  RAISE NOTICE 'Run sim.send_expiration_notifications() to send expiration warnings';
END $$;


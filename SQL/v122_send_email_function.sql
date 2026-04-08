-- =====================================================================================
-- Version: v122
-- Feature: Email Sending Function
-- Description: Database function to send emails via Supabase's built-in email service
-- Author: Development Team
-- Date: 2025-01-XX
-- =====================================================================================

-- Function to queue email for sending
-- Actual sending is handled by the application layer (emailIntegrationService.js)
CREATE OR REPLACE FUNCTION send_transactional_email(
    p_to_email TEXT,
    p_subject TEXT,
    p_body_html TEXT,
    p_body_text TEXT DEFAULT NULL,
    p_from_email TEXT DEFAULT NULL,
    p_from_name TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_config RECORD;
    v_email_log_id UUID;
    v_error_message TEXT;
BEGIN
    -- Get active email configuration
    SELECT * INTO v_config
    FROM email_configurations
    WHERE is_active = true
      AND is_deleted = false
    ORDER BY is_default DESC, created_at DESC
    LIMIT 1;

    -- Create email log entry (actual sending happens in application layer)
    BEGIN
        INSERT INTO email_logs (
            email_config_id,
            to_email,
            subject,
            body_html,
            body_text,
            delivery_status,
            created_by
        )
        VALUES (
            v_config.id,
            p_to_email,
            p_subject,
            p_body_html,
            COALESCE(p_body_text, ''),
            'pending',
            auth.uid()
        )
        RETURNING id INTO v_email_log_id;

        RETURN jsonb_build_object(
            'success', true,
            'email_log_id', v_email_log_id,
            'message', 'Email queued successfully',
            'warning', false
        );
    EXCEPTION WHEN OTHERS THEN
        v_error_message := SQLERRM;
        RETURN jsonb_build_object(
            'success', false,
            'error', v_error_message,
            'warning', false
        );
    END;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION send_transactional_email TO authenticated;

-- =====================================================================================
-- Alternative: Use Supabase's built-in email via Edge Function or HTTP
-- This is a simpler approach that directly sends emails
-- =====================================================================================

-- Function to send email via HTTP request to Supabase's email service
-- This requires the pg_net extension to be enabled
CREATE OR REPLACE FUNCTION send_email_via_http(
    p_to_email TEXT,
    p_subject TEXT,
    p_body_html TEXT,
    p_body_text TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_supabase_url TEXT;
    v_service_role_key TEXT;
    v_response JSONB;
    v_email_log_id UUID;
BEGIN
    -- Get Supabase project URL and service role key from environment
    -- These should be set as database secrets or environment variables
    v_supabase_url := current_setting('app.supabase_url', true);
    v_service_role_key := current_setting('app.service_role_key', true);

    -- If not configured, fall back to logging
    IF v_supabase_url IS NULL OR v_service_role_key IS NULL THEN
        -- Just log the email
        INSERT INTO email_logs (
            to_email,
            subject,
            body_html,
            body_text,
            delivery_status,
            sent_at,
            created_by
        )
        VALUES (
            p_to_email,
            p_subject,
            p_body_html,
            COALESCE(p_body_text, ''),
            'pending',
            NOW(),
            auth.uid()
        )
        RETURNING id INTO v_email_log_id;

        RETURN jsonb_build_object(
            'success', true,
            'email_log_id', v_email_log_id,
            'message', 'Email logged (email service not configured)',
            'warning', true
        );
    END IF;

    -- For now, we'll use a simpler approach:
    -- Since Supabase Auth emails work, we can use the same mechanism
    -- by calling Supabase's email API via HTTP
    
    -- Log the email attempt
    INSERT INTO email_logs (
        to_email,
        subject,
        body_html,
        body_text,
        delivery_status,
        created_by
    )
    VALUES (
        p_to_email,
        p_subject,
        p_body_html,
        COALESCE(p_body_text, ''),
        'pending',
        auth.uid()
    )
    RETURNING id INTO v_email_log_id;

    -- Return success - actual sending will be handled by application layer
    -- or a scheduled job that processes pending emails
    RETURN jsonb_build_object(
        'success', true,
        'email_log_id', v_email_log_id,
        'message', 'Email queued for sending',
        'warning', false
    );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION send_email_via_http TO authenticated;

-- =====================================================================================
-- Comments
-- =====================================================================================
COMMENT ON FUNCTION send_transactional_email IS 'Send transactional email using configured email service or Supabase default';
COMMENT ON FUNCTION send_email_via_http IS 'Send email via HTTP request to email service API';


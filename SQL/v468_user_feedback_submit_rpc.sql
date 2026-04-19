-- v468: Server-side feedback submit (bypasses fragile client RLS on users + user_feedback)
-- Date: 2026-04-19
-- Use when the browser gets 403 on public.users or user_feedback despite v467.
-- SECURITY DEFINER runs with privileges to read users.id and insert feedback in one transaction.

ALTER TABLE public.user_feedback
  ADD COLUMN IF NOT EXISTS screenshot_data TEXT;

COMMENT ON COLUMN public.user_feedback.screenshot_data IS 'Optional base64 data URL or raw base64 screenshot (size-limited in RPC).';

CREATE OR REPLACE FUNCTION public.submit_user_feedback(
  p_feedback_type text,
  p_feedback_text text,
  p_rating integer,
  p_page_url text,
  p_user_agent text,
  p_browser_info jsonb DEFAULT '{}'::jsonb,
  p_screenshot_data text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id uuid;
  v_new_id uuid;
  v_ss text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  IF p_feedback_text IS NULL OR btrim(p_feedback_text) = '' THEN
    RAISE EXCEPTION 'Feedback text is required' USING ERRCODE = '23514';
  END IF;

  SELECT u.id INTO v_profile_id
  FROM public.users u
  WHERE u.auth_user_id = auth.uid()
    AND COALESCE(u.is_deleted, FALSE) = FALSE
  LIMIT 1;

  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'User profile not found' USING ERRCODE = 'P0001';
  END IF;

  v_ss := p_screenshot_data;
  IF v_ss IS NOT NULL AND length(v_ss) > 1200000 THEN
    v_ss := left(v_ss, 1200000);
  END IF;

  INSERT INTO public.user_feedback (
    user_id,
    feedback_type,
    feedback_text,
    rating,
    page_url,
    user_agent,
    browser_info,
    screenshot_data,
    status
  )
  VALUES (
    v_profile_id,
    p_feedback_type,
    btrim(p_feedback_text),
    p_rating,
    NULLIF(btrim(COALESCE(p_page_url, '')), ''),
    NULLIF(btrim(COALESCE(p_user_agent, '')), ''),
    COALESCE(p_browser_info, '{}'::jsonb),
    v_ss,
    'new'
  )
  RETURNING id INTO v_new_id;

  RETURN v_new_id;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_user_feedback(text, text, integer, text, text, jsonb, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_user_feedback(text, text, integer, text, text, jsonb, text) TO authenticated;

COMMENT ON FUNCTION public.submit_user_feedback IS 'Submit feedback as current auth user; resolves public.users.id internally.';

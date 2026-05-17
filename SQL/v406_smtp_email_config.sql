-- ============================================================================
-- v406: Add SMTP email configuration for project invitation emails
--
-- Prerequisites: v49_email_integration.sql (email_configurations table).
--
-- HOW TO FILL IN YOUR SMTP DETAILS:
--
--   Gmail (recommended for testing):
--     host:     smtp.gmail.com
--     port:     587
--     username: your.address@gmail.com
--     password: your-16-char-app-password  (NOT your Gmail login password)
--               Generate at: myaccount.google.com → Security → App Passwords
--     tls:      true
--
--   Outlook / Microsoft 365:
--     host:     smtp.office365.com
--     port:     587
--     username: your.address@outlook.com
--     password: your-outlook-password
--     tls:      true
--
--   Zoho Mail:
--     host:     smtp.zoho.com
--     port:     587
--     username: your.address@zohomail.com
--     password: your-zoho-password
--     tls:      true
--
--   Custom / cPanel SMTP:
--     host:     mail.yourdomain.com
--     port:     587  (or 465 for SSL — set tls: true for both)
--     username: noreply@yourdomain.com
--     password: your-mailbox-password
--     tls:      true
-- ============================================================================

INSERT INTO public.email_configurations (
  config_name,
  service_provider,
  smtp_config,
  from_email,
  from_name,
  is_active,
  is_default
)
VALUES (
  'Primary SMTP',
  'smtp',
  jsonb_build_object(
    'host',     'smtp.gmail.com',           -- ← replace with your SMTP host
    'port',     587,                         -- ← 587 (STARTTLS) or 465 (SSL)
    'username', 'your@gmail.com',            -- ← your SMTP login
    'password', 'your-app-password',         -- ← your SMTP password / app password
    'tls',      true                         -- ← true for TLS/STARTTLS, false for plain
  ),
  'your@gmail.com',                          -- ← from_email shown to recipients
  'Project Nidus',                           -- ← sender name shown to recipients
  true,
  true
)
ON CONFLICT (config_name) DO UPDATE SET
  service_provider = EXCLUDED.service_provider,
  smtp_config      = EXCLUDED.smtp_config,
  from_email       = EXCLUDED.from_email,
  from_name        = EXCLUDED.from_name,
  is_active        = EXCLUDED.is_active,
  is_default       = EXCLUDED.is_default,
  updated_at       = now();

-- Deactivate any non-SMTP configs so this is the sole active sender
UPDATE public.email_configurations
   SET is_active  = false,
       is_default = false,
       updated_at = now()
 WHERE config_name <> 'Primary SMTP'
   AND (is_active = true OR is_default = true);

-- Verify: check what was inserted
SELECT config_name, service_provider, from_email, from_name, is_active, is_default,
       smtp_config - 'password' AS smtp_config_redacted  -- hide password from output
  FROM public.email_configurations
 ORDER BY is_default DESC, created_at DESC;

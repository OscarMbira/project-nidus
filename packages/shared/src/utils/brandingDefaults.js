/**
 * v1240 — Default organisation branding (no database lookup). Shared so the app-side
 * brandingService (both apps) and the shared useBranding() reader return the same defaults.
 */
export function getDefaultBranding() {
  return {
    app_display_name:   null,
    app_tagline:        null,
    primary_logo_url:   null,
    sidebar_logo_url:   null,
    favicon_url:        null,
    login_banner_url:   null,
    email_logo_url:     null,
    report_cover_url:   null,
    primary_color:      '#3B82F6',
    secondary_color:    '#1E40AF',
    accent_color:       '#F59E0B',
    header_bg_color:    '#1F2937',
    sidebar_bg_color:   '#111827',
    sidebar_active_color: '#3B82F6',
    sidebar_text_color: '#F9FAFB',
    button_color:       '#3B82F6',
    link_color:         '#60A5FA',
    font_family:        'inter',
    base_font_size:     'medium',  // small | medium | large | x-large (system-wide :root font-size)
  }
}

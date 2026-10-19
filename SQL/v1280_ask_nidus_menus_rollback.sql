-- ============================================================================
-- v1280 rollback: removes the v1272 AI menu rows and restores the old labels.
-- ============================================================================
DELETE FROM public.planner_menu_allowlist WHERE menu_code IN ('pln_ask_nidus', 'pln_settings_ai');
DELETE FROM public.role_menu_items WHERE menu_item_id IN (
  SELECT id FROM public.menu_items WHERE menu_code IN ('plat_acct_ai_settings', 'plat_pt_report_layouts', 'sim_pmo_admin_ai_settings',
                                                        'sim_pmo_admin_report_layouts', 'sim_pm_report_builder', 'pln_ask_nidus', 'pln_settings_ai'));
DELETE FROM public.menu_items WHERE menu_code IN ('plat_acct_ai_settings', 'plat_pt_report_layouts', 'sim_pmo_admin_ai_settings',
                                                  'sim_pmo_admin_report_layouts', 'sim_pm_report_builder', 'pln_ask_nidus', 'pln_settings_ai');
UPDATE public.menu_items SET menu_label = 'AI Assistant', updated_at = NOW() WHERE route_path = '/platform/ai' AND menu_code NOT LIKE 'pln\_%';
UPDATE public.menu_items SET menu_label = 'AI Workspace', updated_at = NOW() WHERE menu_code IN ('sim_pm_ai', 'sim_learner_ai');

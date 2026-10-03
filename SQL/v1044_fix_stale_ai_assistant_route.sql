-- ============================================================================
-- v1044: Fix stale AI Assistant route_path — /platform/ai-assistant never existed
-- ============================================================================
-- User report: clicking "AI Assistant" (top of Core Project Management) renders a blank page.
-- Same stale-route-path bug class as Business Case (v1023), Schedule (v1029),
-- Stakeholders (v1032), Strategy & OKRs (v1041): the menu item's route_path was never updated
-- to match the real, registered route.
--
-- Root cause (confirmed via route registration search): /platform/ai-assistant is not
-- registered anywhere in platformRoutes.jsx. The real, fully-built AI Assistant —
-- apps/platform/src/pages/platform-app/AIWorkspace.jsx, backed by aiAssistantService.js and
-- the v321/v322/v330 chat tables, plus a persistent AIChatWidget wired into Layout.jsx app-wide
-- — is registered at /platform/ai.
-- ============================================================================

UPDATE public.menu_items SET route_path = '/platform/ai', updated_at = NOW()
WHERE menu_code = 'plat_pm_ai' AND COALESCE(is_deleted, FALSE) = FALSE;

DO $$
BEGIN
  RAISE NOTICE '================================================';
  RAISE NOTICE 'v1044: plat_pm_ai (AI Assistant) route_path repointed from dead /platform/ai-assistant to the real /platform/ai';
  RAISE NOTICE '================================================';
END $$;

-- Post-run verification (run manually):
--   SELECT menu_code, menu_label, route_path, is_active FROM public.menu_items WHERE menu_code = 'plat_pm_ai';
--   -- expect route_path = '/platform/ai'.

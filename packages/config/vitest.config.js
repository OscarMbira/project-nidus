import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // jsdom, not node: menuRegistry.test.js transitively imports @nidus/supabase
    // (via packages/shared's useMenu.js), whose client constructor reads
    // window.sessionStorage directly — needs a window global to exist just to
    // import safely, even though these tests never touch real browser storage.
    environment: 'jsdom',
    // Same import chain also throws at load time if VITE_SUPABASE_URL/
    // VITE_SUPABASE_ANON_KEY are missing. These tests never issue a real
    // Supabase query (pure registry/config logic) — a well-formed placeholder
    // satisfies the module's own isValidUrl check without real credentials.
    env: {
      VITE_SUPABASE_URL: 'https://test-placeholder.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'test-placeholder-anon-key-not-real',
    },
    include: [
      'src/__tests__/annotateTemplateRowsByMethodology.test.js',
      'src/__tests__/menuRegistry.test.js',
      'src/__tests__/methodologyMenuUtils.test.js',
      'src/__tests__/pmoLayoutMenuExclusions.test.js',
      'src/__tests__/pmoMenuHierarchyUtils.test.js',
      'src/__tests__/pmoMenuSemanticDedupe.test.js',
      'src/__tests__/processTemplatesMenuCodes.test.js',
    ],
  },
});

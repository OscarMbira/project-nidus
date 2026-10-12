import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// react() enables the automatic JSX runtime (no `import React` needed per-file) for the
// handful of .jsx hook tests that render components (e.g. useSuccessModal.test.jsx, which
// pulls in packages/ui components via '@vitest-environment jsdom' override below) — matches
// packages/ui's own vitest.config.js.
//
// v1240: these tests used to run from the app copies (apps/*/src/utils etc.) under each app's
// own config, so the package now mirrors that environment — jsdom, the same setup file, globals,
// and placeholder Supabase env (same approach as packages/config/vitest.config.js; tests never
// issue a real query, the client only validates the URL shape at import time).
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    globals: true,
    env: {
      VITE_SUPABASE_URL: 'https://test-placeholder.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'test-placeholder-anon-key-not-real',
    },
    include: [
      'src/constants/**/*.test.js',
      'src/site/__tests__/**/*.test.{js,jsx}',
      'src/utils/__tests__/**/*.test.{js,jsx}',
      'src/hooks/__tests__/**/*.test.{js,jsx}',
      'src/context/__tests__/**/*.test.{js,jsx}',
      'src/services/__tests__/pmTemplateInheritanceService.test.js',
      'src/services/__tests__/pmTemplateCreateInheritance.test.js',
      'src/services/__tests__/pmTemplateNodeService.test.js',
      'src/services/__tests__/industryTemplateTierService.test.js',
      'src/services/__tests__/entityDeliveryMethodologyService.test.js',
      'src/services/__tests__/pmTemplateCopyService.test.js',
      'src/services/__tests__/pmTemplateOverrideService.test.js',
      'src/services/__tests__/pmTemplateContentService.test.js',
      'src/services/__tests__/menuLabelService.test.js',
      'src/services/__tests__/projectFormTemplateCatalog.test.js',
      'src/services/__tests__/projectDocumentsRegisterService.test.js',
      'src/services/__tests__/processTemplateAttachmentService.test.js',
      'src/services/__tests__/processTemplateSignatoryService.test.js',
      'src/services/__tests__/documentOversightService.test.js',
      'src/services/__tests__/userAvatarService.test.js',
      'src/services/__tests__/projectRoleRows.test.js',
      'src/services/__tests__/stakeholderPhotoService.test.js',
      'src/services/__tests__/briefTeamStructureDiagramService.test.js',
      'src/services/__tests__/governanceChartService.test.js',
      'src/services/__tests__/signedImageCache.test.js',
      'src/__tests__/idGenerationMigration.test.js',
    ],
  },
});

/**
 * Unit tests for aiSettingsService (Phase 4 — AI Data Answer Mode and privacy)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getPrivacyNoticeText, getSettings, updateSettings, getOrgIdForUser } from '../aiSettingsService';

describe('getPrivacyNoticeText', () => {
  it('returns template-only message for template mode', () => {
    expect(getPrivacyNoticeText('template')).toContain('No data is sent externally');
    expect(getPrivacyNoticeText('template')).toContain('database');
  });

  it('returns Claude message for claude mode', () => {
    const text = getPrivacyNoticeText('claude');
    expect(text).toContain('Anthropic Claude');
    expect(text).toContain('database');
  });

  it('returns Gemini message for gemini mode', () => {
    const text = getPrivacyNoticeText('gemini');
    expect(text).toContain('Google Gemini');
    expect(text).toContain('database');
  });

  it('returns default message for unknown mode', () => {
    const text = getPrivacyNoticeText('unknown');
    expect(text).toContain('database');
    expect(text).toContain('Gemini');
  });
});

describe('getSettings', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns null when orgId is null', async () => {
    const result = await getSettings(null);
    expect(result).toBeNull();
  });
});

describe('getOrgIdForUser', () => {
  it('returns null when authUserId is null', async () => {
    const result = await getOrgIdForUser(null);
    expect(result).toBeNull();
  });
});

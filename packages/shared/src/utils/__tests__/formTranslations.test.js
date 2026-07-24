/**
 * Unit tests for formTranslations utilities
 */

import { describe, it, expect } from 'vitest';
import {
  buildTranslationIndex,
  resolveFieldLabel,
  resolveOptionLabel,
  getFieldTranslationCoverage,
  getTranslationTargetLanguages,
} from '../formTranslations';

const ROWS = [
  {
    section_key: 'general',
    field_key: 'activity_type',
    language_code: 'fr-FR',
    label: "Type d'activité",
    option_labels: { task: 'Tâche', milestone: 'Jalon' },
  },
  {
    section_key: 'general',
    field_key: 'activity_type',
    language_code: 'es-ES',
    label: 'Tipo de actividad',
    option_labels: { task: 'Tarea' },
  },
  {
    section_key: 'general',
    field_key: 'status',
    language_code: 'fr-FR',
    label: '',
    option_labels: {},
  },
];

describe('buildTranslationIndex', () => {
  it('indexes only rows matching the requested language', () => {
    const index = buildTranslationIndex(ROWS, 'fr-FR');
    expect(index.size).toBe(2);
    expect(index.get('general::activity_type').label).toBe("Type d'activité");
  });

  it('returns an empty map when languageCode is missing', () => {
    expect(buildTranslationIndex(ROWS, '').size).toBe(0);
  });

  it('returns an empty map for no rows', () => {
    expect(buildTranslationIndex(null, 'fr-FR').size).toBe(0);
  });
});

describe('resolveFieldLabel', () => {
  const index = buildTranslationIndex(ROWS, 'fr-FR');

  it('returns the translated label when present', () => {
    const field = { key: 'activity_type', label: 'Activity Type' };
    expect(resolveFieldLabel(field, index, 'general')).toBe("Type d'activité");
  });

  it('falls back to the schema default label when translation is blank', () => {
    const field = { key: 'status', label: 'Status' };
    expect(resolveFieldLabel(field, index, 'general')).toBe('Status');
  });

  it('falls back to the schema default label when no translation exists at all', () => {
    const field = { key: 'unknown_field', label: 'Unknown' };
    expect(resolveFieldLabel(field, index, 'general')).toBe('Unknown');
  });
});

describe('resolveOptionLabel', () => {
  const index = buildTranslationIndex(ROWS, 'fr-FR');

  it('returns the translated option label when present', () => {
    const option = { value: 'task', label: 'Task' };
    expect(resolveOptionLabel(option, index, 'general', 'activity_type')).toBe('Tâche');
  });

  it('falls back to the schema default option label when not translated', () => {
    const option = { value: 'summary', label: 'Summary' };
    expect(resolveOptionLabel(option, index, 'general', 'activity_type')).toBe('Summary');
  });
});

describe('getFieldTranslationCoverage', () => {
  const activeLanguages = [{ code: 'fr-FR' }, { code: 'es-ES' }, { code: 'de-DE' }];

  it('counts distinct languages with a non-blank label', () => {
    const field = { key: 'activity_type' };
    const coverage = getFieldTranslationCoverage(field, 'general', ROWS, activeLanguages);
    expect(coverage).toEqual({ translated: 2, total: 3 });
  });

  it('does not count rows with a blank label', () => {
    const field = { key: 'status' };
    const coverage = getFieldTranslationCoverage(field, 'general', ROWS, activeLanguages);
    expect(coverage).toEqual({ translated: 0, total: 3 });
  });

  it('returns total 0 when there are no active languages', () => {
    const field = { key: 'activity_type' };
    expect(getFieldTranslationCoverage(field, 'general', ROWS, [])).toEqual({ translated: 0, total: 0 });
  });
});

describe('getTranslationTargetLanguages', () => {
  it('excludes English source variants from bulk translation targets', () => {
    const langs = [
      { code: 'en-US', name: 'English (US)' },
      { code: 'en-GB', name: 'English (UK)' },
      { code: 'fr-FR', name: 'French' },
    ];
    expect(getTranslationTargetLanguages(langs).map((l) => l.code)).toEqual(['fr-FR']);
  });
});

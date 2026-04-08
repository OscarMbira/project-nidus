import { describe, it, expect } from 'vitest';
import {
  looksLikeProjectUuid,
  decodeProjectRouteSegment,
  projectPathSegmentFromProject,
  platformProjectPath,
} from '../projectRouteParam.js';

describe('projectRouteParam', () => {
  it('looksLikeProjectUuid recognises common UUID shape', () => {
    expect(looksLikeProjectUuid('d880e846-f08e-4c1a-83c4-fd51d1db2b70')).toBe(true);
    expect(looksLikeProjectUuid('SEED334-PRJ-02')).toBe(false);
    expect(looksLikeProjectUuid('')).toBe(false);
  });

  it('decodeProjectRouteSegment trims and decodes', () => {
    expect(decodeProjectRouteSegment('SEED334-PRJ-02')).toBe('SEED334-PRJ-02');
    expect(decodeProjectRouteSegment(encodeURIComponent('A B'))).toBe('A B');
  });

  it('projectPathSegmentFromProject prefers code', () => {
    expect(
      decodeURIComponent(
        projectPathSegmentFromProject({
          id: 'd880e846-f08e-4c1a-83c4-fd51d1db2b70',
          project_code: 'SEED334-PRJ-02',
        })
      )
    ).toBe('SEED334-PRJ-02');
    expect(
      decodeURIComponent(
        projectPathSegmentFromProject({ id: 'd880e846-f08e-4c1a-83c4-fd51d1db2b70' })
      )
    ).toBe('d880e846-f08e-4c1a-83c4-fd51d1db2b70');
  });

  it('platformProjectPath builds platform project URLs', () => {
    expect(platformProjectPath('SEED334-PRJ-02')).toBe('/platform/projects/SEED334-PRJ-02');
    expect(platformProjectPath('SEED334-PRJ-02', 'edit')).toBe('/platform/projects/SEED334-PRJ-02/edit');
    expect(platformProjectPath('')).toBe('/platform/projects');
  });
});

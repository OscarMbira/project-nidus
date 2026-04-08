import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useViewMode } from '../useViewMode';

describe('useViewMode', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('defaults to grid', () => {
    const { result } = renderHook(() => useViewMode('unit-test-default', 'grid'));
    expect(result.current[0]).toBe('grid');
  });

  it('defaults to list when second arg is list', () => {
    const { result } = renderHook(() => useViewMode('unit-test-list-default', 'list'));
    expect(result.current[0]).toBe('list');
  });

  it('reads valid value from localStorage on init', () => {
    localStorage.setItem('nidus-view-mode-unit-read', 'list');
    const { result } = renderHook(() => useViewMode('unit-read', 'grid'));
    expect(result.current[0]).toBe('list');
  });

  it('updates mode and persists key nidus-view-mode-{pageId}', () => {
    const { result } = renderHook(() => useViewMode('unit-persist', 'grid'));
    act(() => {
      result.current[1]('list');
    });
    expect(result.current[0]).toBe('list');
    expect(localStorage.getItem('nidus-view-mode-unit-persist')).toBe('list');
  });

  it('supports functional updater', () => {
    const { result } = renderHook(() => useViewMode('unit-fn', 'grid'));
    act(() => {
      result.current[1]((prev) => (prev === 'grid' ? 'list' : 'grid'));
    });
    expect(result.current[0]).toBe('list');
  });
});

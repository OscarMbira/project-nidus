/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import {
  SIDEBAR_COLLAPSED_KEY,
  mainContentSidebarOffsetClass,
  sidebarPanelTransformClass,
  useSidebarCollapsed,
} from '../useSidebarCollapsed'

describe('useSidebarCollapsed', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('shows the sidebar until the user hides it', () => {
    const { result } = renderHook(() => useSidebarCollapsed())
    expect(result.current.collapsed).toBe(false)
  })

  it('persists a hide and a show', () => {
    const { result } = renderHook(() => useSidebarCollapsed())
    act(() => {
      result.current.toggleCollapsed()
    })
    expect(result.current.collapsed).toBe(true)
    expect(localStorage.getItem(SIDEBAR_COLLAPSED_KEY)).toBe('1')

    act(() => {
      result.current.toggleCollapsed()
    })
    expect(result.current.collapsed).toBe(false)
    expect(localStorage.getItem(SIDEBAR_COLLAPSED_KEY)).toBe('0')
  })

  it('reads a stored hide on the next page', () => {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, '1')
    const { result } = renderHook(() => useSidebarCollapsed())
    expect(result.current.collapsed).toBe(true)
  })

  it('drops the main-column offset when the sidebar is hidden', () => {
    expect(mainContentSidebarOffsetClass(false)).toBe('lg:ml-80')
    expect(mainContentSidebarOffsetClass(true)).toBe('lg:ml-0')
  })

  it('keeps the mobile drawer independent of the desktop hide', () => {
    expect(sidebarPanelTransformClass(true, true)).toContain('translate-x-0')
    expect(sidebarPanelTransformClass(true, true)).toContain('lg:-translate-x-full')
    expect(sidebarPanelTransformClass(false, false)).toContain('-translate-x-full')
    expect(sidebarPanelTransformClass(false, false)).toContain('lg:translate-x-0')
  })
})

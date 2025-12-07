/**
 * useTheme hook - wraps ThemeContext for convenience
 *
 * This hook provides access to the theme context.
 * Use this instead of importing directly from ThemeContext.
 */
import { useThemeContext } from '../context/ThemeContext'

export function useTheme() {
  return useThemeContext()
}

export default useTheme


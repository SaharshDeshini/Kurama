import { useEffect } from 'react';

/**
 * Handles Light, Dark, and System theme application
 */
export function useTheme(themeMode = 'dark') {
  useEffect(() => {
    const root = document.documentElement;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = () => {
      if (themeMode === 'light') {
        root.classList.remove('dark');
      } else {
        // Default to dark for the black and blue theme
        root.classList.add('dark');
      }
    };

    applyTheme();

    if (themeMode === 'system') {
      mediaQuery.addEventListener('change', applyTheme);
      return () => mediaQuery.removeEventListener('change', applyTheme);
    }
  }, [themeMode]);
}

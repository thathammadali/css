/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { ThemeSwatch } from '../types';
import {
  THEME_SWATCHES,
  THEME_STORAGE_KEY,
  THEME_UNLOCKED_STORAGE_KEY,
  DEFAULT_THEME_ID,
  getInitialTheme,
  applyThemeToDocument,
} from '../data/themes';

interface ThemeContextType {
  activeTheme: ThemeSwatch;
  isLightMode: boolean;
  toggleColorMode: () => void;
  setColorMode: (mode: 'light' | 'dark') => void;
  setTheme: (theme: ThemeSwatch | string, forceAdmin?: boolean) => void;
  availableThemes: ThemeSwatch[];
  unlockedMap: Record<string, boolean>;
  toggleThemeLock: (themeId: string) => void;
  unlockAllThemes: () => void;
  lockNonDefaultThemes: () => void;
  unlockedCount: number;
  totalCount: number;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Helper to get initial unlocked map — all 12 themes are unlocked
function getInitialUnlockedMap(): Record<string, boolean> {
  const map: Record<string, boolean> = {};
  THEME_SWATCHES.forEach((s) => {
    map[s.id] = true;
  });
  return map;
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTheme, setActiveThemeState] = useState<ThemeSwatch>(getInitialTheme);
  const [unlockedMap, setUnlockedMap] = useState<Record<string, boolean>>(getInitialUnlockedMap);

  const isLightMode = useMemo(() => activeTheme.mode === 'light', [activeTheme]);

  // Apply CSS custom properties and light/dark classes on documentElement whenever activeTheme changes
  useEffect(() => {
    if (!THEME_SWATCHES.some((t) => t.id === activeTheme.id)) {
      const fallback = THEME_SWATCHES[0];
      setActiveThemeState(fallback);
      applyThemeToDocument(fallback);
      try {
        localStorage.setItem(THEME_STORAGE_KEY, fallback.id);
      } catch {
        // Fallback
      }
      return;
    }
    applyThemeToDocument(activeTheme);
  }, [activeTheme]);

  // Persist unlocked map
  useEffect(() => {
    try {
      localStorage.setItem(THEME_UNLOCKED_STORAGE_KEY, JSON.stringify(unlockedMap));
    } catch {
      // Fallback
    }
  }, [unlockedMap]);

  // Dynamically compute availableThemes based on unlockedMap
  const availableThemes = useMemo(() => {
    return THEME_SWATCHES.map((swatch) => ({
      ...swatch,
      unlocked: unlockedMap[swatch.id] ?? true,
    }));
  }, [unlockedMap]);

  const unlockedCount = useMemo(() => {
    return availableThemes.filter((t) => t.unlocked).length;
  }, [availableThemes]);

  const setTheme = (themeInput: ThemeSwatch | string, forceAdmin = false) => {
    let nextTheme: ThemeSwatch | undefined;

    if (typeof themeInput === 'string') {
      nextTheme = availableThemes.find(
        (t) => t.id === themeInput && (forceAdmin || t.unlocked)
      );
    } else if (themeInput) {
      if (forceAdmin || unlockedMap[themeInput.id] || themeInput.unlocked) {
        nextTheme = themeInput;
      }
    }

    if (nextTheme) {
      setActiveThemeState(nextTheme);
      applyThemeToDocument(nextTheme);
      try {
        localStorage.setItem(THEME_STORAGE_KEY, nextTheme.id);
      } catch {
        // Fallback for private browsing mode
      }
    }
  };

  const toggleColorMode = () => {
    if (isLightMode) {
      // Switch to Enterprise Midnight
      const darkTheme =
        availableThemes.find((t) => t.id === 'enterprise-midnight' && t.unlocked) ||
        availableThemes.find((t) => t.mode === 'dark' && t.unlocked) ||
        THEME_SWATCHES[0];
      if (darkTheme) {
        setTheme(darkTheme);
      }
    } else {
      // Switch to Campus Daylight
      const lightTheme =
        availableThemes.find((t) => t.id === 'campus-daylight' && t.unlocked) ||
        availableThemes.find((t) => t.mode === 'light' && t.unlocked) ||
        THEME_SWATCHES[1];
      if (lightTheme) {
        setTheme(lightTheme);
      }
    }
  };

  const setColorMode = (mode: 'light' | 'dark') => {
    if (mode === 'light' && !isLightMode) {
      toggleColorMode();
    } else if (mode === 'dark' && isLightMode) {
      toggleColorMode();
    }
  };

  const toggleThemeLock = (themeId: string) => {
    // Keep default theme unlocked always to avoid lock-out
    if (themeId === DEFAULT_THEME_ID && unlockedMap[themeId]) {
      return;
    }
    setUnlockedMap((prev) => {
      const next = { ...prev, [themeId]: !prev[themeId] };
      return next;
    });
  };

  const unlockAllThemes = () => {
    const nextMap: Record<string, boolean> = {};
    THEME_SWATCHES.forEach((s) => {
      nextMap[s.id] = true;
    });
    setUnlockedMap(nextMap);
  };

  const lockNonDefaultThemes = () => {
    const nextMap: Record<string, boolean> = {};
    THEME_SWATCHES.forEach((s) => {
      // Keep active theme and default theme unlocked
      nextMap[s.id] = s.id === activeTheme.id || s.id === DEFAULT_THEME_ID;
    });
    setUnlockedMap(nextMap);
  };

  return (
    <ThemeContext.Provider
      value={{
        activeTheme,
        isLightMode,
        toggleColorMode,
        setColorMode,
        setTheme,
        availableThemes,
        unlockedMap,
        toggleThemeLock,
        unlockAllThemes,
        lockNonDefaultThemes,
        unlockedCount,
        totalCount: THEME_SWATCHES.length,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    // Graceful fallback if used outside provider
    const fallback = getInitialTheme();
    const map: Record<string, boolean> = {};
    THEME_SWATCHES.forEach((s) => {
      map[s.id] = true;
    });
    return {
      activeTheme: fallback,
      isLightMode: fallback.mode === 'light',
      toggleColorMode: () => {},
      setColorMode: () => {},
      setTheme: () => {},
      availableThemes: THEME_SWATCHES,
      unlockedMap: map,
      toggleThemeLock: () => {},
      unlockAllThemes: () => {},
      lockNonDefaultThemes: () => {},
      unlockedCount: THEME_SWATCHES.length,
      totalCount: THEME_SWATCHES.length,
    };
  }
  return context;
};

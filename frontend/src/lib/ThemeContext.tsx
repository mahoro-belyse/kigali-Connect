// src/lib/ThemeContext.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Our app uses a FIXED Matte Black dark theme — no light/dark switching.
// This file is kept ONLY as a compatibility stub so any remaining
// imports of useTheme() or ThemeProvider don't crash during conversion.
//
// The original Base44 version read from localStorage and toggled CSS classes.
// We don't need that — our Tailwind classes are hardcoded for dark theme.
// ─────────────────────────────────────────────────────────────────────────────
import { createContext, useContext, ReactNode } from 'react';

interface ThemeContextType {
  theme: 'dark';
  toggle: () => void;
  isDark: true;
}

const ThemeContext = createContext<ThemeContextType>({
  theme:  'dark',
  toggle: () => {},
  isDark: true,
});

// ThemeProvider is a pass-through — no localStorage, no class toggling
export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <ThemeContext.Provider value={{ theme: 'dark', toggle: () => {}, isDark: true }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);

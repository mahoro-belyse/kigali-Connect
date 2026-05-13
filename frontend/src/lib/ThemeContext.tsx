
import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';

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
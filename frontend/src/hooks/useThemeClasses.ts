interface ThemeClasses {
  isDark: true;
  bg: string;
  card: string;
  text: string;
  muted: string;
  border: string;
  input: string;
  topbar: string;
}

export function useThemeClasses(): ThemeClasses {
  return {
    isDark:  true,
    bg:      'bg-[#1a1a1a]',
    card:    'bg-[#242424]',
    text:    'text-[#f5f0e8]',
    muted:   'text-[#9a8f82]',
    border:  'border-[rgba(184,115,51,0.2)]',
    input:   'bg-[#2a2a2a] text-[#f5f0e8] border-[rgba(184,115,51,0.2)]',
    topbar:  'bg-[#1a1a1a]/80',
  };
}

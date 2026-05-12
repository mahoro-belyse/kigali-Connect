// src/components/ThemeToggle.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Our app uses a fixed Matte Black theme — no light/dark toggle needed.
// This stub is kept so any existing imports don't break.
// It renders nothing visible (returns an empty fragment).
// If you want to add a real toggle later, implement it here.
// ─────────────────────────────────────────────────────────────────────────────

interface ThemeToggleProps {
  className?: string;
}

export default function ThemeToggle({ className = '' }: ThemeToggleProps) {
  // Intentionally empty — app is fixed dark theme (Matte Black + Copper + Ivory)
  return null;
}

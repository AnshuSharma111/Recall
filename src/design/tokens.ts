/**
 * Design Tokens - Core design system values
 * Defines colors, typography, spacing, shadows, and other design primitives
 */

// Color Palette
export const colors = {
  // Primary Colors
  primary: {
    50: '#f0f9ff',
    100: '#e0f2fe',
    200: '#bae6fd',
    300: '#7dd3fc',
    400: '#38bdf8',
    500: '#0ea5e9',
    600: '#0284c7',
    700: '#0369a1',
    800: '#075985',
    900: '#0c4a6e',
    950: '#082f49'
  },

  // Secondary Colors
  secondary: {
    50: '#fdf4ff',
    100: '#fae8ff',
    200: '#f5d0fe',
    300: '#f0abfc',
    400: '#e879f9',
    500: '#d946ef',
    600: '#c026d3',
    700: '#a21caf',
    800: '#86198f',
    900: '#701a75',
    950: '#4a044e'
  },

  // Neutral Colors
  neutral: {
    0: '#ffffff',
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
    950: '#020617'
  },

  // Semantic Colors
  success: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d'
  },

  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f'
  },

  error: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d'
  },

  // Deck Theme Colors
  deckThemes: {
    ocean: {
      primary: '#0ea5e9',
      secondary: '#0284c7',
      background: '#f0f9ff',
      surface: '#e0f2fe',
      accent: '#38bdf8'
    },
    forest: {
      primary: '#22c55e',
      secondary: '#16a34a',
      background: '#f0fdf4',
      surface: '#dcfce7',
      accent: '#4ade80'
    },
    sunset: {
      primary: '#f59e0b',
      secondary: '#d97706',
      background: '#fffbeb',
      surface: '#fef3c7',
      accent: '#fbbf24'
    },
    lavender: {
      primary: '#d946ef',
      secondary: '#c026d3',
      background: '#fdf4ff',
      surface: '#fae8ff',
      accent: '#e879f9'
    },
    midnight: {
      primary: '#6366f1',
      secondary: '#4f46e5',
      background: '#1e1b4b',
      surface: '#312e81',
      accent: '#8b5cf6'
    }
  }
} as const;

// Typography
export const typography = {
  fontFamily: {
    sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
    mono: ['JetBrains Mono', 'Fira Code', 'Monaco', 'Consolas', 'monospace'],
    display: ['Poppins', 'Inter', 'system-ui', 'sans-serif']
  },

  fontSize: {
    xs: '0.75rem',     // 12px
    sm: '0.875rem',    // 14px
    base: '1rem',      // 16px
    lg: '1.125rem',    // 18px
    xl: '1.25rem',     // 20px
    '2xl': '1.5rem',   // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem',  // 36px
    '5xl': '3rem',     // 48px
    '6xl': '3.75rem'   // 60px
  },

  fontWeight: {
    thin: '100',
    extralight: '200',
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
    black: '900'
  },

  lineHeight: {
    none: '1',
    tight: '1.25',
    snug: '1.375',
    normal: '1.5',
    relaxed: '1.625',
    loose: '2'
  },

  letterSpacing: {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0em',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em'
  }
} as const;

// Spacing
export const spacing = {
  0: '0px',
  1: '0.25rem',   // 4px
  2: '0.5rem',    // 8px
  3: '0.75rem',   // 12px
  4: '1rem',      // 16px
  5: '1.25rem',   // 20px
  6: '1.5rem',    // 24px
  8: '2rem',      // 32px
  10: '2.5rem',   // 40px
  12: '3rem',     // 48px
  16: '4rem',     // 64px
  20: '5rem',     // 80px
  24: '6rem',     // 96px
  32: '8rem',     // 128px
  40: '10rem',    // 160px
  48: '12rem',    // 192px
  56: '14rem',    // 224px
  64: '16rem'     // 256px
} as const;

// Border Radius
export const borderRadius = {
  none: '0px',
  sm: '0.125rem',   // 2px
  base: '0.25rem',  // 4px
  md: '0.375rem',   // 6px
  lg: '0.5rem',     // 8px
  xl: '0.75rem',    // 12px
  '2xl': '1rem',    // 16px
  '3xl': '1.5rem',  // 24px
  full: '9999px'
} as const;

// Shadows
export const shadows = {
  none: 'none',
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  base: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
  
  // Card-specific shadows
  card: {
    rest: '0 2px 8px 0 rgb(0 0 0 / 0.08)',
    hover: '0 4px 16px 0 rgb(0 0 0 / 0.12)',
    active: '0 1px 4px 0 rgb(0 0 0 / 0.12)',
    focus: '0 0 0 3px rgb(59 130 246 / 0.15)'
  },

  // Flashcard shadows
  flashcard: {
    front: '0 4px 12px 0 rgb(0 0 0 / 0.1)',
    back: '0 6px 16px 0 rgb(0 0 0 / 0.15)',
    flip: '0 8px 24px 0 rgb(0 0 0 / 0.2)'
  }
} as const;

// Z-Index
export const zIndex = {
  hide: -1,
  auto: 'auto',
  base: 0,
  docked: 10,
  dropdown: 1000,
  sticky: 1100,
  banner: 1200,
  overlay: 1300,
  modal: 1400,
  popover: 1500,
  skipLink: 1600,
  toast: 1700,
  tooltip: 1800
} as const;

// Breakpoints
export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px'
} as const;

// Animation
export const animation = {
  duration: {
    fast: '150ms',
    normal: '250ms',
    slow: '350ms',
    slower: '500ms'
  },

  easing: {
    linear: 'linear',
    in: 'cubic-bezier(0.4, 0, 1, 1)',
    out: 'cubic-bezier(0, 0, 0.2, 1)',
    inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    elastic: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)'
  },

  // Card flip animation
  cardFlip: {
    duration: '600ms',
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)'
  },

  // Micro-interactions
  microInteraction: {
    duration: '200ms',
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)'
  }
} as const;

// Component-specific tokens
export const components = {
  button: {
    height: {
      sm: '2rem',      // 32px
      md: '2.5rem',    // 40px
      lg: '3rem'       // 48px
    },
    padding: {
      sm: '0.5rem 1rem',
      md: '0.75rem 1.5rem',
      lg: '1rem 2rem'
    }
  },

  input: {
    height: {
      sm: '2rem',
      md: '2.5rem',
      lg: '3rem'
    },
    padding: {
      sm: '0.5rem 0.75rem',
      md: '0.75rem 1rem',
      lg: '1rem 1.25rem'
    }
  },

  card: {
    padding: {
      sm: '1rem',
      md: '1.5rem',
      lg: '2rem'
    },
    minHeight: {
      flashcard: '12rem',  // 192px
      deck: '8rem'         // 128px
    }
  }
} as const;

// Theme variants
export const themes = {
  light: {
    background: colors.neutral[0],
    surface: colors.neutral[50],
    surfaceVariant: colors.neutral[100],
    text: {
      primary: colors.neutral[900],
      secondary: colors.neutral[600],
      disabled: colors.neutral[400]
    },
    border: colors.neutral[200],
    divider: colors.neutral[100]
  },

  dark: {
    background: colors.neutral[900],
    surface: colors.neutral[800],
    surfaceVariant: colors.neutral[700],
    text: {
      primary: colors.neutral[50],
      secondary: colors.neutral[300],
      disabled: colors.neutral[500]
    },
    border: colors.neutral[700],
    divider: colors.neutral[800]
  }
} as const;
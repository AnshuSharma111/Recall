/**
 * Design System Index
 * Main entry point for the comprehensive UI/UX design system
 */

// Core design tokens
export * from './tokens';
export * from './components';
export * from './themes';
export * from './layouts';
export * from './icons';

// Re-export commonly used items for convenience
export { colors, typography, spacing, shadows, animation } from './tokens';
export { buttonSpecs, cardSpecs, flashcardSpecs, deckCardSpecs } from './components';
export { deckThemes, getThemeById, defaultTheme } from './themes';
export { layouts, responsive, flex } from './layouts';
export { icons, getIcon, iconSizes } from './icons';

// Design system utilities
export const designSystem = {
  // Version
  version: '1.0.0',
  
  // Theme management
  theme: {
    current: 'light',
    available: ['light', 'dark'] as const
  },
  
  // Breakpoint utilities
  breakpoints: {
    sm: '640px',
    md: '768px', 
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px'
  },
  
  // Common CSS utilities
  utils: {
    // Screen reader only
    srOnly: {
      position: 'absolute' as const,
      width: '1px',
      height: '1px',
      padding: '0',
      margin: '-1px',
      overflow: 'hidden',
      clip: 'rect(0, 0, 0, 0)',
      whiteSpace: 'nowrap' as const,
      border: '0'
    },
    
    // Truncate text
    truncate: {
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap' as const
    },
    
    // Line clamp
    lineClamp: (lines: number) => ({
      display: '-webkit-box',
      WebkitLineClamp: lines,
      WebkitBoxOrient: 'vertical' as const,
      overflow: 'hidden'
    }),
    
    // Focus ring
    focusRing: {
      outline: '2px solid transparent',
      outlineOffset: '2px',
      '&:focus-visible': {
        outline: '2px solid var(--primary)',
        outlineOffset: '2px'
      }
    }
  }
} as const;
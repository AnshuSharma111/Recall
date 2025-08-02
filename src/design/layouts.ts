/**
 * Layout Specifications
 * Defines layout patterns, grid systems, and responsive design specifications
 */

import { spacing, breakpoints } from './tokens';

// Grid System
export const grid = {
  columns: 12,
  gap: {
    xs: spacing[2],
    sm: spacing[4],
    md: spacing[6],
    lg: spacing[8],
    xl: spacing[10]
  },
  container: {
    maxWidth: {
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px'
    },
    padding: {
      sm: spacing[4],
      md: spacing[6],
      lg: spacing[8]
    }
  }
} as const;

// Layout Patterns
export const layouts = {
  // Main Application Layout
  app: {
    header: {
      height: '4rem',
      padding: `0 ${spacing[6]}`,
      background: 'var(--background)',
      borderBottom: '1px solid var(--border)',
      zIndex: 100
    },
    sidebar: {
      width: '16rem',
      minWidth: '12rem',
      maxWidth: '20rem',
      background: 'var(--surface)',
      borderRight: '1px solid var(--border)',
      padding: spacing[4]
    },
    main: {
      flex: '1',
      padding: spacing[6],
      minHeight: 'calc(100vh - 4rem)',
      background: 'var(--background)'
    },
    footer: {
      height: '3rem',
      padding: `0 ${spacing[6]}`,
      background: 'var(--surface)',
      borderTop: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    }
  },

  // Dashboard Layout
  dashboard: {
    grid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
      gap: spacing[6],
      padding: spacing[6]
    },
    stats: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: spacing[4],
      marginBottom: spacing[8]
    }
  },

  // Deck Grid Layout
  deckGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: spacing[6],
    padding: spacing[4],
    responsive: {
      sm: {
        gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
        gap: spacing[4]
      },
      md: {
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: spacing[6]
      },
      lg: {
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
        gap: spacing[8]
      }
    }
  },

  // Flashcard Study Layout
  studyLayout: {
    container: {
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: spacing[6],
      background: 'var(--background)'
    },
    cardContainer: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flex: '1',
      width: '100%',
      maxWidth: '600px',
      perspective: '1000px'
    },
    controls: {
      display: 'flex',
      gap: spacing[4],
      marginTop: spacing[8],
      justifyContent: 'center',
      flexWrap: 'wrap' as const
    },
    progress: {
      width: '100%',
      maxWidth: '600px',
      marginBottom: spacing[6]
    }
  },

  // Modal Layout
  modal: {
    overlay: {
      position: 'fixed' as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing[4],
      zIndex: 1400
    },
    content: {
      width: '100%',
      maxWidth: '32rem',
      maxHeight: '90vh',
      overflow: 'auto',
      position: 'relative' as const
    }
  },

  // Form Layout
  form: {
    container: {
      display: 'flex',
      flexDirection: 'column' as const,
      gap: spacing[6],
      maxWidth: '28rem',
      width: '100%'
    },
    field: {
      display: 'flex',
      flexDirection: 'column' as const,
      gap: spacing[2]
    },
    fieldGroup: {
      display: 'flex',
      gap: spacing[4],
      alignItems: 'flex-end'
    },
    actions: {
      display: 'flex',
      gap: spacing[3],
      justifyContent: 'flex-end',
      marginTop: spacing[6]
    }
  }
} as const;

// Responsive Utilities
export const responsive = {
  // Breakpoint utilities
  breakpoints,
  
  // Media queries
  mediaQueries: {
    sm: `@media (min-width: ${breakpoints.sm})`,
    md: `@media (min-width: ${breakpoints.md})`,
    lg: `@media (min-width: ${breakpoints.lg})`,
    xl: `@media (min-width: ${breakpoints.xl})`,
    '2xl': `@media (min-width: ${breakpoints['2xl']})`
  },

  // Container queries (for modern browsers)
  containerQueries: {
    sm: '@container (min-width: 320px)',
    md: '@container (min-width: 480px)',
    lg: '@container (min-width: 640px)',
    xl: '@container (min-width: 800px)'
  },

  // Responsive spacing
  spacing: {
    sm: {
      padding: spacing[4],
      margin: spacing[4],
      gap: spacing[3]
    },
    md: {
      padding: spacing[6],
      margin: spacing[6],
      gap: spacing[4]
    },
    lg: {
      padding: spacing[8],
      margin: spacing[8],
      gap: spacing[6]
    }
  }
} as const;

// Flexbox Utilities
export const flex = {
  center: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  centerVertical: {
    display: 'flex',
    alignItems: 'center'
  },
  centerHorizontal: {
    display: 'flex',
    justifyContent: 'center'
  },
  spaceBetween: {
    display: 'flex',
    justifyContent: 'space-between'
  },
  spaceAround: {
    display: 'flex',
    justifyContent: 'space-around'
  },
  column: {
    display: 'flex',
    flexDirection: 'column' as const
  },
  columnCenter: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center'
  },
  wrap: {
    display: 'flex',
    flexWrap: 'wrap' as const
  }
} as const;

// Position Utilities
export const position = {
  relative: { position: 'relative' as const },
  absolute: { position: 'absolute' as const },
  fixed: { position: 'fixed' as const },
  sticky: { position: 'sticky' as const },
  
  // Common positioning patterns
  fullscreen: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0
  },
  
  centered: {
    position: 'absolute' as const,
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)'
  },
  
  topRight: {
    position: 'absolute' as const,
    top: spacing[4],
    right: spacing[4]
  },
  
  bottomRight: {
    position: 'absolute' as const,
    bottom: spacing[4],
    right: spacing[4]
  }
} as const;

// Animation Layout Utilities
export const animationLayouts = {
  // Slide transitions
  slideIn: {
    left: {
      transform: 'translateX(-100%)',
      transition: 'transform 0.3s ease-out'
    },
    right: {
      transform: 'translateX(100%)',
      transition: 'transform 0.3s ease-out'
    },
    up: {
      transform: 'translateY(100%)',
      transition: 'transform 0.3s ease-out'
    },
    down: {
      transform: 'translateY(-100%)',
      transition: 'transform 0.3s ease-out'
    }
  },

  // Fade transitions
  fade: {
    opacity: 0,
    transition: 'opacity 0.3s ease-out'
  },

  // Scale transitions
  scale: {
    transform: 'scale(0.95)',
    opacity: 0,
    transition: 'transform 0.2s ease-out, opacity 0.2s ease-out'
  },

  // Card flip
  cardFlip: {
    perspective: '1000px',
    transformStyle: 'preserve-3d' as const,
    transition: 'transform 0.6s ease-in-out'
  }
} as const;
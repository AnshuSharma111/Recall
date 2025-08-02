/**
 * Component Design Specifications
 * Defines the visual design and behavior specifications for all UI components
 */

import { colors, typography, spacing, borderRadius, shadows, animation } from './tokens';

// Button Component Specifications
export const buttonSpecs = {
  variants: {
    primary: {
      background: colors.primary[500],
      backgroundHover: colors.primary[600],
      backgroundActive: colors.primary[700],
      backgroundDisabled: colors.neutral[300],
      text: colors.neutral[0],
      textDisabled: colors.neutral[500],
      border: 'none',
      shadow: shadows.sm,
      shadowHover: shadows.md
    },

    secondary: {
      background: colors.neutral[0],
      backgroundHover: colors.neutral[50],
      backgroundActive: colors.neutral[100],
      backgroundDisabled: colors.neutral[100],
      text: colors.neutral[700],
      textDisabled: colors.neutral[400],
      border: `1px solid ${colors.neutral[300]}`,
      shadow: shadows.sm,
      shadowHover: shadows.md
    },

    ghost: {
      background: 'transparent',
      backgroundHover: colors.neutral[100],
      backgroundActive: colors.neutral[200],
      backgroundDisabled: 'transparent',
      text: colors.neutral[600],
      textDisabled: colors.neutral[400],
      border: 'none',
      shadow: 'none',
      shadowHover: 'none'
    },

    danger: {
      background: colors.error[500],
      backgroundHover: colors.error[600],
      backgroundActive: colors.error[700],
      backgroundDisabled: colors.neutral[300],
      text: colors.neutral[0],
      textDisabled: colors.neutral[500],
      border: 'none',
      shadow: shadows.sm,
      shadowHover: shadows.md
    }
  },

  sizes: {
    sm: {
      height: '2rem',
      padding: '0 0.75rem',
      fontSize: typography.fontSize.sm,
      borderRadius: borderRadius.md
    },
    md: {
      height: '2.5rem',
      padding: '0 1rem',
      fontSize: typography.fontSize.base,
      borderRadius: borderRadius.md
    },
    lg: {
      height: '3rem',
      padding: '0 1.5rem',
      fontSize: typography.fontSize.lg,
      borderRadius: borderRadius.lg
    }
  },

  states: {
    focus: {
      outline: `2px solid ${colors.primary[500]}`,
      outlineOffset: '2px'
    },
    loading: {
      cursor: 'not-allowed',
      opacity: '0.7'
    }
  },

  animation: {
    transition: `all ${animation.duration.fast} ${animation.easing.out}`
  }
} as const;

// Input Component Specifications
export const inputSpecs = {
  variants: {
    default: {
      background: colors.neutral[0],
      backgroundFocus: colors.neutral[0],
      backgroundDisabled: colors.neutral[50],
      text: colors.neutral[900],
      textPlaceholder: colors.neutral[400],
      textDisabled: colors.neutral[400],
      border: `1px solid ${colors.neutral[300]}`,
      borderFocus: `1px solid ${colors.primary[500]}`,
      borderError: `1px solid ${colors.error[500]}`,
      borderDisabled: `1px solid ${colors.neutral[200]}`,
      shadow: shadows.sm,
      shadowFocus: `${shadows.sm}, 0 0 0 3px ${colors.primary[500]}20`
    },

    search: {
      background: colors.neutral[50],
      backgroundFocus: colors.neutral[0],
      backgroundDisabled: colors.neutral[100],
      text: colors.neutral[900],
      textPlaceholder: colors.neutral[500],
      textDisabled: colors.neutral[400],
      border: `1px solid ${colors.neutral[200]}`,
      borderFocus: `1px solid ${colors.primary[400]}`,
      borderError: `1px solid ${colors.error[500]}`,
      borderDisabled: `1px solid ${colors.neutral[200]}`,
      shadow: 'none',
      shadowFocus: `0 0 0 3px ${colors.primary[500]}15`
    }
  },

  sizes: {
    sm: {
      height: '2rem',
      padding: '0 0.75rem',
      fontSize: typography.fontSize.sm,
      borderRadius: borderRadius.md
    },
    md: {
      height: '2.5rem',
      padding: '0 1rem',
      fontSize: typography.fontSize.base,
      borderRadius: borderRadius.md
    },
    lg: {
      height: '3rem',
      padding: '0 1.25rem',
      fontSize: typography.fontSize.lg,
      borderRadius: borderRadius.lg
    }
  },

  animation: {
    transition: `all ${animation.duration.fast} ${animation.easing.out}`
  }
} as const;

// Card Component Specifications
export const cardSpecs = {
  variants: {
    default: {
      background: colors.neutral[0],
      border: `1px solid ${colors.neutral[200]}`,
      shadow: shadows.card.rest,
      shadowHover: shadows.card.hover,
      shadowActive: shadows.card.active
    },

    elevated: {
      background: colors.neutral[0],
      border: 'none',
      shadow: shadows.md,
      shadowHover: shadows.lg,
      shadowActive: shadows.base
    },

    outlined: {
      background: colors.neutral[0],
      border: `2px solid ${colors.neutral[200]}`,
      shadow: 'none',
      shadowHover: shadows.sm,
      shadowActive: 'none'
    },

    filled: {
      background: colors.neutral[50],
      border: 'none',
      shadow: 'none',
      shadowHover: shadows.sm,
      shadowActive: 'none'
    }
  },

  sizes: {
    sm: {
      padding: spacing[4],
      borderRadius: borderRadius.lg
    },
    md: {
      padding: spacing[6],
      borderRadius: borderRadius.xl
    },
    lg: {
      padding: spacing[8],
      borderRadius: borderRadius['2xl']
    }
  },

  animation: {
    transition: `all ${animation.duration.normal} ${animation.easing.out}`,
    hover: {
      transform: 'translateY(-2px)'
    }
  }
} as const;

// Flashcard Component Specifications
export const flashcardSpecs = {
  dimensions: {
    width: '20rem',      // 320px
    height: '12rem',     // 192px
    aspectRatio: '5/3'
  },

  variants: {
    front: {
      background: colors.neutral[0],
      border: `1px solid ${colors.neutral[200]}`,
      shadow: shadows.flashcard.front,
      shadowHover: shadows.flashcard.back
    },

    back: {
      background: colors.primary[50],
      border: `1px solid ${colors.primary[200]}`,
      shadow: shadows.flashcard.back,
      shadowHover: shadows.flashcard.flip
    }
  },

  difficulty: {
    easy: {
      borderColor: colors.success[300],
      accentColor: colors.success[500],
      backgroundColor: colors.success[50]
    },
    medium: {
      borderColor: colors.warning[300],
      accentColor: colors.warning[500],
      backgroundColor: colors.warning[50]
    },
    hard: {
      borderColor: colors.error[300],
      accentColor: colors.error[500],
      backgroundColor: colors.error[50]
    }
  },

  cardTypes: {
    definition: {
      icon: '📖',
      accentColor: colors.primary[500]
    },
    questionAnswer: {
      icon: '❓',
      accentColor: colors.secondary[500]
    },
    fillBlank: {
      icon: '✏️',
      accentColor: colors.warning[500]
    },
    trueFalse: {
      icon: '✅',
      accentColor: colors.success[500]
    },
    multipleChoice: {
      icon: '📝',
      accentColor: colors.neutral[600]
    }
  },

  animation: {
    flip: {
      duration: animation.cardFlip.duration,
      easing: animation.cardFlip.easing,
      perspective: '1000px'
    },
    hover: {
      transform: 'translateY(-4px) scale(1.02)',
      transition: `transform ${animation.duration.normal} ${animation.easing.out}`
    }
  },

  typography: {
    front: {
      fontSize: typography.fontSize.lg,
      fontWeight: typography.fontWeight.medium,
      lineHeight: typography.lineHeight.relaxed,
      textAlign: 'center' as const
    },
    back: {
      fontSize: typography.fontSize.base,
      fontWeight: typography.fontWeight.normal,
      lineHeight: typography.lineHeight.relaxed,
      textAlign: 'left' as const
    }
  }
} as const;

// Deck Card Component Specifications
export const deckCardSpecs = {
  dimensions: {
    width: '16rem',      // 256px
    height: '10rem',     // 160px
    aspectRatio: '8/5'
  },

  themes: {
    ocean: {
      background: `linear-gradient(135deg, ${colors.deckThemes.ocean.background} 0%, ${colors.deckThemes.ocean.surface} 100%)`,
      border: `1px solid ${colors.deckThemes.ocean.primary}30`,
      accentColor: colors.deckThemes.ocean.primary,
      textColor: colors.deckThemes.ocean.secondary
    },
    forest: {
      background: `linear-gradient(135deg, ${colors.deckThemes.forest.background} 0%, ${colors.deckThemes.forest.surface} 100%)`,
      border: `1px solid ${colors.deckThemes.forest.primary}30`,
      accentColor: colors.deckThemes.forest.primary,
      textColor: colors.deckThemes.forest.secondary
    },
    sunset: {
      background: `linear-gradient(135deg, ${colors.deckThemes.sunset.background} 0%, ${colors.deckThemes.sunset.surface} 100%)`,
      border: `1px solid ${colors.deckThemes.sunset.primary}30`,
      accentColor: colors.deckThemes.sunset.primary,
      textColor: colors.deckThemes.sunset.secondary
    },
    lavender: {
      background: `linear-gradient(135deg, ${colors.deckThemes.lavender.background} 0%, ${colors.deckThemes.lavender.surface} 100%)`,
      border: `1px solid ${colors.deckThemes.lavender.primary}30`,
      accentColor: colors.deckThemes.lavender.primary,
      textColor: colors.deckThemes.lavender.secondary
    },
    midnight: {
      background: `linear-gradient(135deg, ${colors.deckThemes.midnight.background} 0%, ${colors.deckThemes.midnight.surface} 100%)`,
      border: `1px solid ${colors.deckThemes.midnight.primary}30`,
      accentColor: colors.deckThemes.midnight.primary,
      textColor: colors.deckThemes.midnight.accent
    }
  },

  animation: {
    hover: {
      transform: 'translateY(-3px) scale(1.02)',
      transition: `transform ${animation.duration.normal} ${animation.easing.out}`
    }
  }
} as const;

// Modal Component Specifications
export const modalSpecs = {
  overlay: {
    background: 'rgba(0, 0, 0, 0.5)',
    backdropFilter: 'blur(4px)',
    zIndex: 1400
  },

  container: {
    background: colors.neutral[0],
    borderRadius: borderRadius['2xl'],
    shadow: shadows['2xl'],
    maxWidth: '32rem',
    maxHeight: '90vh',
    padding: spacing[6]
  },

  animation: {
    enter: {
      opacity: '0',
      transform: 'scale(0.95) translateY(-10px)',
      transition: `all ${animation.duration.normal} ${animation.easing.out}`
    },
    enterActive: {
      opacity: '1',
      transform: 'scale(1) translateY(0)'
    },
    exit: {
      opacity: '1',
      transform: 'scale(1) translateY(0)',
      transition: `all ${animation.duration.fast} ${animation.easing.in}`
    },
    exitActive: {
      opacity: '0',
      transform: 'scale(0.95) translateY(-10px)'
    }
  }
} as const;

// Toast Component Specifications
export const toastSpecs = {
  variants: {
    success: {
      background: colors.success[500],
      text: colors.neutral[0],
      icon: '✅',
      border: `1px solid ${colors.success[600]}`
    },
    error: {
      background: colors.error[500],
      text: colors.neutral[0],
      icon: '❌',
      border: `1px solid ${colors.error[600]}`
    },
    warning: {
      background: colors.warning[500],
      text: colors.neutral[0],
      icon: '⚠️',
      border: `1px solid ${colors.warning[600]}`
    },
    info: {
      background: colors.primary[500],
      text: colors.neutral[0],
      icon: 'ℹ️',
      border: `1px solid ${colors.primary[600]}`
    }
  },

  positioning: {
    top: spacing[4],
    right: spacing[4],
    zIndex: 1700
  },

  animation: {
    enter: {
      transform: 'translateX(100%)',
      opacity: '0',
      transition: `all ${animation.duration.normal} ${animation.easing.out}`
    },
    enterActive: {
      transform: 'translateX(0)',
      opacity: '1'
    },
    exit: {
      transform: 'translateX(0)',
      opacity: '1',
      transition: `all ${animation.duration.fast} ${animation.easing.in}`
    },
    exitActive: {
      transform: 'translateX(100%)',
      opacity: '0'
    }
  }
} as const;

// Progress Component Specifications
export const progressSpecs = {
  variants: {
    linear: {
      height: '0.5rem',
      background: colors.neutral[200],
      fill: colors.primary[500],
      borderRadius: borderRadius.full
    },
    circular: {
      size: '3rem',
      strokeWidth: '4px',
      background: colors.neutral[200],
      fill: colors.primary[500]
    }
  },

  animation: {
    indeterminate: {
      duration: '2s',
      easing: 'ease-in-out',
      iteration: 'infinite'
    },
    fill: {
      transition: `width ${animation.duration.slow} ${animation.easing.out}`
    }
  }
} as const;

// Badge Component Specifications
export const badgeSpecs = {
  variants: {
    default: {
      background: colors.neutral[100],
      text: colors.neutral[700],
      border: `1px solid ${colors.neutral[200]}`
    },
    primary: {
      background: colors.primary[100],
      text: colors.primary[700],
      border: `1px solid ${colors.primary[200]}`
    },
    success: {
      background: colors.success[100],
      text: colors.success[700],
      border: `1px solid ${colors.success[200]}`
    },
    warning: {
      background: colors.warning[100],
      text: colors.warning[700],
      border: `1px solid ${colors.warning[200]}`
    },
    error: {
      background: colors.error[100],
      text: colors.error[700],
      border: `1px solid ${colors.error[200]}`
    }
  },

  sizes: {
    sm: {
      padding: '0.125rem 0.375rem',
      fontSize: typography.fontSize.xs,
      borderRadius: borderRadius.sm
    },
    md: {
      padding: '0.25rem 0.5rem',
      fontSize: typography.fontSize.sm,
      borderRadius: borderRadius.base
    }
  }
} as const;
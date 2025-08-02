/**
 * Deck Theme System
 * Defines customizable themes for decks with backgrounds, colors, and visual styles
 */

import { colors } from './tokens';

export interface DeckTheme {
  id: string;
  name: string;
  displayName: string;
  description: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: {
      primary: string;
      secondary: string;
      muted: string;
    };
  };
  gradients: {
    primary: string;
    secondary: string;
    background: string;
  };
  patterns?: {
    background?: string;
    overlay?: string;
  };
  shadows: {
    card: string;
    elevated: string;
  };
}

// Predefined Deck Themes
export const deckThemes: Record<string, DeckTheme> = {
  ocean: {
    id: 'ocean',
    name: 'ocean',
    displayName: 'Ocean Breeze',
    description: 'Calm blues and aqua tones inspired by the ocean',
    colors: {
      primary: colors.deckThemes.ocean.primary,
      secondary: colors.deckThemes.ocean.secondary,
      accent: colors.deckThemes.ocean.accent,
      background: colors.deckThemes.ocean.background,
      surface: colors.deckThemes.ocean.surface,
      text: {
        primary: colors.neutral[800],
        secondary: colors.neutral[600],
        muted: colors.neutral[500]
      }
    },
    gradients: {
      primary: `linear-gradient(135deg, ${colors.deckThemes.ocean.primary} 0%, ${colors.deckThemes.ocean.secondary} 100%)`,
      secondary: `linear-gradient(135deg, ${colors.deckThemes.ocean.accent} 0%, ${colors.deckThemes.ocean.primary} 100%)`,
      background: `linear-gradient(135deg, ${colors.deckThemes.ocean.background} 0%, ${colors.deckThemes.ocean.surface} 100%)`
    },
    patterns: {
      background: `radial-gradient(circle at 20% 80%, ${colors.deckThemes.ocean.accent}20 0%, transparent 50%), radial-gradient(circle at 80% 20%, ${colors.deckThemes.ocean.primary}15 0%, transparent 50%)`,
      overlay: `linear-gradient(45deg, transparent 30%, ${colors.deckThemes.ocean.accent}10 50%, transparent 70%)`
    },
    shadows: {
      card: `0 4px 12px ${colors.deckThemes.ocean.primary}20`,
      elevated: `0 8px 24px ${colors.deckThemes.ocean.primary}25`
    }
  },

  forest: {
    id: 'forest',
    name: 'forest',
    displayName: 'Forest Grove',
    description: 'Natural greens and earth tones from the forest',
    colors: {
      primary: colors.deckThemes.forest.primary,
      secondary: colors.deckThemes.forest.secondary,
      accent: colors.deckThemes.forest.accent,
      background: colors.deckThemes.forest.background,
      surface: colors.deckThemes.forest.surface,
      text: {
        primary: colors.neutral[800],
        secondary: colors.neutral[600],
        muted: colors.neutral[500]
      }
    },
    gradients: {
      primary: `linear-gradient(135deg, ${colors.deckThemes.forest.primary} 0%, ${colors.deckThemes.forest.secondary} 100%)`,
      secondary: `linear-gradient(135deg, ${colors.deckThemes.forest.accent} 0%, ${colors.deckThemes.forest.primary} 100%)`,
      background: `linear-gradient(135deg, ${colors.deckThemes.forest.background} 0%, ${colors.deckThemes.forest.surface} 100%)`
    },
    patterns: {
      background: `radial-gradient(circle at 30% 70%, ${colors.deckThemes.forest.accent}15 0%, transparent 50%), radial-gradient(circle at 70% 30%, ${colors.deckThemes.forest.primary}10 0%, transparent 50%)`,
      overlay: `linear-gradient(60deg, transparent 40%, ${colors.deckThemes.forest.accent}08 60%, transparent 80%)`
    },
    shadows: {
      card: `0 4px 12px ${colors.deckThemes.forest.primary}20`,
      elevated: `0 8px 24px ${colors.deckThemes.forest.primary}25`
    }
  },

  sunset: {
    id: 'sunset',
    name: 'sunset',
    displayName: 'Golden Sunset',
    description: 'Warm oranges and yellows like a beautiful sunset',
    colors: {
      primary: colors.deckThemes.sunset.primary,
      secondary: colors.deckThemes.sunset.secondary,
      accent: colors.deckThemes.sunset.accent,
      background: colors.deckThemes.sunset.background,
      surface: colors.deckThemes.sunset.surface,
      text: {
        primary: colors.neutral[800],
        secondary: colors.neutral[600],
        muted: colors.neutral[500]
      }
    },
    gradients: {
      primary: `linear-gradient(135deg, ${colors.deckThemes.sunset.primary} 0%, ${colors.deckThemes.sunset.secondary} 100%)`,
      secondary: `linear-gradient(135deg, ${colors.deckThemes.sunset.accent} 0%, ${colors.deckThemes.sunset.primary} 100%)`,
      background: `linear-gradient(135deg, ${colors.deckThemes.sunset.background} 0%, ${colors.deckThemes.sunset.surface} 100%)`
    },
    patterns: {
      background: `radial-gradient(circle at 25% 75%, ${colors.deckThemes.sunset.accent}18 0%, transparent 50%), radial-gradient(circle at 75% 25%, ${colors.deckThemes.sunset.primary}12 0%, transparent 50%)`,
      overlay: `linear-gradient(30deg, transparent 35%, ${colors.deckThemes.sunset.accent}12 55%, transparent 75%)`
    },
    shadows: {
      card: `0 4px 12px ${colors.deckThemes.sunset.primary}20`,
      elevated: `0 8px 24px ${colors.deckThemes.sunset.primary}25`
    }
  },

  lavender: {
    id: 'lavender',
    name: 'lavender',
    displayName: 'Lavender Fields',
    description: 'Soft purples and magentas like lavender flowers',
    colors: {
      primary: colors.deckThemes.lavender.primary,
      secondary: colors.deckThemes.lavender.secondary,
      accent: colors.deckThemes.lavender.accent,
      background: colors.deckThemes.lavender.background,
      surface: colors.deckThemes.lavender.surface,
      text: {
        primary: colors.neutral[800],
        secondary: colors.neutral[600],
        muted: colors.neutral[500]
      }
    },
    gradients: {
      primary: `linear-gradient(135deg, ${colors.deckThemes.lavender.primary} 0%, ${colors.deckThemes.lavender.secondary} 100%)`,
      secondary: `linear-gradient(135deg, ${colors.deckThemes.lavender.accent} 0%, ${colors.deckThemes.lavender.primary} 100%)`,
      background: `linear-gradient(135deg, ${colors.deckThemes.lavender.background} 0%, ${colors.deckThemes.lavender.surface} 100%)`
    },
    patterns: {
      background: `radial-gradient(circle at 35% 65%, ${colors.deckThemes.lavender.accent}16 0%, transparent 50%), radial-gradient(circle at 65% 35%, ${colors.deckThemes.lavender.primary}12 0%, transparent 50%)`,
      overlay: `linear-gradient(120deg, transparent 30%, ${colors.deckThemes.lavender.accent}10 50%, transparent 70%)`
    },
    shadows: {
      card: `0 4px 12px ${colors.deckThemes.lavender.primary}20`,
      elevated: `0 8px 24px ${colors.deckThemes.lavender.primary}25`
    }
  },

  midnight: {
    id: 'midnight',
    name: 'midnight',
    displayName: 'Midnight Sky',
    description: 'Deep blues and purples like the night sky',
    colors: {
      primary: colors.deckThemes.midnight.primary,
      secondary: colors.deckThemes.midnight.secondary,
      accent: colors.deckThemes.midnight.accent,
      background: colors.deckThemes.midnight.background,
      surface: colors.deckThemes.midnight.surface,
      text: {
        primary: colors.neutral[100],
        secondary: colors.neutral[300],
        muted: colors.neutral[400]
      }
    },
    gradients: {
      primary: `linear-gradient(135deg, ${colors.deckThemes.midnight.primary} 0%, ${colors.deckThemes.midnight.secondary} 100%)`,
      secondary: `linear-gradient(135deg, ${colors.deckThemes.midnight.accent} 0%, ${colors.deckThemes.midnight.primary} 100%)`,
      background: `linear-gradient(135deg, ${colors.deckThemes.midnight.background} 0%, ${colors.deckThemes.midnight.surface} 100%)`
    },
    patterns: {
      background: `radial-gradient(circle at 40% 60%, ${colors.deckThemes.midnight.accent}20 0%, transparent 50%), radial-gradient(circle at 60% 40%, ${colors.deckThemes.midnight.primary}15 0%, transparent 50%)`,
      overlay: `linear-gradient(90deg, transparent 25%, ${colors.deckThemes.midnight.accent}15 50%, transparent 75%)`
    },
    shadows: {
      card: `0 4px 12px ${colors.deckThemes.midnight.primary}30`,
      elevated: `0 8px 24px ${colors.deckThemes.midnight.primary}35`
    }
  },

  // Additional themes for variety
  cherry: {
    id: 'cherry',
    name: 'cherry',
    displayName: 'Cherry Blossom',
    description: 'Soft pinks and roses like cherry blossoms',
    colors: {
      primary: '#ec4899',
      secondary: '#db2777',
      accent: '#f472b6',
      background: '#fdf2f8',
      surface: '#fce7f3',
      text: {
        primary: colors.neutral[800],
        secondary: colors.neutral[600],
        muted: colors.neutral[500]
      }
    },
    gradients: {
      primary: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)',
      secondary: 'linear-gradient(135deg, #f472b6 0%, #ec4899 100%)',
      background: 'linear-gradient(135deg, #fdf2f8 0%, #fce7f3 100%)'
    },
    patterns: {
      background: 'radial-gradient(circle at 30% 70%, #f472b620 0%, transparent 50%), radial-gradient(circle at 70% 30%, #ec489915 0%, transparent 50%)',
      overlay: 'linear-gradient(45deg, transparent 30%, #f472b610 50%, transparent 70%)'
    },
    shadows: {
      card: '0 4px 12px #ec489920',
      elevated: '0 8px 24px #ec489925'
    }
  },

  arctic: {
    id: 'arctic',
    name: 'arctic',
    displayName: 'Arctic Ice',
    description: 'Cool whites and light blues like arctic ice',
    colors: {
      primary: '#0ea5e9',
      secondary: '#0284c7',
      accent: '#7dd3fc',
      background: '#f8fafc',
      surface: '#f1f5f9',
      text: {
        primary: colors.neutral[800],
        secondary: colors.neutral[600],
        muted: colors.neutral[500]
      }
    },
    gradients: {
      primary: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
      secondary: 'linear-gradient(135deg, #7dd3fc 0%, #0ea5e9 100%)',
      background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)'
    },
    patterns: {
      background: 'radial-gradient(circle at 25% 75%, #7dd3fc15 0%, transparent 50%), radial-gradient(circle at 75% 25%, #0ea5e910 0%, transparent 50%)',
      overlay: 'linear-gradient(60deg, transparent 40%, #7dd3fc08 60%, transparent 80%)'
    },
    shadows: {
      card: '0 4px 12px #0ea5e920',
      elevated: '0 8px 24px #0ea5e925'
    }
  }
};

// Theme utilities
export const getThemeById = (themeId: string): DeckTheme | undefined => {
  return deckThemes[themeId];
};

export const getThemeNames = (): string[] => {
  return Object.keys(deckThemes);
};

export const getThemeDisplayNames = (): Array<{ id: string; name: string; displayName: string }> => {
  return Object.values(deckThemes).map(theme => ({
    id: theme.id,
    name: theme.name,
    displayName: theme.displayName
  }));
};

// Default theme
export const defaultTheme = deckThemes.ocean;

// Theme CSS generator
export const generateThemeCSS = (theme: DeckTheme): string => {
  return `
    .deck-theme-${theme.id} {
      --theme-primary: ${theme.colors.primary};
      --theme-secondary: ${theme.colors.secondary};
      --theme-accent: ${theme.colors.accent};
      --theme-background: ${theme.colors.background};
      --theme-surface: ${theme.colors.surface};
      --theme-text-primary: ${theme.colors.text.primary};
      --theme-text-secondary: ${theme.colors.text.secondary};
      --theme-text-muted: ${theme.colors.text.muted};
      --theme-gradient-primary: ${theme.gradients.primary};
      --theme-gradient-secondary: ${theme.gradients.secondary};
      --theme-gradient-background: ${theme.gradients.background};
      --theme-shadow-card: ${theme.shadows.card};
      --theme-shadow-elevated: ${theme.shadows.elevated};
      ${theme.patterns?.background ? `--theme-pattern-background: ${theme.patterns.background};` : ''}
      ${theme.patterns?.overlay ? `--theme-pattern-overlay: ${theme.patterns.overlay};` : ''}
    }
  `;
};

// Generate all theme CSS
export const generateAllThemeCSS = (): string => {
  return Object.values(deckThemes)
    .map(theme => generateThemeCSS(theme))
    .join('\n');
};
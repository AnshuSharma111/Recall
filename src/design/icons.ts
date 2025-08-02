/**
 * Icon System
 * Defines icon mappings, sizes, and usage patterns for the design system
 */

// Icon sizes
export const iconSizes = {
  xs: '12px',
  sm: '16px',
  md: '20px',
  lg: '24px',
  xl: '32px',
  '2xl': '48px'
} as const;

// Icon categories and mappings
export const icons = {
  // Navigation
  navigation: {
    home: '🏠',
    dashboard: '📊',
    decks: '📚',
    study: '🎓',
    settings: '⚙️',
    profile: '👤',
    help: '❓',
    back: '←',
    forward: '→',
    up: '↑',
    down: '↓',
    menu: '☰',
    close: '✕'
  },

  // Actions
  actions: {
    add: '➕',
    edit: '✏️',
    delete: '🗑️',
    save: '💾',
    cancel: '✕',
    confirm: '✓',
    copy: '📋',
    share: '📤',
    download: '⬇️',
    upload: '⬆️',
    refresh: '🔄',
    search: '🔍',
    filter: '🔽',
    sort: '↕️',
    play: '▶️',
    pause: '⏸️',
    stop: '⏹️',
    skip: '⏭️',
    previous: '⏮️'
  },

  // Content Types
  contentTypes: {
    text: '📄',
    pdf: '📕',
    image: '🖼️',
    audio: '🎵',
    video: '🎬',
    document: '📃',
    folder: '📁',
    file: '📄'
  },

  // Card Types
  cardTypes: {
    definition: '📖',
    questionAnswer: '❓',
    fillBlank: '✏️',
    trueFalse: '✅',
    multipleChoice: '📝',
    flashcard: '🃏'
  },

  // Difficulty Levels
  difficulty: {
    easy: '🟢',
    medium: '🟡',
    hard: '🔴',
    expert: '🟣'
  },

  // Status Indicators
  status: {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️',
    loading: '⏳',
    pending: '⏱️',
    complete: '✓',
    incomplete: '○',
    new: '🆕',
    updated: '🔄'
  },

  // Study Progress
  progress: {
    streak: '🔥',
    achievement: '🏆',
    star: '⭐',
    medal: '🏅',
    trophy: '🏆',
    target: '🎯',
    chart: '📈',
    calendar: '📅',
    clock: '🕐',
    timer: '⏲️'
  },

  // Themes and Customization
  themes: {
    ocean: '🌊',
    forest: '🌲',
    sunset: '🌅',
    lavender: '💜',
    midnight: '🌙',
    cherry: '🌸',
    arctic: '❄️',
    palette: '🎨',
    brush: '🖌️'
  },

  // User Interface
  ui: {
    expand: '⬇️',
    collapse: '⬆️',
    maximize: '⛶',
    minimize: '⊟',
    fullscreen: '⛶',
    windowed: '⊞',
    sidebar: '⋮',
    grid: '⊞',
    list: '☰',
    card: '▢',
    toggle: '⚪'
  },

  // Communication
  communication: {
    notification: '🔔',
    message: '💬',
    email: '📧',
    phone: '📞',
    chat: '💭',
    feedback: '📝',
    support: '🆘'
  },

  // Data and Analytics
  data: {
    database: '🗄️',
    export: '📤',
    import: '📥',
    sync: '🔄',
    backup: '💾',
    restore: '⚡',
    analytics: '📊',
    report: '📋'
  }
} as const;

// Icon utility functions
export const getIcon = (category: keyof typeof icons, name: string): string => {
  const categoryIcons = icons[category] as Record<string, string>;
  return categoryIcons?.[name] || '❓';
};

// Icon component specifications
export const iconSpecs = {
  // Default styling
  default: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: iconSizes.md,
    lineHeight: '1',
    userSelect: 'none' as const
  },

  // Size variants
  sizes: {
    xs: {
      fontSize: iconSizes.xs,
      width: iconSizes.xs,
      height: iconSizes.xs
    },
    sm: {
      fontSize: iconSizes.sm,
      width: iconSizes.sm,
      height: iconSizes.sm
    },
    md: {
      fontSize: iconSizes.md,
      width: iconSizes.md,
      height: iconSizes.md
    },
    lg: {
      fontSize: iconSizes.lg,
      width: iconSizes.lg,
      height: iconSizes.lg
    },
    xl: {
      fontSize: iconSizes.xl,
      width: iconSizes.xl,
      height: iconSizes.xl
    },
    '2xl': {
      fontSize: iconSizes['2xl'],
      width: iconSizes['2xl'],
      height: iconSizes['2xl']
    }
  },

  // Interactive states
  interactive: {
    cursor: 'pointer',
    transition: 'all 0.2s ease-out',
    hover: {
      transform: 'scale(1.1)',
      opacity: '0.8'
    },
    active: {
      transform: 'scale(0.95)'
    }
  },

  // Color variants
  colors: {
    default: {
      color: 'var(--text-secondary)'
    },
    primary: {
      color: 'var(--primary)'
    },
    secondary: {
      color: 'var(--secondary)'
    },
    success: {
      color: 'var(--success)'
    },
    warning: {
      color: 'var(--warning)'
    },
    error: {
      color: 'var(--error)'
    },
    muted: {
      color: 'var(--text-muted)',
      opacity: '0.6'
    }
  }
} as const;

// Icon button specifications
export const iconButtonSpecs = {
  base: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    borderRadius: '50%',
    transition: 'all 0.2s ease-out',
    userSelect: 'none' as const
  },

  sizes: {
    sm: {
      width: '2rem',
      height: '2rem',
      fontSize: iconSizes.sm
    },
    md: {
      width: '2.5rem',
      height: '2.5rem',
      fontSize: iconSizes.md
    },
    lg: {
      width: '3rem',
      height: '3rem',
      fontSize: iconSizes.lg
    }
  },

  variants: {
    ghost: {
      background: 'transparent',
      hover: {
        background: 'var(--surface-hover)'
      }
    },
    filled: {
      background: 'var(--surface)',
      hover: {
        background: 'var(--surface-hover)'
      }
    },
    outlined: {
      background: 'transparent',
      border: '1px solid var(--border)',
      hover: {
        background: 'var(--surface-hover)',
        borderColor: 'var(--border-hover)'
      }
    }
  }
} as const;

// Contextual icon mappings
export const contextualIcons = {
  // Study session states
  studyStates: {
    ready: icons.actions.play,
    active: icons.progress.timer,
    paused: icons.actions.pause,
    completed: icons.status.complete,
    failed: icons.status.error
  },

  // Card states
  cardStates: {
    new: icons.status.new,
    learning: icons.progress.target,
    reviewing: icons.actions.refresh,
    mastered: icons.status.success,
    difficult: icons.difficulty.hard
  },

  // Deck categories
  deckCategories: {
    language: '🗣️',
    science: '🔬',
    history: '📜',
    math: '🔢',
    literature: '📚',
    art: '🎨',
    music: '🎵',
    sports: '⚽',
    technology: '💻',
    medicine: '⚕️',
    business: '💼',
    cooking: '👨‍🍳',
    travel: '✈️',
    nature: '🌿',
    general: '📋'
  },

  // Achievement types
  achievementTypes: {
    streak: icons.progress.streak,
    volume: icons.progress.chart,
    accuracy: icons.progress.target,
    speed: icons.progress.timer,
    milestone: icons.progress.trophy,
    consistency: icons.progress.calendar,
    mastery: icons.progress.star,
    dedication: icons.progress.medal
  }
} as const;
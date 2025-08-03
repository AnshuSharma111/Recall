import { describe, it, expect } from 'vitest';
import { colors, typography, spacing, borderRadius, shadows, animation, components, themes } from '../../design/tokens';

describe('Design Tokens', () => {
  describe('Colors', () => {
    it('should have primary color palette', () => {
      expect(colors.primary).toBeDefined();
      expect(colors.primary[500]).toBe('#0ea5e9');
      expect(colors.primary[50]).toBeDefined();
      expect(colors.primary[950]).toBeDefined();
    });

    it('should have secondary color palette', () => {
      expect(colors.secondary).toBeDefined();
      expect(colors.secondary[500]).toBe('#d946ef');
    });

    it('should have neutral color palette', () => {
      expect(colors.neutral).toBeDefined();
      expect(colors.neutral[0]).toBe('#ffffff');
      expect(colors.neutral[950]).toBe('#020617');
    });

    it('should have semantic colors', () => {
      expect(colors.success).toBeDefined();
      expect(colors.warning).toBeDefined();
      expect(colors.error).toBeDefined();
    });

    it('should have deck theme colors', () => {
      expect(colors.deckThemes).toBeDefined();
      expect(colors.deckThemes.ocean).toBeDefined();
      expect(colors.deckThemes.forest).toBeDefined();
      expect(colors.deckThemes.sunset).toBeDefined();
      expect(colors.deckThemes.lavender).toBeDefined();
      expect(colors.deckThemes.midnight).toBeDefined();
    });

    it('should have consistent color structure across themes', () => {
      Object.values(colors.deckThemes).forEach(theme => {
        expect(theme).toHaveProperty('primary');
        expect(theme).toHaveProperty('secondary');
        expect(theme).toHaveProperty('background');
        expect(theme).toHaveProperty('surface');
        expect(theme).toHaveProperty('accent');
      });
    });
  });

  describe('Typography', () => {
    it('should have font families', () => {
      expect(typography.fontFamily.sans).toContain('Inter');
      expect(typography.fontFamily.mono).toContain('JetBrains Mono');
      expect(typography.fontFamily.display).toContain('Poppins');
    });

    it('should have font sizes', () => {
      expect(typography.fontSize.xs).toBe('0.75rem');
      expect(typography.fontSize.base).toBe('1rem');
      expect(typography.fontSize['6xl']).toBe('3.75rem');
    });

    it('should have font weights', () => {
      expect(typography.fontWeight.normal).toBe('400');
      expect(typography.fontWeight.bold).toBe('700');
    });

    it('should have line heights', () => {
      expect(typography.lineHeight.normal).toBe('1.5');
      expect(typography.lineHeight.tight).toBe('1.25');
    });

    it('should have letter spacing', () => {
      expect(typography.letterSpacing.normal).toBe('0em');
      expect(typography.letterSpacing.wide).toBe('0.025em');
    });
  });

  describe('Spacing', () => {
    it('should have consistent spacing scale', () => {
      expect(spacing[0]).toBe('0px');
      expect(spacing[1]).toBe('0.25rem');
      expect(spacing[4]).toBe('1rem');
      expect(spacing[64]).toBe('16rem');
    });

    it('should have all required spacing values', () => {
      const requiredSpacing = [0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24, 32, 40, 48, 56, 64];
      requiredSpacing.forEach(value => {
        expect((spacing as any)[value]).toBeDefined();
      });
    });
  });

  describe('Border Radius', () => {
    it('should have border radius scale', () => {
      expect(borderRadius.none).toBe('0px');
      expect(borderRadius.sm).toBe('0.125rem');
      expect(borderRadius.full).toBe('9999px');
    });
  });

  describe('Shadows', () => {
    it('should have shadow scale', () => {
      expect(shadows.none).toBe('none');
      expect(shadows.sm).toBeDefined();
      expect(shadows['2xl']).toBeDefined();
    });

    it('should have card-specific shadows', () => {
      expect(shadows.card.rest).toBeDefined();
      expect(shadows.card.hover).toBeDefined();
      expect(shadows.card.active).toBeDefined();
      expect(shadows.card.focus).toBeDefined();
    });

    it('should have flashcard shadows', () => {
      expect(shadows.flashcard.front).toBeDefined();
      expect(shadows.flashcard.back).toBeDefined();
      expect(shadows.flashcard.flip).toBeDefined();
    });
  });

  describe('Animation', () => {
    it('should have duration values', () => {
      expect(animation.duration.fast).toBe('150ms');
      expect(animation.duration.normal).toBe('250ms');
      expect(animation.duration.slow).toBe('350ms');
    });

    it('should have easing functions', () => {
      expect(animation.easing.linear).toBe('linear');
      expect(animation.easing.inOut).toBe('cubic-bezier(0.4, 0, 0.2, 1)');
    });

    it('should have card flip animation', () => {
      expect(animation.cardFlip.duration).toBe('600ms');
      expect(animation.cardFlip.easing).toBeDefined();
    });
  });

  describe('Component Tokens', () => {
    it('should have button component tokens', () => {
      expect(components.button.height.md).toBe('2.5rem');
      expect(components.button.padding.md).toBe('0.75rem 1.5rem');
    });

    it('should have input component tokens', () => {
      expect(components.input.height.md).toBe('2.5rem');
      expect(components.input.padding.md).toBe('0.75rem 1rem');
    });

    it('should have card component tokens', () => {
      expect(components.card.padding.md).toBe('1.5rem');
      expect(components.card.minHeight.flashcard).toBe('12rem');
    });
  });

  describe('Themes', () => {
    it('should have light theme', () => {
      expect(themes.light).toBeDefined();
      expect(themes.light.background).toBe(colors.neutral[0]);
      expect(themes.light.text.primary).toBe(colors.neutral[900]);
    });

    it('should have dark theme', () => {
      expect(themes.dark).toBeDefined();
      expect(themes.dark.background).toBe(colors.neutral[900]);
      expect(themes.dark.text.primary).toBe(colors.neutral[50]);
    });
  });
});
import { describe, it, expect } from 'vitest';
import { 
  deckThemes, 
  getThemeById, 
  getThemeNames, 
  getThemeDisplayNames, 
  defaultTheme,
  generateThemeCSS,
  generateAllThemeCSS
} from '../../design/themes';

describe('Deck Themes', () => {
  describe('Theme Structure', () => {
    it('should have all required themes', () => {
      const expectedThemes = ['ocean', 'forest', 'sunset', 'lavender', 'midnight', 'cherry', 'arctic'];
      expectedThemes.forEach(themeName => {
        expect(deckThemes[themeName]).toBeDefined();
      });
    });

    it('should have consistent theme structure', () => {
      Object.values(deckThemes).forEach(theme => {
        expect(theme).toHaveProperty('id');
        expect(theme).toHaveProperty('name');
        expect(theme).toHaveProperty('displayName');
        expect(theme).toHaveProperty('description');
        expect(theme).toHaveProperty('colors');
        expect(theme).toHaveProperty('gradients');
        expect(theme).toHaveProperty('shadows');
        
        // Check colors structure
        expect(theme.colors).toHaveProperty('primary');
        expect(theme.colors).toHaveProperty('secondary');
        expect(theme.colors).toHaveProperty('accent');
        expect(theme.colors).toHaveProperty('background');
        expect(theme.colors).toHaveProperty('surface');
        expect(theme.colors).toHaveProperty('text');
        
        // Check text colors structure
        expect(theme.colors.text).toHaveProperty('primary');
        expect(theme.colors.text).toHaveProperty('secondary');
        expect(theme.colors.text).toHaveProperty('muted');
        
        // Check gradients structure
        expect(theme.gradients).toHaveProperty('primary');
        expect(theme.gradients).toHaveProperty('secondary');
        expect(theme.gradients).toHaveProperty('background');
        
        // Check shadows structure
        expect(theme.shadows).toHaveProperty('card');
        expect(theme.shadows).toHaveProperty('elevated');
      });
    });

    it('should have valid color values', () => {
      Object.values(deckThemes).forEach(theme => {
        // Check that colors are valid hex codes
        expect(theme.colors.primary).toMatch(/^#[0-9a-fA-F]{6}$/);
        expect(theme.colors.secondary).toMatch(/^#[0-9a-fA-F]{6}$/);
        expect(theme.colors.accent).toMatch(/^#[0-9a-fA-F]{6}$/);
        expect(theme.colors.background).toMatch(/^#[0-9a-fA-F]{6}$/);
        expect(theme.colors.surface).toMatch(/^#[0-9a-fA-F]{6}$/);
      });
    });
  });

  describe('Theme Utilities', () => {
    it('should get theme by ID', () => {
      const oceanTheme = getThemeById('ocean');
      expect(oceanTheme).toBeDefined();
      expect(oceanTheme?.name).toBe('ocean');
      expect(oceanTheme?.displayName).toBe('Ocean Breeze');
    });

    it('should return undefined for invalid theme ID', () => {
      const invalidTheme = getThemeById('invalid');
      expect(invalidTheme).toBeUndefined();
    });

    it('should get all theme names', () => {
      const themeNames = getThemeNames();
      expect(themeNames).toContain('ocean');
      expect(themeNames).toContain('forest');
      expect(themeNames).toContain('sunset');
      expect(themeNames.length).toBeGreaterThan(5);
    });

    it('should get theme display names', () => {
      const displayNames = getThemeDisplayNames();
      expect(displayNames).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'ocean',
            name: 'ocean',
            displayName: 'Ocean Breeze'
          })
        ])
      );
    });

    it('should have a default theme', () => {
      expect(defaultTheme).toBeDefined();
      expect(defaultTheme.id).toBe('ocean');
    });
  });

  describe('Specific Themes', () => {
    it('should have ocean theme with correct properties', () => {
      const ocean = deckThemes.ocean;
      expect(ocean.displayName).toBe('Ocean Breeze');
      expect(ocean.description).toContain('ocean');
      expect(ocean.colors.primary).toBe('#0ea5e9');
    });

    it('should have forest theme with correct properties', () => {
      const forest = deckThemes.forest;
      expect(forest.displayName).toBe('Forest Grove');
      expect(forest.description).toContain('forest');
      expect(forest.colors.primary).toBe('#22c55e');
    });

    it('should have sunset theme with correct properties', () => {
      const sunset = deckThemes.sunset;
      expect(sunset.displayName).toBe('Golden Sunset');
      expect(sunset.description).toContain('sunset');
      expect(sunset.colors.primary).toBe('#f59e0b');
    });

    it('should have midnight theme with dark text colors', () => {
      const midnight = deckThemes.midnight;
      expect(midnight.displayName).toBe('Midnight Sky');
      expect(midnight.colors.text.primary).toBe('#f1f5f9'); // Light text for dark theme
    });
  });

  describe('CSS Generation', () => {
    it('should generate CSS for a theme', () => {
      const oceanCSS = generateThemeCSS(deckThemes.ocean);
      expect(oceanCSS).toContain('.deck-theme-ocean');
      expect(oceanCSS).toContain('--theme-primary: #0ea5e9');
      expect(oceanCSS).toContain('--theme-background:');
      expect(oceanCSS).toContain('--theme-gradient-primary:');
    });

    it('should generate CSS for all themes', () => {
      const allCSS = generateAllThemeCSS();
      expect(allCSS).toContain('.deck-theme-ocean');
      expect(allCSS).toContain('.deck-theme-forest');
      expect(allCSS).toContain('.deck-theme-sunset');
      expect(allCSS).toContain('.deck-theme-lavender');
      expect(allCSS).toContain('.deck-theme-midnight');
    });

    it('should include patterns in CSS when available', () => {
      const oceanCSS = generateThemeCSS(deckThemes.ocean);
      if (deckThemes.ocean.patterns?.background) {
        expect(oceanCSS).toContain('--theme-pattern-background:');
      }
      if (deckThemes.ocean.patterns?.overlay) {
        expect(oceanCSS).toContain('--theme-pattern-overlay:');
      }
    });
  });

  describe('Theme Accessibility', () => {
    it('should have sufficient contrast for text colors', () => {
      Object.values(deckThemes).forEach(theme => {
        // Basic check that text colors are different from background
        expect(theme.colors.text.primary).not.toBe(theme.colors.background);
        expect(theme.colors.text.secondary).not.toBe(theme.colors.background);
      });
    });

    it('should have distinct primary and secondary colors', () => {
      Object.values(deckThemes).forEach(theme => {
        expect(theme.colors.primary).not.toBe(theme.colors.secondary);
        expect(theme.colors.primary).not.toBe(theme.colors.accent);
      });
    });
  });
});
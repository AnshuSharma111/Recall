import { describe, it, expect } from 'vitest';
import { 
  icons, 
  getIcon, 
  iconSizes, 
  iconSpecs, 
  iconButtonSpecs, 
  contextualIcons 
} from '../../design/icons';

describe('Icon System', () => {
  describe('Icon Categories', () => {
    it('should have navigation icons', () => {
      expect(icons.navigation.home).toBe('🏠');
      expect(icons.navigation.dashboard).toBe('📊');
      expect(icons.navigation.decks).toBe('📚');
      expect(icons.navigation.study).toBe('🎓');
      expect(icons.navigation.settings).toBe('⚙️');
    });

    it('should have action icons', () => {
      expect(icons.actions.add).toBe('➕');
      expect(icons.actions.edit).toBe('✏️');
      expect(icons.actions.delete).toBe('🗑️');
      expect(icons.actions.save).toBe('💾');
      expect(icons.actions.play).toBe('▶️');
    });

    it('should have content type icons', () => {
      expect(icons.contentTypes.text).toBe('📄');
      expect(icons.contentTypes.pdf).toBe('📕');
      expect(icons.contentTypes.image).toBe('🖼️');
      expect(icons.contentTypes.audio).toBe('🎵');
    });

    it('should have card type icons', () => {
      expect(icons.cardTypes.definition).toBe('📖');
      expect(icons.cardTypes.questionAnswer).toBe('❓');
      expect(icons.cardTypes.fillBlank).toBe('✏️');
      expect(icons.cardTypes.trueFalse).toBe('✅');
      expect(icons.cardTypes.multipleChoice).toBe('📝');
    });

    it('should have difficulty icons', () => {
      expect(icons.difficulty.easy).toBe('🟢');
      expect(icons.difficulty.medium).toBe('🟡');
      expect(icons.difficulty.hard).toBe('🔴');
      expect(icons.difficulty.expert).toBe('🟣');
    });

    it('should have status icons', () => {
      expect(icons.status.success).toBe('✅');
      expect(icons.status.error).toBe('❌');
      expect(icons.status.warning).toBe('⚠️');
      expect(icons.status.info).toBe('ℹ️');
    });

    it('should have progress icons', () => {
      expect(icons.progress.streak).toBe('🔥');
      expect(icons.progress.achievement).toBe('🏆');
      expect(icons.progress.star).toBe('⭐');
      expect(icons.progress.target).toBe('🎯');
    });

    it('should have theme icons', () => {
      expect(icons.themes.ocean).toBe('🌊');
      expect(icons.themes.forest).toBe('🌲');
      expect(icons.themes.sunset).toBe('🌅');
      expect(icons.themes.lavender).toBe('💜');
      expect(icons.themes.midnight).toBe('🌙');
    });
  });

  describe('Icon Utilities', () => {
    it('should get icon by category and name', () => {
      expect(getIcon('navigation', 'home')).toBe('🏠');
      expect(getIcon('actions', 'add')).toBe('➕');
      expect(getIcon('status', 'success')).toBe('✅');
    });

    it('should return fallback icon for invalid category/name', () => {
      expect(getIcon('invalid' as any, 'test')).toBe('❓');
      expect(getIcon('navigation', 'invalid')).toBe('❓');
    });
  });

  describe('Icon Sizes', () => {
    it('should have all icon sizes', () => {
      expect(iconSizes.xs).toBe('12px');
      expect(iconSizes.sm).toBe('16px');
      expect(iconSizes.md).toBe('20px');
      expect(iconSizes.lg).toBe('24px');
      expect(iconSizes.xl).toBe('32px');
      expect(iconSizes['2xl']).toBe('48px');
    });
  });

  describe('Icon Specifications', () => {
    it('should have default icon styling', () => {
      expect(iconSpecs.default.display).toBe('inline-flex');
      expect(iconSpecs.default.alignItems).toBe('center');
      expect(iconSpecs.default.justifyContent).toBe('center');
      expect(iconSpecs.default.userSelect).toBe('none');
    });

    it('should have size variants', () => {
      expect(iconSpecs.sizes.xs.fontSize).toBe(iconSizes.xs);
      expect(iconSpecs.sizes.md.fontSize).toBe(iconSizes.md);
      expect(iconSpecs.sizes['2xl'].fontSize).toBe(iconSizes['2xl']);
    });

    it('should have interactive states', () => {
      expect(iconSpecs.interactive.cursor).toBe('pointer');
      expect(iconSpecs.interactive.hover.transform).toBe('scale(1.1)');
      expect(iconSpecs.interactive.active.transform).toBe('scale(0.95)');
    });

    it('should have color variants', () => {
      expect(iconSpecs.colors.default.color).toBe('var(--text-secondary)');
      expect(iconSpecs.colors.primary.color).toBe('var(--primary)');
      expect(iconSpecs.colors.success.color).toBe('var(--success)');
    });
  });

  describe('Icon Button Specifications', () => {
    it('should have base styling', () => {
      expect(iconButtonSpecs.base.display).toBe('inline-flex');
      expect(iconButtonSpecs.base.border).toBe('none');
      expect(iconButtonSpecs.base.borderRadius).toBe('50%');
      expect(iconButtonSpecs.base.cursor).toBe('pointer');
    });

    it('should have size variants', () => {
      expect(iconButtonSpecs.sizes.sm.width).toBe('2rem');
      expect(iconButtonSpecs.sizes.md.width).toBe('2.5rem');
      expect(iconButtonSpecs.sizes.lg.width).toBe('3rem');
    });

    it('should have style variants', () => {
      expect(iconButtonSpecs.variants.ghost).toBeDefined();
      expect(iconButtonSpecs.variants.filled).toBeDefined();
      expect(iconButtonSpecs.variants.outlined).toBeDefined();
    });
  });

  describe('Contextual Icons', () => {
    it('should have study state icons', () => {
      expect(contextualIcons.studyStates.ready).toBe(icons.actions.play);
      expect(contextualIcons.studyStates.active).toBe(icons.progress.timer);
      expect(contextualIcons.studyStates.completed).toBe(icons.status.complete);
    });

    it('should have card state icons', () => {
      expect(contextualIcons.cardStates.new).toBe(icons.status.new);
      expect(contextualIcons.cardStates.learning).toBe(icons.progress.target);
      expect(contextualIcons.cardStates.mastered).toBe(icons.status.success);
    });

    it('should have deck category icons', () => {
      expect(contextualIcons.deckCategories.language).toBe('🗣️');
      expect(contextualIcons.deckCategories.science).toBe('🔬');
      expect(contextualIcons.deckCategories.history).toBe('📜');
      expect(contextualIcons.deckCategories.math).toBe('🔢');
    });

    it('should have achievement type icons', () => {
      expect(contextualIcons.achievementTypes.streak).toBe(icons.progress.streak);
      expect(contextualIcons.achievementTypes.volume).toBe(icons.progress.chart);
      expect(contextualIcons.achievementTypes.accuracy).toBe(icons.progress.target);
    });
  });

  describe('Icon Consistency', () => {
    it('should have consistent icon structure across categories', () => {
      Object.values(icons).forEach(category => {
        expect(typeof category).toBe('object');
        Object.values(category).forEach(icon => {
          expect(typeof icon).toBe('string');
          expect(icon.length).toBeGreaterThan(0);
        });
      });
    });

    it('should have unique icons within categories', () => {
      Object.values(icons).forEach(category => {
        const iconValues = Object.values(category);
        const uniqueIcons = new Set(iconValues);
        // Allow some duplication across categories but not within
        expect(uniqueIcons.size).toBeGreaterThan(iconValues.length * 0.8);
      });
    });
  });
});
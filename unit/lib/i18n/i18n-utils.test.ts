/**
 * @jest-environment jsdom
 */

/**
 * Tests for i18n Utility Functions
 *
 * @description Tests the standalone utility functions exported from the i18n module:
 * - detectLanguage(): Detects browser language from navigator
 * - isRTLLanguage(): Checks if a language code is RTL
 *
 * These functions are pure and don't depend on the i18n singleton's initialization,
 * making them suitable for direct testing.
 */

// Save original navigator
const originalNavigator = globalThis.navigator;

describe('i18n Utility Functions', () => {
  // Import dynamically to ensure mocks are in place
  let detectLanguage: () => string;
  let isRTLLanguage: (locale: string) => boolean;

  beforeAll(async () => {
    // Mock logger to prevent console output
    jest.mock('@/lib/logging', () => ({
      __esModule: true,
      default: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
      },
    }));

    // Import the utility functions
    const i18nModule = await import('@/lib/i18n');
    detectLanguage = i18nModule.detectLanguage;
    isRTLLanguage = i18nModule.isRTLLanguage;
  });

  afterEach(() => {
    // Restore navigator
    Object.defineProperty(globalThis, 'navigator', {
      value: originalNavigator,
      writable: true,
      configurable: true,
    });
  });

  describe('detectLanguage', () => {
    it('returns string type', () => {
      const result = detectLanguage();
      expect(typeof result).toBe('string');
    });

    it('returns base language code from navigator.languages', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: { languages: ['fr-FR', 'en'], language: 'fr-FR' },
        writable: true,
        configurable: true,
      });
      const result = detectLanguage();
      expect(result).toBe('fr');
    });

    it('returns en when navigator is undefined', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: undefined,
        writable: true,
        configurable: true,
      });
      const result = detectLanguage();
      expect(result).toBe('en');
    });

    it('handles empty languages array', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: { languages: [], language: 'de' },
        writable: true,
        configurable: true,
      });
      const result = detectLanguage();
      // Should fall back to 'en' when first language is undefined
      expect(result).toBe('en');
    });

    it('extracts base code from locale with region', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: { languages: ['es-MX'], language: 'es-MX' },
        writable: true,
        configurable: true,
      });
      const result = detectLanguage();
      expect(result).toBe('es');
    });

    it('handles navigator.language fallback', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: { languages: undefined, language: 'de-DE' },
        writable: true,
        configurable: true,
      });
      const result = detectLanguage();
      expect(result).toBe('de');
    });

    it('handles Portuguese Brazilian', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: { languages: ['pt-BR'], language: 'pt-BR' },
        writable: true,
        configurable: true,
      });
      const result = detectLanguage();
      expect(result).toBe('pt');
    });

    it('handles Chinese Traditional', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: { languages: ['zh-TW'], language: 'zh-TW' },
        writable: true,
        configurable: true,
      });
      const result = detectLanguage();
      expect(result).toBe('zh');
    });

    it('handles Japanese', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: { languages: ['ja-JP'], language: 'ja-JP' },
        writable: true,
        configurable: true,
      });
      const result = detectLanguage();
      expect(result).toBe('ja');
    });

    it('handles Korean', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: { languages: ['ko-KR'], language: 'ko-KR' },
        writable: true,
        configurable: true,
      });
      const result = detectLanguage();
      expect(result).toBe('ko');
    });

    it('handles Arabic', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: { languages: ['ar-SA'], language: 'ar-SA' },
        writable: true,
        configurable: true,
      });
      const result = detectLanguage();
      expect(result).toBe('ar');
    });

    it('handles Hebrew', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: { languages: ['he-IL'], language: 'he-IL' },
        writable: true,
        configurable: true,
      });
      const result = detectLanguage();
      expect(result).toBe('he');
    });

    it('handles multiple languages preference', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: { languages: ['en-US', 'fr-FR', 'de-DE'], language: 'en-US' },
        writable: true,
        configurable: true,
      });
      const result = detectLanguage();
      expect(result).toBe('en');
    });

    it('uses first language from preferences', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: { languages: ['it-IT', 'en-US'], language: 'en-US' },
        writable: true,
        configurable: true,
      });
      const result = detectLanguage();
      expect(result).toBe('it');
    });

    it('handles simple language code without region', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: { languages: ['nl'], language: 'nl' },
        writable: true,
        configurable: true,
      });
      const result = detectLanguage();
      expect(result).toBe('nl');
    });

    it('handles Russian', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: { languages: ['ru-RU'], language: 'ru-RU' },
        writable: true,
        configurable: true,
      });
      const result = detectLanguage();
      expect(result).toBe('ru');
    });

    it('handles Turkish', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: { languages: ['tr-TR'], language: 'tr-TR' },
        writable: true,
        configurable: true,
      });
      const result = detectLanguage();
      expect(result).toBe('tr');
    });

    it('handles Polish', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: { languages: ['pl-PL'], language: 'pl-PL' },
        writable: true,
        configurable: true,
      });
      const result = detectLanguage();
      expect(result).toBe('pl');
    });

    it('handles Romanian', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: { languages: ['ro-RO'], language: 'ro-RO' },
        writable: true,
        configurable: true,
      });
      const result = detectLanguage();
      expect(result).toBe('ro');
    });
  });

  describe('isRTLLanguage', () => {
    describe('RTL languages', () => {
      it('returns true for Arabic (ar)', () => {
        expect(isRTLLanguage('ar')).toBe(true);
      });

      it('returns true for Hebrew (he)', () => {
        expect(isRTLLanguage('he')).toBe(true);
      });

      it('returns true for Farsi/Persian (fa)', () => {
        expect(isRTLLanguage('fa')).toBe(true);
      });

      it('returns true for Urdu (ur)', () => {
        expect(isRTLLanguage('ur')).toBe(true);
      });

      it('returns true for Kurdish (ku)', () => {
        expect(isRTLLanguage('ku')).toBe(true);
      });

      it('returns true for Dhivehi (dv)', () => {
        expect(isRTLLanguage('dv')).toBe(true);
      });
    });

    describe('LTR languages', () => {
      it('returns false for English (en)', () => {
        expect(isRTLLanguage('en')).toBe(false);
      });

      it('returns false for Spanish (es)', () => {
        expect(isRTLLanguage('es')).toBe(false);
      });

      it('returns false for French (fr)', () => {
        expect(isRTLLanguage('fr')).toBe(false);
      });

      it('returns false for German (de)', () => {
        expect(isRTLLanguage('de')).toBe(false);
      });

      it('returns false for Chinese (zh)', () => {
        expect(isRTLLanguage('zh')).toBe(false);
      });

      it('returns false for Japanese (ja)', () => {
        expect(isRTLLanguage('ja')).toBe(false);
      });

      it('returns false for Korean (ko)', () => {
        expect(isRTLLanguage('ko')).toBe(false);
      });

      it('returns false for Portuguese (pt)', () => {
        expect(isRTLLanguage('pt')).toBe(false);
      });

      it('returns false for Italian (it)', () => {
        expect(isRTLLanguage('it')).toBe(false);
      });

      it('returns false for Dutch (nl)', () => {
        expect(isRTLLanguage('nl')).toBe(false);
      });

      it('returns false for Russian (ru)', () => {
        expect(isRTLLanguage('ru')).toBe(false);
      });

      it('returns false for Polish (pl)', () => {
        expect(isRTLLanguage('pl')).toBe(false);
      });

      it('returns false for Romanian (ro)', () => {
        expect(isRTLLanguage('ro')).toBe(false);
      });

      it('returns false for Turkish (tr)', () => {
        expect(isRTLLanguage('tr')).toBe(false);
      });

      it('returns false for Vietnamese (vi)', () => {
        expect(isRTLLanguage('vi')).toBe(false);
      });

      it('returns false for Thai (th)', () => {
        expect(isRTLLanguage('th')).toBe(false);
      });

      it('returns false for Hindi (hi)', () => {
        expect(isRTLLanguage('hi')).toBe(false);
      });

      it('returns false for Bengali (bn)', () => {
        expect(isRTLLanguage('bn')).toBe(false);
      });

      it('returns false for Greek (el)', () => {
        expect(isRTLLanguage('el')).toBe(false);
      });

      it('returns false for Swedish (sv)', () => {
        expect(isRTLLanguage('sv')).toBe(false);
      });
    });

    describe('edge cases', () => {
      it('returns false for empty string', () => {
        expect(isRTLLanguage('')).toBe(false);
      });

      it('returns false for unknown locale', () => {
        expect(isRTLLanguage('xx')).toBe(false);
      });

      it('is case-sensitive (uppercase AR returns false)', () => {
        expect(isRTLLanguage('AR')).toBe(false);
      });

      it('is case-sensitive (uppercase HE returns false)', () => {
        expect(isRTLLanguage('HE')).toBe(false);
      });

      it('returns false for locale with region (ar-SA)', () => {
        expect(isRTLLanguage('ar-SA')).toBe(false);
      });

      it('returns false for locale with region (he-IL)', () => {
        expect(isRTLLanguage('he-IL')).toBe(false);
      });

      it('returns false for whitespace', () => {
        expect(isRTLLanguage(' ')).toBe(false);
      });

      it('returns false for special characters', () => {
        expect(isRTLLanguage('!@#')).toBe(false);
      });

      it('returns false for numeric string', () => {
        expect(isRTLLanguage('123')).toBe(false);
      });

      it('handles mixed case (aR)', () => {
        expect(isRTLLanguage('aR')).toBe(false);
      });

      it('handles mixed case (Ar)', () => {
        expect(isRTLLanguage('Ar')).toBe(false);
      });
    });
  });
});

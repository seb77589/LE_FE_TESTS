/**
 * @jest-environment jsdom
 */

/**
 * Tests for i18n React Hooks and Components
 *
 * @description Tests for useTranslation, useLocale hooks and Trans component.
 * Uses proper React testing patterns without module reset.
 */

import React from 'react';
import { render, screen, renderHook, act } from '@testing-library/react';

// Mock logger
jest.mock('@/lib/logging', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock fetch
beforeAll(() => {
  globalThis.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          meta: { name: 'English', direction: 'ltr' },
          translations: {
            welcome: { title: 'Welcome', message: 'Hello {{name}}!' },
            buttons: { save: 'Save', cancel: 'Cancel' },
            items: {
              zero: 'No items',
              one: '{{count}} item',
              other: '{{count}} items',
            },
          },
        }),
    }),
  ) as jest.Mock;

  // Mock localStorage
  Object.defineProperty(globalThis, 'localStorage', {
    value: {
      getItem: jest.fn(() => null),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn(),
    },
    writable: true,
    configurable: true,
  });

  // Mock navigator
  Object.defineProperty(globalThis, 'navigator', {
    value: { languages: ['en-US'], language: 'en-US' },
    writable: true,
    configurable: true,
  });
});

// Import after mocks
import { useTranslation, useLocale, Trans } from '@/lib/i18n';

describe('useTranslation Hook', () => {
  describe('returned values', () => {
    it('returns t function', () => {
      const { result } = renderHook(() => useTranslation());
      expect(typeof result.current.t).toBe('function');
    });

    it('returns tPlural function', () => {
      const { result } = renderHook(() => useTranslation());
      expect(typeof result.current.tPlural).toBe('function');
    });

    it('returns formatNumber function', () => {
      const { result } = renderHook(() => useTranslation());
      expect(typeof result.current.formatNumber).toBe('function');
    });

    it('returns formatCurrency function', () => {
      const { result } = renderHook(() => useTranslation());
      expect(typeof result.current.formatCurrency).toBe('function');
    });

    it('returns setLocale function', () => {
      const { result } = renderHook(() => useTranslation());
      expect(typeof result.current.setLocale).toBe('function');
    });

    it('returns locale string', () => {
      const { result } = renderHook(() => useTranslation());
      expect(typeof result.current.locale).toBe('string');
    });

    it('returns isRTL boolean', () => {
      const { result } = renderHook(() => useTranslation());
      expect(typeof result.current.isRTL).toBe('boolean');
    });

    it('returns supportedLocales array', () => {
      const { result } = renderHook(() => useTranslation());
      expect(Array.isArray(result.current.supportedLocales)).toBe(true);
    });
  });

  describe('t function behavior', () => {
    it('returns string for valid key', () => {
      const { result } = renderHook(() => useTranslation());
      const translated = result.current.t('test.key');
      expect(typeof translated).toBe('string');
    });

    it('returns key when translation missing', () => {
      const { result } = renderHook(() => useTranslation());
      expect(result.current.t('missing.key')).toBe('missing.key');
    });

    it('handles empty key', () => {
      const { result } = renderHook(() => useTranslation());
      expect(typeof result.current.t('')).toBe('string');
    });

    it('handles params', () => {
      const { result } = renderHook(() => useTranslation());
      const translated = result.current.t('greeting', { name: 'Test' });
      expect(typeof translated).toBe('string');
    });
  });

  describe('tPlural function behavior', () => {
    it('handles count 0', () => {
      const { result } = renderHook(() => useTranslation());
      expect(typeof result.current.tPlural('items', 0)).toBe('string');
    });

    it('handles count 1', () => {
      const { result } = renderHook(() => useTranslation());
      expect(typeof result.current.tPlural('items', 1)).toBe('string');
    });

    it('handles count > 1', () => {
      const { result } = renderHook(() => useTranslation());
      expect(typeof result.current.tPlural('items', 5)).toBe('string');
    });
  });

  describe('formatNumber function', () => {
    it('formats integers', () => {
      const { result } = renderHook(() => useTranslation());
      expect(result.current.formatNumber(1234)).toBe('1,234');
    });

    it('formats decimals', () => {
      const { result } = renderHook(() => useTranslation());
      const formatted = result.current.formatNumber(1234.56);
      expect(formatted).toContain('1,234');
    });

    it('formats zero', () => {
      const { result } = renderHook(() => useTranslation());
      expect(result.current.formatNumber(0)).toBe('0');
    });
  });

  describe('formatCurrency function', () => {
    it('formats currency', () => {
      const { result } = renderHook(() => useTranslation());
      const formatted = result.current.formatCurrency(99.99);
      expect(formatted).toContain('99');
    });

    it('handles custom currency', () => {
      const { result } = renderHook(() => useTranslation());
      const formatted = result.current.formatCurrency(99.99, 'EUR');
      expect(typeof formatted).toBe('string');
    });
  });

  describe('locale state', () => {
    it('returns current locale', () => {
      const { result } = renderHook(() => useTranslation());
      expect(result.current.locale).toBe('en');
    });

    it('supportedLocales includes en', () => {
      const { result } = renderHook(() => useTranslation());
      expect(result.current.supportedLocales).toContain('en');
    });

    it('supportedLocales includes es', () => {
      const { result } = renderHook(() => useTranslation());
      expect(result.current.supportedLocales).toContain('es');
    });
  });

  describe('isRTL state', () => {
    it('returns false for LTR locale', () => {
      const { result } = renderHook(() => useTranslation());
      expect(result.current.isRTL).toBe(false);
    });
  });
});

describe('useLocale Hook', () => {
  describe('returned values', () => {
    it('returns locale string', () => {
      const { result } = renderHook(() => useLocale());
      expect(typeof result.current.locale).toBe('string');
    });

    it('returns setLocale function', () => {
      const { result } = renderHook(() => useLocale());
      expect(typeof result.current.setLocale).toBe('function');
    });

    it('returns supportedLocales array', () => {
      const { result } = renderHook(() => useLocale());
      expect(Array.isArray(result.current.supportedLocales)).toBe(true);
    });

    it('returns isRTL boolean', () => {
      const { result } = renderHook(() => useLocale());
      expect(typeof result.current.isRTL).toBe('boolean');
    });
  });

  describe('locale state', () => {
    it('returns current locale', () => {
      const { result } = renderHook(() => useLocale());
      expect(result.current.locale).toBe('en');
    });

    it('supportedLocales has items', () => {
      const { result } = renderHook(() => useLocale());
      expect(result.current.supportedLocales.length).toBeGreaterThan(0);
    });
  });

  describe('isRTL state', () => {
    it('returns false for English', () => {
      const { result } = renderHook(() => useLocale());
      expect(result.current.isRTL).toBe(false);
    });
  });
});

describe('Trans Component', () => {
  describe('rendering', () => {
    it('renders with i18nKey', () => {
      render(<Trans i18nKey="test.key" />);
      expect(screen.getByText(/test\.key/)).toBeInTheDocument();
    });

    it('renders as span', () => {
      const { container } = render(<Trans i18nKey="hello" />);
      expect(container.querySelector('span')).toBeInTheDocument();
    });

    it('renders non-empty content', () => {
      const { container } = render(<Trans i18nKey="button.save" />);
      expect(container.textContent).toBeTruthy();
    });
  });

  describe('values prop', () => {
    it('accepts values object', () => {
      render(<Trans i18nKey="greeting" values={{ name: 'Test' }} />);
      expect(screen.getByText(/greeting|Test/)).toBeInTheDocument();
    });

    it('handles empty values', () => {
      render(<Trans i18nKey="test" values={{}} />);
      expect(screen.getByText(/test/)).toBeInTheDocument();
    });
  });

  describe('count prop', () => {
    it('handles count 0', () => {
      render(<Trans i18nKey="items" count={0} />);
      expect(screen.getByText(/items|0/)).toBeInTheDocument();
    });

    it('handles count 1', () => {
      render(<Trans i18nKey="items" count={1} />);
      expect(screen.getByText(/items|1/)).toBeInTheDocument();
    });

    it('handles count > 1', () => {
      render(<Trans i18nKey="items" count={5} />);
      expect(screen.getByText(/items|5/)).toBeInTheDocument();
    });
  });

  describe('multiple renders', () => {
    it('renders consistently', () => {
      const { container: c1 } = render(<Trans i18nKey="button.save" />);
      const { container: c2 } = render(<Trans i18nKey="button.save" />);
      expect(c1.textContent).toBe(c2.textContent);
    });

    it('renders different keys differently', () => {
      render(
        <>
          <Trans i18nKey="key1" />
          <Trans i18nKey="key2" />
        </>,
      );
      expect(screen.getByText(/key1/)).toBeInTheDocument();
      expect(screen.getByText(/key2/)).toBeInTheDocument();
    });
  });
});

describe('Hook Integration', () => {
  describe('useTranslation with useLocale', () => {
    it('both hooks return same locale', () => {
      const { result: translationResult } = renderHook(() => useTranslation());
      const { result: localeResult } = renderHook(() => useLocale());
      expect(translationResult.current.locale).toBe(localeResult.current.locale);
    });

    it('both hooks return same supportedLocales', () => {
      const { result: translationResult } = renderHook(() => useTranslation());
      const { result: localeResult } = renderHook(() => useLocale());
      expect(translationResult.current.supportedLocales).toEqual(
        localeResult.current.supportedLocales,
      );
    });
  });

  describe('component using hooks', () => {
    function TestComponent() {
      const { t, locale, formatNumber } = useTranslation();
      return (
        <div>
          <span data-testid="locale">{locale}</span>
          <span data-testid="translation">{t('test')}</span>
          <span data-testid="number">{formatNumber(1234)}</span>
        </div>
      );
    }

    it('component renders with hook values', () => {
      render(<TestComponent />);
      expect(screen.getByTestId('locale')).toHaveTextContent('en');
      expect(screen.getByTestId('translation')).toHaveTextContent('test');
      expect(screen.getByTestId('number')).toHaveTextContent('1,234');
    });
  });
});

describe('Hook Error Handling', () => {
  it('t function handles undefined key by returning undefined', () => {
    const { result } = renderHook(() => useTranslation());
    // @ts-expect-error Testing error handling
    expect(result.current.t(undefined)).toBeUndefined();
  });

  it('tPlural handles undefined count gracefully', () => {
    const { result } = renderHook(() => useTranslation());
    // @ts-expect-error Testing error handling
    const pluralResult = result.current.tPlural('items', undefined);
    expect(typeof pluralResult).toBe('string');
  });

  it('formatNumber handles string input', () => {
    const { result } = renderHook(() => useTranslation());
    // @ts-expect-error Testing error handling
    const formatted = result.current.formatNumber('1234');
    expect(typeof formatted).toBe('string');
  });
});

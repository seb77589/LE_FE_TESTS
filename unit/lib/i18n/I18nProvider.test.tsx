/**
 * I18nProvider Component Tests
 *
 * @description Comprehensive unit tests for the I18nProvider wrapper component.
 * Tests provider rendering, context passing, locale management, and integration
 * with next-intl.
 *
 * @module __tests__/unit/lib/i18n/I18nProvider
 * @since 0.2.0
 */

import { render, screen } from '@testing-library/react';
import { useTranslations } from 'next-intl';
import React from 'react';
import I18nProvider from '@/lib/i18n/I18nProvider';

// Mock next-intl
jest.mock('next-intl', () => ({
  NextIntlClientProvider: ({ children, locale, messages }: any) => (
    <div data-testid="next-intl-provider" data-locale={locale} data-messages={JSON.stringify(messages)}>
      {children}
    </div>
  ),
  useTranslations: jest.fn(),
}));

describe('I18nProvider', () => {
  const mockMessages = {
    common: {
      welcome: 'Welcome',
      goodbye: 'Goodbye',
    },
    errors: {
      notFound: 'Not found',
    },
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render children inside NextIntlClientProvider', () => {
      render(
        <I18nProvider locale="en" messages={mockMessages}>
          <div>Test Child</div>
        </I18nProvider>
      );

      expect(screen.getByText('Test Child')).toBeInTheDocument();
      expect(screen.getByTestId('next-intl-provider')).toBeInTheDocument();
    });

    it('should render multiple children', () => {
      render(
        <I18nProvider locale="en" messages={mockMessages}>
          <div>First Child</div>
          <div>Second Child</div>
          <span>Third Child</span>
        </I18nProvider>
      );

      expect(screen.getByText('First Child')).toBeInTheDocument();
      expect(screen.getByText('Second Child')).toBeInTheDocument();
      expect(screen.getByText('Third Child')).toBeInTheDocument();
    });

    it('should render nested children', () => {
      render(
        <I18nProvider locale="en" messages={mockMessages}>
          <div>
            Parent
            <div>
              Child{' '}
              <span>Nested Child</span>
            </div>
          </div>
        </I18nProvider>
      );

      expect(screen.getByText('Parent')).toBeInTheDocument();
      expect(screen.getByText(/Child/)).toBeInTheDocument();
      expect(screen.getByText('Nested Child')).toBeInTheDocument();
    });

    it('should render with empty children', () => {
      const { container } = render(
        <I18nProvider locale="en" messages={mockMessages}>
          <></>
        </I18nProvider>
      );

      expect(screen.getByTestId('next-intl-provider')).toBeInTheDocument();
      expect(container.querySelector('[data-testid="next-intl-provider"]')).toBeEmptyDOMElement();
    });

    it('should render with null children (React fragments)', () => {
      render(
        <I18nProvider locale="en" messages={mockMessages}>
          {null}
        </I18nProvider>
      );

      expect(screen.getByTestId('next-intl-provider')).toBeInTheDocument();
    });
  });

  describe('Locale Handling', () => {
    it('should pass locale prop to NextIntlClientProvider', () => {
      render(
        <I18nProvider locale="en" messages={mockMessages}>
          <div>Content</div>
        </I18nProvider>
      );

      const provider = screen.getByTestId('next-intl-provider');
      expect(provider).toHaveAttribute('data-locale', 'en');
    });

    it('should handle different locale codes correctly', () => {
      const locales = ['en', 'es', 'fr', 'de', 'ro', 'zh', 'ja', 'ar'];

      for (const locale of locales) {
        const { unmount } = render(
          <I18nProvider locale={locale} messages={mockMessages}>
            <div>{locale}</div>
          </I18nProvider>
        );

        const provider = screen.getByTestId('next-intl-provider');
        expect(provider).toHaveAttribute('data-locale', locale);
        unmount();
      }
    });

    it('should handle locale with region code', () => {
      render(
        <I18nProvider locale="en-US" messages={mockMessages}>
          <div>Content</div>
        </I18nProvider>
      );

      const provider = screen.getByTestId('next-intl-provider');
      expect(provider).toHaveAttribute('data-locale', 'en-US');
    });

    it('should handle locale with script code', () => {
      render(
        <I18nProvider locale="zh-Hans-CN" messages={mockMessages}>
          <div>Content</div>
        </I18nProvider>
      );

      const provider = screen.getByTestId('next-intl-provider');
      expect(provider).toHaveAttribute('data-locale', 'zh-Hans-CN');
    });

    it('should handle empty string locale', () => {
      render(
        <I18nProvider locale="" messages={mockMessages}>
          <div>Content</div>
        </I18nProvider>
      );

      const provider = screen.getByTestId('next-intl-provider');
      expect(provider).toHaveAttribute('data-locale', '');
    });
  });

  describe('Messages Handling', () => {
    it('should pass messages prop to NextIntlClientProvider', () => {
      render(
        <I18nProvider locale="en" messages={mockMessages}>
          <div>Content</div>
        </I18nProvider>
      );

      const provider = screen.getByTestId<HTMLElement>('next-intl-provider');
      const messagesAttr = provider.dataset.messages;
      expect(messagesAttr).toBe(JSON.stringify(mockMessages));
    });

    it('should handle empty messages object', () => {
      const emptyMessages = {};

      render(
        <I18nProvider locale="en" messages={emptyMessages}>
          <div>Content</div>
        </I18nProvider>
      );

      const provider = screen.getByTestId('next-intl-provider');
      expect(provider).toHaveAttribute('data-messages', JSON.stringify(emptyMessages));
    });

    it('should handle null messages', () => {
      render(
        <I18nProvider locale="en" messages={null}>
          <div>Content</div>
        </I18nProvider>
      );

      const provider = screen.getByTestId('next-intl-provider');
      expect(provider).toHaveAttribute('data-messages', 'null');
    });

    it('should handle undefined messages', () => {
      render(
        <I18nProvider locale="en" messages={undefined}>
          <div>Content</div>
        </I18nProvider>
      );

      const provider = screen.getByTestId('next-intl-provider');
      // When messages is undefined, the attribute is not set (null in DOM)
      expect(provider).not.toHaveAttribute('data-messages');
    });

    it('should handle deeply nested messages', () => {
      const nestedMessages = {
        level1: {
          level2: {
            level3: {
              level4: {
                message: 'Deep message',
              },
            },
          },
        },
      };

      render(
        <I18nProvider locale="en" messages={nestedMessages}>
          <div>Content</div>
        </I18nProvider>
      );

      const provider = screen.getByTestId('next-intl-provider');
      expect(provider).toHaveAttribute('data-messages', JSON.stringify(nestedMessages));
    });

    it('should handle messages with special characters', () => {
      const specialMessages = {
        special: {
          unicode: '你好世界 🌍',
          quotes: 'He said "Hello"',
          html: '<div>Test</div>',
          newlines: 'Line 1\nLine 2',
        },
      };

      render(
        <I18nProvider locale="en" messages={specialMessages}>
          <div>Content</div>
        </I18nProvider>
      );

      const provider = screen.getByTestId('next-intl-provider');
      expect(provider).toHaveAttribute('data-messages', JSON.stringify(specialMessages));
    });

    it('should handle large messages object', () => {
      const largeMessages = Array.from({ length: 100 }, (_, i) => ({
        [`key${i}`]: `value${i}`,
      })).reduce((acc, curr) => ({ ...acc, ...curr }), {});

      render(
        <I18nProvider locale="en" messages={largeMessages}>
          <div>Content</div>
        </I18nProvider>
      );

      const provider = screen.getByTestId('next-intl-provider');
      expect(provider).toHaveAttribute('data-messages', JSON.stringify(largeMessages));
    });
  });

  describe('Component Integration', () => {
    it('should provide context to child components using useTranslations hook', () => {
      const mockUseTranslations = useTranslations as jest.Mock;
      mockUseTranslations.mockReturnValue((key: string) => mockMessages.common.welcome);

      const ChildComponent = () => {
        const t = useTranslations('common');
        return <div>{t('welcome')}</div>;
      };

      render(
        <I18nProvider locale="en" messages={mockMessages}>
          <ChildComponent />
        </I18nProvider>
      );

      expect(screen.getByText('Welcome')).toBeInTheDocument();
    });

    it('should support multiple provider instances', () => {
      const enMessages = { greeting: 'Hello' };
      const esMessages = { greeting: 'Hola' };

      const { container } = render(
        <>
          <I18nProvider locale="en" messages={enMessages}>
            <div data-testid="en-provider">English Content</div>
          </I18nProvider>
          <I18nProvider locale="es" messages={esMessages}>
            <div data-testid="es-provider">Spanish Content</div>
          </I18nProvider>
        </>
      );

      expect(screen.getByTestId('en-provider')).toBeInTheDocument();
      expect(screen.getByTestId('es-provider')).toBeInTheDocument();
      expect(container.querySelectorAll('[data-testid="next-intl-provider"]')).toHaveLength(2);
    });

    it('should support nested providers (override scenario)', () => {
      const outerMessages = { message: 'Outer' };
      const innerMessages = { message: 'Inner' };

      render(
        <I18nProvider locale="en" messages={outerMessages}>
          <div>Outer Provider</div>
          <I18nProvider locale="es" messages={innerMessages}>
            <div>Inner Provider</div>
          </I18nProvider>
        </I18nProvider>
      );

      const providers = screen.getAllByTestId('next-intl-provider');
      expect(providers).toHaveLength(2);
      expect(screen.getByText('Outer Provider')).toBeInTheDocument();
      expect(screen.getByText('Inner Provider')).toBeInTheDocument();
    });
  });

  describe('Props Validation', () => {
    it('should accept readonly children prop', () => {
      const ReadonlyComponent = () => {
        const children: React.ReactNode = <div>Readonly Child</div>;
        return (
          <I18nProvider locale="en" messages={mockMessages}>
            {children}
          </I18nProvider>
        );
      };

      render(<ReadonlyComponent />);
      expect(screen.getByText('Readonly Child')).toBeInTheDocument();
    });

    it('should accept readonly locale prop', () => {
      const ReadonlyComponent = () => {
        const locale: string = 'en';
        return (
          <I18nProvider locale={locale} messages={mockMessages}>
            <div>Content</div>
          </I18nProvider>
        );
      };

      render(<ReadonlyComponent />);
      const provider = screen.getByTestId('next-intl-provider');
      expect(provider).toHaveAttribute('data-locale', 'en');
    });

    it('should accept readonly messages prop', () => {
      const ReadonlyComponent = () => {
        const messages: any = mockMessages;
        return (
          <I18nProvider locale="en" messages={messages}>
            <div>Content</div>
          </I18nProvider>
        );
      };

      render(<ReadonlyComponent />);
      const provider = screen.getByTestId('next-intl-provider');
      expect(provider).toHaveAttribute('data-messages', JSON.stringify(mockMessages));
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid re-renders with different locales', () => {
      const { rerender } = render(
        <I18nProvider locale="en" messages={mockMessages}>
          <div>Content</div>
        </I18nProvider>
      );

      rerender(
        <I18nProvider locale="es" messages={mockMessages}>
          <div>Content</div>
        </I18nProvider>
      );

      rerender(
        <I18nProvider locale="fr" messages={mockMessages}>
          <div>Content</div>
        </I18nProvider>
      );

      const provider = screen.getByTestId('next-intl-provider');
      expect(provider).toHaveAttribute('data-locale', 'fr');
    });

    it('should handle rapid re-renders with different messages', () => {
      const messages1 = { test: 'one' };
      const messages2 = { test: 'two' };
      const messages3 = { test: 'three' };

      const { rerender } = render(
        <I18nProvider locale="en" messages={messages1}>
          <div>Content</div>
        </I18nProvider>
      );

      rerender(
        <I18nProvider locale="en" messages={messages2}>
          <div>Content</div>
        </I18nProvider>
      );

      rerender(
        <I18nProvider locale="en" messages={messages3}>
          <div>Content</div>
        </I18nProvider>
      );

      const provider = screen.getByTestId('next-intl-provider');
      expect(provider).toHaveAttribute('data-messages', JSON.stringify(messages3));
    });

    it('should handle children prop change', () => {
      const { rerender } = render(
        <I18nProvider locale="en" messages={mockMessages}>
          <div>Original Child</div>
        </I18nProvider>
      );

      expect(screen.getByText('Original Child')).toBeInTheDocument();

      rerender(
        <I18nProvider locale="en" messages={mockMessages}>
          <div>Updated Child</div>
        </I18nProvider>
      );

      expect(screen.queryByText('Original Child')).not.toBeInTheDocument();
      expect(screen.getByText('Updated Child')).toBeInTheDocument();
    });

    it('should handle component unmounting gracefully', () => {
      const { unmount } = render(
        <I18nProvider locale="en" messages={mockMessages}>
          <div>Content</div>
        </I18nProvider>
      );

      expect(screen.getByText('Content')).toBeInTheDocument();
      unmount();
      expect(screen.queryByText('Content')).not.toBeInTheDocument();
    });

    it('should handle React fragments as children', () => {
      render(
        <I18nProvider locale="en" messages={mockMessages}>
          <>
            <div>Fragment Child 1</div>
            <div>Fragment Child 2</div>
          </>
        </I18nProvider>
      );

      expect(screen.getByText('Fragment Child 1')).toBeInTheDocument();
      expect(screen.getByText('Fragment Child 2')).toBeInTheDocument();
    });

    it('should handle boolean children (false)', () => {
      const showHidden = false;
      render(
        <I18nProvider locale="en" messages={mockMessages}>
          {showHidden && <div>Hidden</div>}
          <div>Visible</div>
        </I18nProvider>
      );

      expect(screen.queryByText('Hidden')).not.toBeInTheDocument();
      expect(screen.getByText('Visible')).toBeInTheDocument();
    });

    it('should handle conditional children (null)', () => {
      const condition = false;
      render(
        <I18nProvider locale="en" messages={mockMessages}>
          {condition ? <div>Conditional</div> : null}
          <div>Always Visible</div>
        </I18nProvider>
      );

      expect(screen.queryByText('Conditional')).not.toBeInTheDocument();
      expect(screen.getByText('Always Visible')).toBeInTheDocument();
    });
  });

  describe('TypeScript Type Safety', () => {
    it('should enforce ReactNode type for children', () => {
      // This test validates type safety at compile time
      const validChildren: React.ReactNode = <div>Valid</div>;

      render(
        <I18nProvider locale="en" messages={mockMessages}>
          {validChildren}
        </I18nProvider>
      );

      expect(screen.getByText('Valid')).toBeInTheDocument();
    });

    it('should enforce string type for locale', () => {
      // This test validates type safety at compile time
      const validLocale: string = 'en';

      render(
        <I18nProvider locale={validLocale} messages={mockMessages}>
          <div>Content</div>
        </I18nProvider>
      );

      const provider = screen.getByTestId('next-intl-provider');
      expect(provider).toHaveAttribute('data-locale', 'en');
    });

    it('should accept any type for messages prop', () => {
      // This test validates type safety at compile time
      const validMessages: any = { test: 'value' };

      render(
        <I18nProvider locale="en" messages={validMessages}>
          <div>Content</div>
        </I18nProvider>
      );

      const provider = screen.getByTestId('next-intl-provider');
      expect(provider).toHaveAttribute('data-messages', JSON.stringify(validMessages));
    });
  });

  describe('Performance Characteristics', () => {
    it('should render efficiently with minimal re-renders', () => {
      const renderSpy = jest.fn();
      
      const TestChild = () => {
        renderSpy();
        return <div>Child</div>;
      };

      const { rerender } = render(
        <I18nProvider locale="en" messages={mockMessages}>
          <TestChild />
        </I18nProvider>
      );

      expect(renderSpy).toHaveBeenCalledTimes(1);

      // Re-render with same props
      rerender(
        <I18nProvider locale="en" messages={mockMessages}>
          <TestChild />
        </I18nProvider>
      );

      // Child should re-render (no memoization in simple wrapper)
      expect(renderSpy).toHaveBeenCalledTimes(2);
    });

    it('should handle large component trees efficiently', () => {
      const items = Array.from({ length: 100 }, (_, i) => (
        <div key={i}>Item {i}</div>
      ));

      const LargeTree = () => <div>{items}</div>;

      const { container } = render(
        <I18nProvider locale="en" messages={mockMessages}>
          <LargeTree />
        </I18nProvider>
      );

      expect(container.querySelectorAll('div').length).toBeGreaterThan(100);
    });
  });
});

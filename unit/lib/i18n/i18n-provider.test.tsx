/**
 * @jest-environment jsdom
 */

/**
 * Tests for I18nProvider Component
 *
 * @description Tests the I18nProvider wrapper component that integrates
 * with next-intl's NextIntlClientProvider.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import I18nProvider from '@/lib/i18n/I18nProvider';

// Mock next-intl
jest.mock('next-intl', () => ({
  NextIntlClientProvider: ({
    children,
    locale,
    messages,
  }: {
    children: React.ReactNode;
    locale: string;
    messages: any;
  }) => (
    <div data-testid="next-intl-provider" data-locale={locale} data-messages={JSON.stringify(messages)}>
      {children}
    </div>
  ),
}));

describe('I18nProvider', () => {
  const mockMessages = {
    common: {
      welcome: 'Welcome',
      goodbye: 'Goodbye',
    },
  };

  describe('Basic Rendering', () => {
    it('renders children', () => {
      render(
        <I18nProvider locale="en" messages={mockMessages}>
          <div data-testid="child">Test Content</div>
        </I18nProvider>
      );

      expect(screen.getByTestId('child')).toBeInTheDocument();
      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    it('wraps NextIntlClientProvider', () => {
      render(
        <I18nProvider locale="en" messages={mockMessages}>
          <div>Content</div>
        </I18nProvider>
      );

      expect(screen.getByTestId('next-intl-provider')).toBeInTheDocument();
    });

    it('passes locale to NextIntlClientProvider', () => {
      render(
        <I18nProvider locale="es" messages={mockMessages}>
          <div>Content</div>
        </I18nProvider>
      );

      const provider = screen.getByTestId('next-intl-provider');
      expect(provider).toHaveAttribute('data-locale', 'es');
    });

    it('passes messages to NextIntlClientProvider', () => {
      const customMessages = { test: { key: 'value' } };

      render(
        <I18nProvider locale="en" messages={customMessages}>
          <div>Content</div>
        </I18nProvider>
      );

      const provider = screen.getByTestId('next-intl-provider');
      expect(provider).toHaveAttribute('data-messages', JSON.stringify(customMessages));
    });
  });

  describe('Locale Variations', () => {
    it('supports English locale', () => {
      render(
        <I18nProvider locale="en" messages={mockMessages}>
          <div>Content</div>
        </I18nProvider>
      );

      expect(screen.getByTestId('next-intl-provider')).toHaveAttribute('data-locale', 'en');
    });

    it('supports Spanish locale', () => {
      render(
        <I18nProvider locale="es" messages={mockMessages}>
          <div>Content</div>
        </I18nProvider>
      );

      expect(screen.getByTestId('next-intl-provider')).toHaveAttribute('data-locale', 'es');
    });

    it('supports Romanian locale', () => {
      render(
        <I18nProvider locale="ro" messages={mockMessages}>
          <div>Content</div>
        </I18nProvider>
      );

      expect(screen.getByTestId('next-intl-provider')).toHaveAttribute('data-locale', 'ro');
    });
  });

  describe('Message Structures', () => {
    it('handles flat message structure', () => {
      const flatMessages = {
        welcome: 'Welcome',
        goodbye: 'Goodbye',
      };

      render(
        <I18nProvider locale="en" messages={flatMessages}>
          <div>Content</div>
        </I18nProvider>
      );

      expect(screen.getByTestId('next-intl-provider')).toBeInTheDocument();
    });

    it('handles nested message structure', () => {
      const nestedMessages = {
        common: {
          buttons: {
            save: 'Save',
            cancel: 'Cancel',
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

    it('handles empty messages object', () => {
      render(
        <I18nProvider locale="en" messages={{}}>
          <div>Content</div>
        </I18nProvider>
      );

      expect(screen.getByTestId('next-intl-provider')).toBeInTheDocument();
    });
  });

  describe('Children Variations', () => {
    it('renders single child element', () => {
      render(
        <I18nProvider locale="en" messages={mockMessages}>
          <div data-testid="single-child">Single</div>
        </I18nProvider>
      );

      expect(screen.getByTestId('single-child')).toBeInTheDocument();
    });

    it('renders multiple child elements', () => {
      render(
        <I18nProvider locale="en" messages={mockMessages}>
          <div data-testid="child-1">First</div>
          <div data-testid="child-2">Second</div>
          <div data-testid="child-3">Third</div>
        </I18nProvider>
      );

      expect(screen.getByTestId('child-1')).toBeInTheDocument();
      expect(screen.getByTestId('child-2')).toBeInTheDocument();
      expect(screen.getByTestId('child-3')).toBeInTheDocument();
    });

    it('renders text children', () => {
      render(
        <I18nProvider locale="en" messages={mockMessages}>
          Plain text content
        </I18nProvider>
      );

      expect(screen.getByText('Plain text content')).toBeInTheDocument();
    });
  });

  describe('Re-rendering', () => {
    it('re-renders when locale changes', () => {
      const { rerender } = render(
        <I18nProvider locale="en" messages={mockMessages}>
          <div>Content</div>
        </I18nProvider>
      );

      expect(screen.getByTestId('next-intl-provider')).toHaveAttribute('data-locale', 'en');

      rerender(
        <I18nProvider locale="es" messages={mockMessages}>
          <div>Content</div>
        </I18nProvider>
      );

      expect(screen.getByTestId('next-intl-provider')).toHaveAttribute('data-locale', 'es');
    });

    it('re-renders when messages change', () => {
      const messages1 = { key: 'value1' };
      const messages2 = { key: 'value2' };

      const { rerender } = render(
        <I18nProvider locale="en" messages={messages1}>
          <div>Content</div>
        </I18nProvider>
      );

      expect(screen.getByTestId('next-intl-provider')).toHaveAttribute(
        'data-messages',
        JSON.stringify(messages1)
      );

      rerender(
        <I18nProvider locale="en" messages={messages2}>
          <div>Content</div>
        </I18nProvider>
      );

      expect(screen.getByTestId('next-intl-provider')).toHaveAttribute(
        'data-messages',
        JSON.stringify(messages2)
      );
    });
  });
});

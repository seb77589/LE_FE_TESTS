/**
 * @fileoverview Shared test utilities and mock factories
 *
 * This module provides reusable test utilities to:
 * - Reduce code duplication across test files
 * - Flatten deeply nested test functions (fixes SonarQube S2004)
 * - Provide consistent mock implementations
 *
 * @module tests/utils/testHelpers
 * @since 0.2.0
 */

import { act } from '@testing-library/react';

// ==============================================================================
// Types
// ==============================================================================

export interface ApiResponse<T = unknown> {
  data: T;
  status: number;
  statusText: string;
  headers?: Record<string, string>;
}

export interface ApiError {
  response?: {
    data: { detail?: string; message?: string };
    status: number;
  };
  isAxiosError?: boolean;
  message?: string;
}

export interface MockUser {
  id: number;
  email: string;
  full_name?: string;
  role?: string;
  is_active?: boolean;
  is_verified?: boolean;
}

export interface MockDocument {
  id: number;
  filename: string;
  mime_type: string;
  file_size: number;
  upload_date: string;
  status: string;
}

// ==============================================================================
// API Response Factories
// ==============================================================================

/**
 * Creates a mock successful API response
 */
export function createMockApiResponse<T>(
  data: T,
  status = 200,
  statusText = 'OK'
): ApiResponse<T> {
  return {
    data,
    status,
    statusText,
  };
}

/**
 * Creates a mock API error object
 */
export function createApiError(
  message: string,
  status = 500,
  isAxiosError = true
): ApiError {
  return {
    response: {
      data: { detail: message },
      status,
    },
    isAxiosError,
    message,
  };
}

/**
 * Creates a mock validation error response
 */
export function createValidationError(
  errors: Array<{ field: string; message: string }>
): ApiError {
  return {
    response: {
      data: {
        detail: errors.map((e) => `${e.field}: ${e.message}`).join(', '),
      },
      status: 422,
    },
    isAxiosError: true,
  };
}

/**
 * Creates a mock 401 Unauthorized error
 */
export function createUnauthorizedError(
  message = 'Not authenticated'
): ApiError {
  return createApiError(message, 401);
}

/**
 * Creates a mock 403 Forbidden error
 */
export function createForbiddenError(message = 'Access denied'): ApiError {
  return createApiError(message, 403);
}

/**
 * Creates a mock 404 Not Found error
 */
export function createNotFoundError(message = 'Resource not found'): ApiError {
  return createApiError(message, 404);
}

/**
 * Creates a mock network error (no response)
 */
export function createNetworkError(message = 'Network Error'): Error {
  const error = new Error(message);
  error.name = 'NetworkError';
  return error;
}

// ==============================================================================
// Mock Entity Factories
// ==============================================================================

/**
 * Creates a mock user object
 */
export function createMockUser(overrides: Partial<MockUser> = {}): MockUser {
  return {
    id: 1,
    email: 'test@example.com',
    full_name: 'Test User',
    role: 'user',
    is_active: true,
    is_verified: true,
    ...overrides,
  };
}

/**
 * Creates a mock admin user
 */
export function createMockAdminUser(
  overrides: Partial<MockUser> = {}
): MockUser {
  return createMockUser({
    role: 'admin',
    email: 'admin@example.com',
    full_name: 'Admin User',
    ...overrides,
  });
}

/**
 * Creates a mock document object
 */
export function createMockDocument(
  overrides: Partial<MockDocument> = {}
): MockDocument {
  return {
    id: 1,
    filename: 'test-document.pdf',
    mime_type: 'application/pdf',
    file_size: 1024000,
    upload_date: '2024-01-15T10:30:00Z',
    status: 'completed',
    ...overrides,
  };
}

/**
 * Creates multiple mock documents
 */
export function createMockDocuments(
  count: number,
  baseOverrides: Partial<MockDocument> = {}
): MockDocument[] {
  return Array.from({ length: count }, (_, index) =>
    createMockDocument({
      id: index + 1,
      filename: `document-${index + 1}.pdf`,
      ...baseOverrides,
    })
  );
}

// ==============================================================================
// Mock Function Factories
// ==============================================================================

/**
 * Creates a mock function that resolves with data
 */
export function createResolvingMock<T>(data: T): jest.Mock {
  return jest.fn().mockResolvedValue(data);
}

/**
 * Creates a mock function that rejects with an error
 */
export function createRejectingMock(error: Error | ApiError): jest.Mock {
  return jest.fn().mockRejectedValue(error);
}

/**
 * Creates a mock function that resolves once then rejects
 */
export function createOnceResolvingMock<T>(
  data: T,
  subsequentError: Error | ApiError
): jest.Mock {
  return jest
    .fn()
    .mockResolvedValueOnce(data)
    .mockRejectedValue(subsequentError);
}

/**
 * Creates a mock fetch response
 */
export function createMockFetchResponse(
  data: unknown,
  options: { ok?: boolean; status?: number; statusText?: string } = {}
): Response {
  const { ok = true, status = 200, statusText = 'OK' } = options;

  return {
    ok,
    status,
    statusText,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
    headers: new Headers(),
    redirected: false,
    type: 'basic',
    url: '',
    clone: function () {
      return this;
    },
    body: null,
    bodyUsed: false,
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    blob: () => Promise.resolve(new Blob()),
    formData: () => Promise.resolve(new FormData()),
    bytes: () => Promise.resolve(new Uint8Array()),
  } as Response;
}

// ==============================================================================
// Async Testing Helpers
// ==============================================================================

/**
 * Advances all timers and flushes pending promises
 */
export async function advanceTimersAndFlush(): Promise<void> {
  await act(async () => {
    jest.runAllTimers();
  });
}

/**
 * Advances timers by a specific amount and flushes promises
 */
export async function advanceTimersByTimeAndFlush(ms: number): Promise<void> {
  await act(async () => {
    jest.advanceTimersByTime(ms);
  });
}

/**
 * Waits for the next tick of the event loop
 */
export function waitForNextTick(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * Waits for a condition to be true
 */
export async function waitForCondition(
  condition: () => boolean,
  timeout = 5000,
  interval = 100
): Promise<void> {
  const startTime = Date.now();
  while (!condition()) {
    if (Date.now() - startTime > timeout) {
      throw new Error('Timeout waiting for condition');
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
}

/**
 * Flushes all pending promises
 */
export function flushPromises(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

// ==============================================================================
// Console Mocking Helpers
// ==============================================================================

/**
 * Creates console spy mocks and returns cleanup function
 */
export function mockConsole(): {
  spies: {
    log: jest.SpyInstance;
    warn: jest.SpyInstance;
    error: jest.SpyInstance;
    debug: jest.SpyInstance;
  };
  restore: () => void;
} {
  const spies = {
    log: jest.spyOn(console, 'log').mockImplementation(),
    warn: jest.spyOn(console, 'warn').mockImplementation(),
    error: jest.spyOn(console, 'error').mockImplementation(),
    debug: jest.spyOn(console, 'debug').mockImplementation(),
  };

  return {
    spies,
    restore: () => {
      spies.log.mockRestore();
      spies.warn.mockRestore();
      spies.error.mockRestore();
      spies.debug.mockRestore();
    },
  };
}

// ==============================================================================
// Storage Mocking Helpers
// ==============================================================================

/**
 * Creates a mock localStorage implementation
 */
export function createMockLocalStorage(): Storage & {
  store: Record<string, string>;
  reset: () => void;
} {
  const store: Record<string, string> = {};

  const mockStorage = {
    store,
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      for (const key of Object.keys(store)) {
        delete store[key];
      }
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
    get length() {
      return Object.keys(store).length;
    },
    reset: () => {
      for (const key of Object.keys(store)) {
        delete store[key];
      }
    },
  };

  return mockStorage;
}

/**
 * Creates a mock sessionStorage implementation
 */
export function createMockSessionStorage(): Storage & {
  store: Record<string, string>;
  reset: () => void;
} {
  return createMockLocalStorage();
}

// ==============================================================================
// Event Helpers
// ==============================================================================

/**
 * Creates a mock keyboard event
 */
export function createKeyboardEvent(
  key: string,
  options: Partial<KeyboardEventInit> = {}
): KeyboardEvent {
  return new KeyboardEvent('keydown', {
    key,
    code: key,
    bubbles: true,
    cancelable: true,
    ...options,
  });
}

/**
 * Creates a mock mouse event
 */
export function createMouseEvent(
  type: string,
  options: Partial<MouseEventInit> = {}
): MouseEvent {
  return new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    ...options,
  });
}

// ==============================================================================
// SWR Mock Helpers
// ==============================================================================

export interface SwrMockReturn<T> {
  data: T | undefined;
  error: Error | undefined;
  isLoading: boolean;
  isValidating: boolean;
  mutate: jest.Mock;
}

/**
 * Creates a mock SWR return value for loading state
 */
export function createSwrLoadingMock<T>(): SwrMockReturn<T> {
  return {
    data: undefined,
    error: undefined,
    isLoading: true,
    isValidating: true,
    mutate: jest.fn(),
  };
}

/**
 * Creates a mock SWR return value for success state
 */
export function createSwrSuccessMock<T>(data: T): SwrMockReturn<T> {
  return {
    data,
    error: undefined,
    isLoading: false,
    isValidating: false,
    mutate: jest.fn(),
  };
}

/**
 * Creates a mock SWR return value for error state
 */
export function createSwrErrorMock<T>(error: Error): SwrMockReturn<T> {
  return {
    data: undefined,
    error,
    isLoading: false,
    isValidating: false,
    mutate: jest.fn(),
  };
}

// ==============================================================================
// Image Mock Helpers (for imageOptimization tests)
// ==============================================================================

/**
 * A mock Image class that immediately loads successfully
 */
export class LoadingImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  src = '';

  constructor() {
    setTimeout(() => {
      if (this.onload) this.onload();
    }, 0);
  }
}

/**
 * A mock Image class that immediately fails
 */
export class FailingImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  src = '';

  constructor() {
    setTimeout(() => {
      if (this.onerror) this.onerror();
    }, 0);
  }
}

/**
 * Sets up a mock Image class that loads successfully
 */
export function setupLoadingImageMock(): void {
  (globalThis as Record<string, unknown>).Image = LoadingImage;
}

/**
 * Sets up a mock Image class that fails to load
 */
export function setupFailingImageMock(): void {
  (globalThis as Record<string, unknown>).Image = FailingImage;
}

/**
 * Restores the original Image class
 */
export function restoreImageMock(): void {
  delete (globalThis as Record<string, unknown>).Image;
}

// ==============================================================================
// WebSocket Mock Helpers
// ==============================================================================

export interface MockWebSocket {
  url: string;
  readyState: number;
  onopen: ((event: Event) => void) | null;
  onclose: ((event: CloseEvent) => void) | null;
  onmessage: ((event: MessageEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  send: jest.Mock;
  close: jest.Mock;
  simulateOpen: () => void;
  simulateClose: (code?: number, reason?: string) => void;
  simulateMessage: (data: unknown) => void;
  simulateError: () => void;
}

/**
 * Creates a mock WebSocket instance
 */
export function createMockWebSocket(url = 'ws://localhost'): MockWebSocket {
  const ws: MockWebSocket = {
    url,
    readyState: 0, // CONNECTING
    onopen: null,
    onclose: null,
    onmessage: null,
    onerror: null,
    send: jest.fn(),
    close: jest.fn(),
    simulateOpen: () => {
      ws.readyState = 1; // OPEN
      if (ws.onopen) ws.onopen(new Event('open'));
    },
    simulateClose: (code = 1000, reason = '') => {
      ws.readyState = 3; // CLOSED
      if (ws.onclose) ws.onclose(new CloseEvent('close', { code, reason }));
    },
    simulateMessage: (data: unknown) => {
      if (ws.onmessage) {
        ws.onmessage(
          new MessageEvent('message', { data: JSON.stringify(data) })
        );
      }
    },
    simulateError: () => {
      if (ws.onerror) ws.onerror(new Event('error'));
    },
  };

  return ws;
}

// ==============================================================================
// Date/Time Helpers
// ==============================================================================

/**
 * Creates a mock date string in ISO format
 */
export function createMockDateString(daysAgo = 0): string {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString();
}

/**
 * Creates a mock timestamp
 */
export function createMockTimestamp(daysAgo = 0): number {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.getTime();
}

// ==============================================================================
// Form Data Helpers
// ==============================================================================

/**
 * Creates a mock file for form data
 */
export function createMockFile(
  name = 'test.pdf',
  type = 'application/pdf',
  size = 1024
): File {
  const content = new Array(size).fill('a').join('');
  return new File([content], name, { type });
}

/**
 * Creates mock FormData with file
 */
export function createMockFormData(file?: File): FormData {
  const formData = new FormData();
  if (file) {
    formData.append('file', file);
  }
  return formData;
}

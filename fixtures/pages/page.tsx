'use client';

import React, { lazy, Suspense } from 'react';

/**
 * Test page for React 19 lazy loading verification
 *
 * This page tests if React.lazy() works correctly with React 19 and Next.js 15.
 * If this page loads without errors, lazy loading can be re-enabled throughout the app.
 *
 * Access: http://localhost:3000/__test-lazy__
 */

// Test React 19 lazy loading
const LazyTestComponent = lazy(() => import('../components/TestComponentImpl'));

// Loading fallback component
const LoadingFallback = () => (
  <div className="flex items-center justify-center p-8">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
      <p className="text-gray-600">Loading test component...</p>
    </div>
  </div>
);

export default function TestLazyLoadingPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            React 19 Lazy Loading Test
          </h1>
          <p className="text-gray-600 mb-6">
            This page tests if React.lazy() works with React 19.1.0 and Next.js 15.3.5.
            The component below should load asynchronously in a separate chunk.
          </p>

          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-yellow-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  <strong>Note:</strong> Check the browser console and Network tab for
                  any errors. The component should load in a separate JavaScript chunk.
                </p>
              </div>
            </div>
          </div>

          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">
              Lazy Loaded Component Below:
            </h2>

            <Suspense fallback={<LoadingFallback />}>
              <LazyTestComponent />
            </Suspense>
          </div>
        </div>

        <div className="bg-blue-50 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-blue-900 mb-4">
            Test Instructions
          </h2>
          <ol className="list-decimal list-inside space-y-2 text-blue-800">
            <li>Open browser DevTools (F12)</li>
            <li>Go to the Network tab</li>
            <li>Filter by &quot;JS&quot; to see JavaScript files</li>
            <li>Refresh this page</li>
            <li>
              Look for a chunk file loading separately (e.g., &quot;123-abc.js&quot;)
            </li>
            <li>Check Console tab for any errors</li>
            <li>If the green box appears above without errors, lazy loading works!</li>
          </ol>
        </div>

        <div className="mt-6 text-center">
          <a
            href="/admin"
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Admin Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}

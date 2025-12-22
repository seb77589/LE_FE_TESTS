'use client';

/**
 * Test component for React 19 lazy loading verification
 * Used to test if lazy loading works without webpack errors
 */
export default function TestComponentImpl() {
  return (
    <div className="p-8 bg-green-100 border-2 border-green-500 rounded-lg">
      <h2 className="text-2xl font-bold text-green-800 mb-4">
        ✅ React 19 Lazy Loading Works!
      </h2>
      <p className="text-gray-700">
        This component was lazy loaded successfully. If you can see this message, React
        19 lazy loading is functioning correctly in this Next.js 15 environment.
      </p>
      <div className="mt-4 p-4 bg-white rounded">
        <code className="text-sm">
          React Version: 19.1.0
          <br />
          Next.js Version: 15.3.5
          <br />
          Lazy Loading: ✅ Working
        </code>
      </div>
    </div>
  );
}

/**
 * Contract Tests: OpenAPI Schema Validation
 *
 * Validates that frontend request/response formats match backend OpenAPI schemas.
 * Uses AJV (Another JSON Schema Validator) to validate payloads against OpenAPI schemas.
 *
 * @description Prevents schema mismatches between frontend and backend at build time.
 * Run with: npm run test:contract
 *
 * @since 0.2.0
 */

import Ajv from 'ajv';
import addFormats from 'ajv-formats';

describe('OpenAPI Schema Validation', () => {
  let openApiSchema: any;
  let ajv: Ajv;

  beforeAll(async () => {
    // Fetch OpenAPI schema from backend
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const response = await fetch(`${backendUrl}/openapi.json`);

    if (!response.ok) {
      throw new Error(`Failed to fetch OpenAPI schema: ${response.statusText}`);
    }

    openApiSchema = await response.json();

    // Initialize AJV with OpenAPI schema support
    ajv = new Ajv({
      allErrors: true,
      strict: false, // OpenAPI 3.0 schemas may not be fully JSON Schema compliant
    });
    addFormats(ajv); // Add date-time, email, uri, etc.
  });

  test('OpenAPI schema should be valid', () => {
    expect(openApiSchema).toBeDefined();
    expect(openApiSchema.components).toBeDefined();
    expect(openApiSchema.components.schemas).toBeDefined();
  });

  describe('Frontend Error Reporting Schema', () => {
    test('should validate FrontendErrorReport schema exists', () => {
      expect(openApiSchema.components.schemas.FrontendErrorReport).toBeDefined();
    });

    test('should validate FrontendErrorBatch schema exists', () => {
      expect(openApiSchema.components.schemas.FrontendErrorBatch).toBeDefined();
    });

    test('should validate single error format', () => {
      const schema = openApiSchema.components.schemas.FrontendErrorReport;
      const validate = ajv.compile(schema);

      // Valid single error payload
      const validPayload = {
        message: 'TypeError: Cannot read property of undefined',
        stack: 'Error stack trace...',
        url: 'https://app.legalease.com/dashboard',
        user_agent: 'Mozilla/5.0',
        timestamp: '2026-01-10T12:34:56.789Z',
        severity: 'error',
        metadata: {
          userId: 'user-123',
          sessionId: 'session-abc',
        },
      };

      const valid = validate(validPayload);

      if (!valid) {
        console.error('Validation errors:', validate.errors);
      }

      expect(valid).toBe(true);
    });

    test('should validate batch error format', () => {
      const schema = openApiSchema.components.schemas.FrontendErrorBatch;
      const validate = ajv.compile(schema);

      // Valid batch error payload (what frontend actually sends)
      const validPayload = {
        errors: [
          {
            id: '1704888896789-abc123',
            timestamp: '2026-01-10T12:34:56.789Z',
            type: 'error',
            data: {
              message: 'Network request failed',
              url: 'https://app.legalease.com/dashboard',
              status: 500,
            },
          },
          {
            id: '1704888897890-def456',
            timestamp: '2026-01-10T12:34:57.890Z',
            type: 'user_action',
            data: {
              action: 'button_click',
              buttonId: 'submit',
            },
          },
        ],
        metadata: {
          userAgent: 'Mozilla/5.0',
          timestamp: '2026-01-10T12:34:58.000Z',
          batchSize: 2,
        },
      };

      const valid = validate(validPayload);

      if (!valid) {
        console.error('Validation errors:', validate.errors);
      }

      expect(valid).toBe(true);
    });

    test('should reject invalid error format', () => {
      const schema = openApiSchema.components.schemas.FrontendErrorReport;
      const validate = ajv.compile(schema);

      // Invalid payload (missing required 'message' field)
      const invalidPayload = {
        stack: 'Error stack trace...',
        severity: 'error',
      };

      const valid = validate(invalidPayload);

      expect(valid).toBe(false);
      expect(validate.errors).toBeDefined();
      expect(validate.errors![0].keyword).toBe('required');
    });
  });

  describe('Common Response Schemas', () => {
    test('should validate ErrorResponse schema', () => {
      expect(openApiSchema.components.schemas.ErrorResponse).toBeDefined();

      const schema = openApiSchema.components.schemas.ErrorResponse;
      const validate = ajv.compile(schema);

      const validError = {
        detail: 'Resource not found',
        code: 'NOT_FOUND',
        trace_id: '1234567890abcdef',
      };

      expect(validate(validError)).toBe(true);
    });

    test('should validate SuccessResponse schema', () => {
      expect(openApiSchema.components.schemas.SuccessResponse).toBeDefined();

      const schema = openApiSchema.components.schemas.SuccessResponse;
      const validate = ajv.compile(schema);

      const validSuccess = {
        message: 'Operation completed successfully',
        metadata: {
          processedItems: 10,
        },
      };

      expect(validate(validSuccess)).toBe(true);
    });

    test('should validate PaginationInfo schema', () => {
      expect(openApiSchema.components.schemas.PaginationInfo).toBeDefined();

      const schema = openApiSchema.components.schemas.PaginationInfo;
      const validate = ajv.compile(schema);

      const validPagination = {
        page: 1,
        page_size: 20,
        total: 100,
      };

      expect(validate(validPagination)).toBe(true);
    });
  });

  describe('Schema Completeness', () => {
    test('should have all expected schemas defined', () => {
      const expectedSchemas = [
        'ErrorResponse',
        'SuccessResponse',
        'PaginationInfo',
        'FrontendErrorReport',
        'FrontendErrorBatch',
        'UserResponse',
        'DocumentResponse',
        'Token',
      ];

      const missingSchemas: string[] = [];

      for (const schemaName of expectedSchemas) {
        if (!openApiSchema.components.schemas[schemaName]) {
          missingSchemas.push(schemaName);
        }
      }

      if (missingSchemas.length > 0) {
        console.error('Missing schemas:', missingSchemas);
      }

      expect(missingSchemas).toEqual([]);
    });

    test('should log all available schemas for reference', () => {
      const schemas = Object.keys(openApiSchema.components.schemas).sort();

      console.log('\n📋 Available OpenAPI Schemas:');
      console.log('═'.repeat(60));
      schemas.forEach((schema, idx) => {
        console.log(`${(idx + 1).toString().padStart(3, ' ')}. ${schema}`);
      });
      console.log('═'.repeat(60));
      console.log(`Total: ${schemas.length} schemas\n`);

      expect(schemas.length).toBeGreaterThan(0);
    });
  });
});

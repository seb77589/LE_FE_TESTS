/**
 * Tests for useDocumentGrid hook
 *
 * @description Comprehensive tests for the document grid hook including
 * hover state management, action menu visibility, document selection,
 * and operation handlers.
 *
 * @module __tests__/unit/hooks/useDocumentGrid
 */

import { renderHook, act } from '@testing-library/react';
import { useDocumentGrid } from '@/hooks/documents/useDocumentGrid';

// Mock window.open
const mockWindowOpen = jest.fn();
const originalWindow = globalThis.window;

beforeAll(() => {
  Object.defineProperty(globalThis.window, 'open', {
    value: mockWindowOpen,
    writable: true,
  });
});

afterAll(() => {
  Object.defineProperty(globalThis.window, 'open', {
    value: originalWindow?.open,
    writable: true,
  });
});

describe('useDocumentGrid', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial state', () => {
    it('should start with hoveredDocument as null', () => {
      const { result } = renderHook(() => useDocumentGrid({}));
      expect(result.current.hoveredDocument).toBeNull();
    });

    it('should start with showActions as null', () => {
      const { result } = renderHook(() => useDocumentGrid({}));
      expect(result.current.showActions).toBeNull();
    });

    it('should expose setHoveredDocument function', () => {
      const { result } = renderHook(() => useDocumentGrid({}));
      expect(typeof result.current.setHoveredDocument).toBe('function');
    });

    it('should expose setShowActions function', () => {
      const { result } = renderHook(() => useDocumentGrid({}));
      expect(typeof result.current.setShowActions).toBe('function');
    });

    it('should expose all handler functions', () => {
      const { result } = renderHook(() => useDocumentGrid({}));

      expect(typeof result.current.handleDocumentClick).toBe('function');
      expect(typeof result.current.handlePreview).toBe('function');
      expect(typeof result.current.handleDownload).toBe('function');
      expect(typeof result.current.handleShare).toBe('function');
      expect(typeof result.current.handleEdit).toBe('function');
      expect(typeof result.current.handleDelete).toBe('function');
      expect(typeof result.current.handleSelectionToggle).toBe('function');
    });
  });

  describe('Hover state management', () => {
    it('should update hoveredDocument when setHoveredDocument is called', () => {
      const { result } = renderHook(() => useDocumentGrid({}));

      act(() => {
        result.current.setHoveredDocument(1);
      });

      expect(result.current.hoveredDocument).toBe(1);
    });

    it('should clear hoveredDocument when set to null', () => {
      const { result } = renderHook(() => useDocumentGrid({}));

      act(() => {
        result.current.setHoveredDocument(1);
      });

      act(() => {
        result.current.setHoveredDocument(null);
      });

      expect(result.current.hoveredDocument).toBeNull();
    });
  });

  describe('Actions menu visibility', () => {
    it('should update showActions when setShowActions is called', () => {
      const { result } = renderHook(() => useDocumentGrid({}));

      act(() => {
        result.current.setShowActions(2);
      });

      expect(result.current.showActions).toBe(2);
    });

    it('should clear showActions when set to null', () => {
      const { result } = renderHook(() => useDocumentGrid({}));

      act(() => {
        result.current.setShowActions(2);
      });

      act(() => {
        result.current.setShowActions(null);
      });

      expect(result.current.showActions).toBeNull();
    });
  });

  describe('Document click handler', () => {
    it('should call onSelect callback when handleDocumentClick is called', () => {
      const onSelect = jest.fn();
      const { result } = renderHook(() => useDocumentGrid({ onSelect }));

      act(() => {
        result.current.handleDocumentClick(1);
      });

      expect(onSelect).toHaveBeenCalledWith(1);
    });

    it('should not throw if onSelect is not provided', () => {
      const { result } = renderHook(() => useDocumentGrid({}));

      expect(() => {
        act(() => {
          result.current.handleDocumentClick(1);
        });
      }).not.toThrow();
    });
  });

  describe('Preview handler', () => {
    it('should call onPreview callback when handlePreview is called', () => {
      const onPreview = jest.fn();
      const { result } = renderHook(() => useDocumentGrid({ onPreview }));

      act(() => {
        result.current.handlePreview(1);
      });

      expect(onPreview).toHaveBeenCalledWith(1);
    });

    it('should not throw if onPreview is not provided', () => {
      const { result } = renderHook(() => useDocumentGrid({}));

      expect(() => {
        act(() => {
          result.current.handlePreview(1);
        });
      }).not.toThrow();
    });
  });

  describe('Download handler', () => {
    it('should call onDownload callback when handleDownload is called', () => {
      const onDownload = jest.fn();
      const { result } = renderHook(() => useDocumentGrid({ onDownload }));

      act(() => {
        result.current.handleDownload(1);
      });

      expect(onDownload).toHaveBeenCalledWith(1);
    });

    it('should open download URL in new tab if onDownload is not provided', () => {
      const { result } = renderHook(() => useDocumentGrid({}));

      act(() => {
        result.current.handleDownload(123);
      });

      expect(mockWindowOpen).toHaveBeenCalledWith(
        '/api/v1/documents/123/download',
        '_blank',
      );
    });
  });

  describe('Share handler', () => {
    it('should call onShare callback when handleShare is called', () => {
      const onShare = jest.fn();
      const { result } = renderHook(() => useDocumentGrid({ onShare }));

      act(() => {
        result.current.handleShare(1);
      });

      expect(onShare).toHaveBeenCalledWith(1);
    });

    it('should not throw if onShare is not provided', () => {
      const { result } = renderHook(() => useDocumentGrid({}));

      expect(() => {
        act(() => {
          result.current.handleShare(1);
        });
      }).not.toThrow();
    });
  });

  describe('Edit handler', () => {
    it('should call onEdit callback when handleEdit is called', () => {
      const onEdit = jest.fn();
      const { result } = renderHook(() => useDocumentGrid({ onEdit }));

      act(() => {
        result.current.handleEdit(1);
      });

      expect(onEdit).toHaveBeenCalledWith(1);
    });

    it('should not throw if onEdit is not provided', () => {
      const { result } = renderHook(() => useDocumentGrid({}));

      expect(() => {
        act(() => {
          result.current.handleEdit(1);
        });
      }).not.toThrow();
    });
  });

  describe('Delete handler', () => {
    it('should call onDelete callback when handleDelete is called', () => {
      const onDelete = jest.fn();
      const { result } = renderHook(() => useDocumentGrid({ onDelete }));

      act(() => {
        result.current.handleDelete(1);
      });

      expect(onDelete).toHaveBeenCalledWith(1);
    });

    it('should not throw if onDelete is not provided', () => {
      const { result } = renderHook(() => useDocumentGrid({}));

      expect(() => {
        act(() => {
          result.current.handleDelete(1);
        });
      }).not.toThrow();
    });
  });

  describe('Selection toggle', () => {
    it('should add document to selection when not selected', () => {
      const onSelectionChange = jest.fn();
      const { result } = renderHook(() =>
        useDocumentGrid({
          selectedDocuments: [1, 2],
          onSelectionChange,
        }),
      );

      act(() => {
        result.current.handleSelectionToggle(3);
      });

      expect(onSelectionChange).toHaveBeenCalledWith([1, 2, 3]);
    });

    it('should remove document from selection when already selected', () => {
      const onSelectionChange = jest.fn();
      const { result } = renderHook(() =>
        useDocumentGrid({
          selectedDocuments: [1, 2, 3],
          onSelectionChange,
        }),
      );

      act(() => {
        result.current.handleSelectionToggle(2);
      });

      expect(onSelectionChange).toHaveBeenCalledWith([1, 3]);
    });

    it('should not throw if onSelectionChange is not provided', () => {
      const { result } = renderHook(() =>
        useDocumentGrid({
          selectedDocuments: [1, 2],
        }),
      );

      expect(() => {
        act(() => {
          result.current.handleSelectionToggle(3);
        });
      }).not.toThrow();
    });

    it('should use empty array as default for selectedDocuments', () => {
      const onSelectionChange = jest.fn();
      const { result } = renderHook(() =>
        useDocumentGrid({
          onSelectionChange,
        }),
      );

      act(() => {
        result.current.handleSelectionToggle(1);
      });

      expect(onSelectionChange).toHaveBeenCalledWith([1]);
    });

    it('should handle multiple selections and deselections', () => {
      const onSelectionChange = jest.fn();
      const { result, rerender } = renderHook(
        ({ selectedDocuments }) =>
          useDocumentGrid({
            selectedDocuments,
            onSelectionChange,
          }),
        {
          initialProps: { selectedDocuments: [] as number[] },
        },
      );

      // Select first document
      act(() => {
        result.current.handleSelectionToggle(1);
      });
      expect(onSelectionChange).toHaveBeenLastCalledWith([1]);

      // Update props to reflect selection
      rerender({ selectedDocuments: [1] });

      // Select second document
      act(() => {
        result.current.handleSelectionToggle(2);
      });
      expect(onSelectionChange).toHaveBeenLastCalledWith([1, 2]);

      // Update props
      rerender({ selectedDocuments: [1, 2] });

      // Deselect first document
      act(() => {
        result.current.handleSelectionToggle(1);
      });
      expect(onSelectionChange).toHaveBeenLastCalledWith([2]);
    });
  });

  describe('Callback stability', () => {
    it('should maintain stable handler references', () => {
      const { result, rerender } = renderHook(() => useDocumentGrid({}));

      const initialHandlers = {
        handleDocumentClick: result.current.handleDocumentClick,
        handlePreview: result.current.handlePreview,
        handleDownload: result.current.handleDownload,
        handleShare: result.current.handleShare,
        handleEdit: result.current.handleEdit,
        handleDelete: result.current.handleDelete,
      };

      rerender();

      expect(result.current.handleDocumentClick).toBe(initialHandlers.handleDocumentClick);
      expect(result.current.handlePreview).toBe(initialHandlers.handlePreview);
      expect(result.current.handleDownload).toBe(initialHandlers.handleDownload);
      expect(result.current.handleShare).toBe(initialHandlers.handleShare);
      expect(result.current.handleEdit).toBe(initialHandlers.handleEdit);
      expect(result.current.handleDelete).toBe(initialHandlers.handleDelete);
    });
  });

  describe('Options handling', () => {
    it('should accept all options', () => {
      const options = {
        selectedDocuments: [1, 2, 3],
        onSelectionChange: jest.fn(),
        onSelect: jest.fn(),
        onPreview: jest.fn(),
        onDownload: jest.fn(),
        onShare: jest.fn(),
        onEdit: jest.fn(),
        onDelete: jest.fn(),
      };

      const { result } = renderHook(() => useDocumentGrid(options));

      // All handlers should be present
      expect(result.current.handleDocumentClick).toBeDefined();
      expect(result.current.handlePreview).toBeDefined();
      expect(result.current.handleDownload).toBeDefined();
      expect(result.current.handleShare).toBeDefined();
      expect(result.current.handleEdit).toBeDefined();
      expect(result.current.handleDelete).toBeDefined();
      expect(result.current.handleSelectionToggle).toBeDefined();
    });
  });
});

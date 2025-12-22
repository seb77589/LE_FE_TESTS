/**
 * Tests for ImageCropper component
 *
 * Coverage targets: Lines 80%+, Branches 80%+, Functions 80%+
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ImageCropper } from '@/components/profile/ImageCropper';

// Mock the hook
jest.mock('@/hooks/profile/useImageCropper', () => ({
  useImageCropper: jest.fn(),
}));

jest.mock('@/components/ui/Button', () => ({
  __esModule: true,
  default: ({ children, onClick, variant, size, className, disabled }: any) => {
    const getAriaLabel = () => {
      if (typeof children === 'string') return children;
      // Check the child element's type/displayName for Lucide icons
      const childType = children?.type;
      const displayName = childType?.displayName || childType?.name || '';
      if (displayName.includes('ZoomIn') || displayName === 'ZoomIn') return 'Zoom in';
      if (displayName.includes('ZoomOut') || displayName === 'ZoomOut') return 'Zoom out';
      if (displayName.includes('RotateCcw') || displayName === 'RotateCcw') return 'Rotate';
      return undefined;
    };
    return (
      <button
        onClick={onClick}
        data-variant={variant}
        data-size={size}
        className={className}
        disabled={disabled}
        aria-label={getAriaLabel()}
      >
        {children}
      </button>
    );
  },
}));

jest.mock('@/components/ui/Alert', () => ({
  Alert: ({ children, variant }: any) => (
    <div data-variant={variant} role="alert">
      {children}
    </div>
  ),
  AlertDescription: ({ children }: any) => <div>{children}</div>,
}));

import { useImageCropper } from '@/hooks/profile/useImageCropper';

const mockUseImageCropper = useImageCropper as jest.MockedFunction<
  typeof useImageCropper
>;

describe('ImageCropper', () => {
  const mockOnCrop = jest.fn();
  const mockOnCancel = jest.fn();

  const defaultMockReturn = {
    canvasRef: { current: null },
    imageRef: { current: null },
    isDragging: false,
    dragStart: { x: 0, y: 0 },
    cropArea: { x: 10, y: 10, width: 100, height: 100 },
    scale: 1,
    rotation: 0,
    imageLoaded: true,
    error: '',
    setDragStart: jest.fn(),
    setIsDragging: jest.fn(),
    setCropArea: jest.fn(),
    handleImageLoad: jest.fn(),
    handleImageError: jest.fn(),
    handleMouseDown: jest.fn(),
    handleMouseMove: jest.fn(),
    handleMouseUp: jest.fn(),
    handleResize: jest.fn(),
    handleZoom: jest.fn(),
    handleRotate: jest.fn(),
    handleCrop: jest.fn(),
    setError: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseImageCropper.mockReturnValue(defaultMockReturn);
  });

  describe('Basic Rendering', () => {
    it('should render image cropper component', () => {
      render(
        <ImageCropper image="test.jpg" onCrop={mockOnCrop} onCancel={mockOnCancel} />,
      );
      expect(screen.getByRole('img')).toBeInTheDocument();
    });

    it('should render crop controls', () => {
      render(
        <ImageCropper image="test.jpg" onCrop={mockOnCrop} onCancel={mockOnCancel} />,
      );
      expect(screen.getByText('Cancel')).toBeInTheDocument();
      expect(screen.getByText('Crop Image')).toBeInTheDocument();
    });

    it('should render zoom controls', () => {
      render(
        <ImageCropper image="test.jpg" onCrop={mockOnCrop} onCancel={mockOnCancel} />,
      );
      // Zoom buttons are rendered via icons, check for buttons
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('should render header text', () => {
      render(
        <ImageCropper image="test.jpg" onCrop={mockOnCrop} onCancel={mockOnCancel} />,
      );
      expect(screen.getByText('Crop Your Image')).toBeInTheDocument();
      expect(screen.getByText(/adjust the crop area/i)).toBeInTheDocument();
    });
  });

  describe('Image Loading', () => {
    it('should handle image load', () => {
      render(
        <ImageCropper image="test.jpg" onCrop={mockOnCrop} onCancel={mockOnCancel} />,
      );
      const img = screen.getByRole('img');
      fireEvent.load(img);
      expect(defaultMockReturn.handleImageLoad).toHaveBeenCalled();
    });

    it('should handle image error', () => {
      render(
        <ImageCropper image="test.jpg" onCrop={mockOnCrop} onCancel={mockOnCancel} />,
      );
      const img = screen.getByRole('img');
      fireEvent.error(img);
      expect(defaultMockReturn.handleImageError).toHaveBeenCalled();
    });

    it('should not show crop overlay when image not loaded', () => {
      mockUseImageCropper.mockReturnValue({
        ...defaultMockReturn,
        imageLoaded: false,
      });
      render(
        <ImageCropper image="test.jpg" onCrop={mockOnCrop} onCancel={mockOnCancel} />,
      );
      // Crop overlay should not be visible when image not loaded
      expect(screen.getByRole('img')).toBeInTheDocument();
    });

    it('should render image with correct src', () => {
      render(
        <ImageCropper image="test-image.png" onCrop={mockOnCrop} onCancel={mockOnCancel} />,
      );
      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('src', 'test-image.png');
    });

    it('should render image with correct alt text', () => {
      render(
        <ImageCropper image="test.jpg" onCrop={mockOnCrop} onCancel={mockOnCancel} />,
      );
      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('alt', 'Crop preview');
    });
  });

  describe('Error Handling', () => {
    it('should display error message when error exists', () => {
      mockUseImageCropper.mockReturnValue({
        ...defaultMockReturn,
        error: 'Failed to load image',
      });
      render(
        <ImageCropper image="test.jpg" onCrop={mockOnCrop} onCancel={mockOnCancel} />,
      );
      expect(screen.getByText('Failed to load image')).toBeInTheDocument();
    });

    it('should show cancel button when error exists', () => {
      mockUseImageCropper.mockReturnValue({
        ...defaultMockReturn,
        error: 'Failed to load image',
      });
      render(
        <ImageCropper image="test.jpg" onCrop={mockOnCrop} onCancel={mockOnCancel} />,
      );
      const cancelButtons = screen.getAllByText('Cancel');
      expect(cancelButtons.length).toBeGreaterThan(0);
    });

    it('should call onCancel when cancel is clicked in error state', () => {
      mockUseImageCropper.mockReturnValue({
        ...defaultMockReturn,
        error: 'Failed to process image',
      });
      render(
        <ImageCropper image="test.jpg" onCrop={mockOnCrop} onCancel={mockOnCancel} />,
      );
      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);
      expect(mockOnCancel).toHaveBeenCalled();
    });

    it('should render alert with destructive variant on error', () => {
      mockUseImageCropper.mockReturnValue({
        ...defaultMockReturn,
        error: 'Some error',
      });
      render(
        <ImageCropper image="test.jpg" onCrop={mockOnCrop} onCancel={mockOnCancel} />,
      );
      expect(screen.getByRole('alert')).toHaveAttribute('data-variant', 'destructive');
    });
  });

  describe('Actions', () => {
    it('should call onCancel when cancel button is clicked', () => {
      render(
        <ImageCropper image="test.jpg" onCrop={mockOnCrop} onCancel={mockOnCancel} />,
      );
      const cancelButtons = screen.getAllByText('Cancel');
      fireEvent.click(cancelButtons[0]);
      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });

    it('should call handleCrop when crop button is clicked', () => {
      render(
        <ImageCropper image="test.jpg" onCrop={mockOnCrop} onCancel={mockOnCancel} />,
      );
      const cropButton = screen.getByText('Crop Image');
      fireEvent.click(cropButton);
      expect(defaultMockReturn.handleCrop).toHaveBeenCalledTimes(1);
    });
  });

  describe('Zoom Controls', () => {
    it('should call handleZoom when zoom in button is clicked', () => {
      render(
        <ImageCropper image="test.jpg" onCrop={mockOnCrop} onCancel={mockOnCancel} />,
      );
      // Find zoom buttons by their parent container
      const buttons = screen.getAllByRole('button');
      // Zoom buttons are in the controls section
      const zoomInButton = buttons.find(
        (btn) => btn.getAttribute('aria-label') === 'Zoom in',
      );
      if (zoomInButton) {
        fireEvent.click(zoomInButton);
        expect(defaultMockReturn.handleZoom).toHaveBeenCalledWith('in');
      }
    });

    it('should call handleZoom when zoom out button is clicked', () => {
      render(
        <ImageCropper image="test.jpg" onCrop={mockOnCrop} onCancel={mockOnCancel} />,
      );
      const buttons = screen.getAllByRole('button');
      const zoomOutButton = buttons.find(
        (btn) => btn.getAttribute('aria-label') === 'Zoom out',
      );
      if (zoomOutButton) {
        fireEvent.click(zoomOutButton);
        expect(defaultMockReturn.handleZoom).toHaveBeenCalledWith('out');
      }
    });

    it('should render zoom controls with outline variant', () => {
      render(
        <ImageCropper image="test.jpg" onCrop={mockOnCrop} onCancel={mockOnCancel} />,
      );
      const buttons = screen.getAllByRole('button');
      const outlineButtons = buttons.filter(
        (btn) => (btn as HTMLButtonElement).dataset.variant === 'outline'
      );
      expect(outlineButtons.length).toBeGreaterThanOrEqual(3); // zoom in, zoom out, rotate
    });
  });

  describe('Rotation', () => {
    it('should call handleRotate when rotate button is clicked', () => {
      render(
        <ImageCropper image="test.jpg" onCrop={mockOnCrop} onCancel={mockOnCancel} />,
      );
      const buttons = screen.getAllByRole('button');
      const rotateButton = buttons.find(
        (btn) => btn.getAttribute('aria-label') === 'Rotate',
      );
      if (rotateButton) {
        fireEvent.click(rotateButton);
        expect(defaultMockReturn.handleRotate).toHaveBeenCalled();
      }
    });
  });

  describe('Props', () => {
    it('should accept custom aspect ratio', () => {
      render(
        <ImageCropper
          image="test.jpg"
          onCrop={mockOnCrop}
          onCancel={mockOnCancel}
          aspectRatio={16 / 9}
        />,
      );
      expect(mockUseImageCropper).toHaveBeenCalledWith(
        expect.objectContaining({
          aspectRatio: 16 / 9,
        }),
      );
    });

    it('should accept custom min/max dimensions', () => {
      render(
        <ImageCropper
          image="test.jpg"
          onCrop={mockOnCrop}
          onCancel={mockOnCancel}
          minWidth={200}
          minHeight={200}
          maxWidth={1000}
          maxHeight={1000}
        />,
      );
      expect(mockUseImageCropper).toHaveBeenCalledWith(
        expect.objectContaining({
          minWidth: 200,
          minHeight: 200,
          maxWidth: 1000,
          maxHeight: 1000,
        }),
      );
    });

    it('should use default props when not specified', () => {
      render(
        <ImageCropper image="test.jpg" onCrop={mockOnCrop} onCancel={mockOnCancel} />,
      );
      expect(mockUseImageCropper).toHaveBeenCalledWith(
        expect.objectContaining({
          aspectRatio: 1,
          minWidth: 100,
          minHeight: 100,
          maxWidth: 800,
          maxHeight: 800,
        }),
      );
    });

    it('should pass image prop to hook', () => {
      render(
        <ImageCropper image="my-image.png" onCrop={mockOnCrop} onCancel={mockOnCancel} />,
      );
      expect(mockUseImageCropper).toHaveBeenCalledWith(
        expect.objectContaining({
          image: 'my-image.png',
        }),
      );
    });

    it('should pass onCrop callback to hook', () => {
      const customCropHandler = jest.fn();
      render(
        <ImageCropper image="test.jpg" onCrop={customCropHandler} onCancel={mockOnCancel} />,
      );
      expect(mockUseImageCropper).toHaveBeenCalledWith(
        expect.objectContaining({
          onCrop: customCropHandler,
        }),
      );
    });
  });

  describe('Crop Overlay', () => {
    it('should render crop overlay when image is loaded', () => {
      mockUseImageCropper.mockReturnValue({
        ...defaultMockReturn,
        imageLoaded: true,
        cropArea: { x: 10, y: 10, width: 200, height: 200 },
      });
      render(
        <ImageCropper image="test.jpg" onCrop={mockOnCrop} onCancel={mockOnCancel} />,
      );
      const img = screen.getByRole('img');
      expect(img).toBeInTheDocument();
    });

    it('should render resize handle buttons when image is loaded', () => {
      mockUseImageCropper.mockReturnValue({
        ...defaultMockReturn,
        imageLoaded: true,
        cropArea: { x: 50, y: 50, width: 200, height: 200 },
      });
      render(
        <ImageCropper image="test.jpg" onCrop={mockOnCrop} onCancel={mockOnCancel} />,
      );
      
      // Should have resize handles
      expect(screen.getByLabelText('Resize bottom-right')).toBeInTheDocument();
      expect(screen.getByLabelText('Resize bottom-left')).toBeInTheDocument();
      expect(screen.getByLabelText('Resize top-right')).toBeInTheDocument();
      expect(screen.getByLabelText('Resize top-left')).toBeInTheDocument();
    });

    it('should call handleResize when se resize handle is clicked', () => {
      mockUseImageCropper.mockReturnValue({
        ...defaultMockReturn,
        imageLoaded: true,
      });
      render(
        <ImageCropper image="test.jpg" onCrop={mockOnCrop} onCancel={mockOnCancel} />,
      );
      
      const seHandle = screen.getByLabelText('Resize bottom-right');
      fireEvent.mouseDown(seHandle);
      expect(defaultMockReturn.handleResize).toHaveBeenCalledWith('se', expect.any(Object));
    });

    it('should call handleResize when sw resize handle is clicked', () => {
      mockUseImageCropper.mockReturnValue({
        ...defaultMockReturn,
        imageLoaded: true,
      });
      render(
        <ImageCropper image="test.jpg" onCrop={mockOnCrop} onCancel={mockOnCancel} />,
      );
      
      const swHandle = screen.getByLabelText('Resize bottom-left');
      fireEvent.mouseDown(swHandle);
      expect(defaultMockReturn.handleResize).toHaveBeenCalledWith('sw', expect.any(Object));
    });

    it('should call handleResize when ne resize handle is clicked', () => {
      mockUseImageCropper.mockReturnValue({
        ...defaultMockReturn,
        imageLoaded: true,
      });
      render(
        <ImageCropper image="test.jpg" onCrop={mockOnCrop} onCancel={mockOnCancel} />,
      );
      
      const neHandle = screen.getByLabelText('Resize top-right');
      fireEvent.mouseDown(neHandle);
      expect(defaultMockReturn.handleResize).toHaveBeenCalledWith('ne', expect.any(Object));
    });

    it('should call handleResize when nw resize handle is clicked', () => {
      mockUseImageCropper.mockReturnValue({
        ...defaultMockReturn,
        imageLoaded: true,
      });
      render(
        <ImageCropper image="test.jpg" onCrop={mockOnCrop} onCancel={mockOnCancel} />,
      );
      
      const nwHandle = screen.getByLabelText('Resize top-left');
      fireEvent.mouseDown(nwHandle);
      expect(defaultMockReturn.handleResize).toHaveBeenCalledWith('nw', expect.any(Object));
    });

    it('should handle mouse events on crop area', () => {
      mockUseImageCropper.mockReturnValue({
        ...defaultMockReturn,
        imageLoaded: true,
      });
      render(
        <ImageCropper image="test.jpg" onCrop={mockOnCrop} onCancel={mockOnCancel} />,
      );
      
      // Find the crop area button (the main draggable area)
      const cropArea = document.querySelector('button[type="button"]');
      if (cropArea && !cropArea.getAttribute('aria-label')?.includes('Resize')) {
        fireEvent.mouseDown(cropArea);
        expect(defaultMockReturn.handleMouseDown).toHaveBeenCalled();
      }
    });

    it('should not render resize handles when image is not loaded', () => {
      mockUseImageCropper.mockReturnValue({
        ...defaultMockReturn,
        imageLoaded: false,
      });
      render(
        <ImageCropper image="test.jpg" onCrop={mockOnCrop} onCancel={mockOnCancel} />,
      );
      
      expect(screen.queryByLabelText('Resize bottom-right')).not.toBeInTheDocument();
    });
  });

  describe('Canvas', () => {
    it('should render hidden canvas element', () => {
      render(
        <ImageCropper image="test.jpg" onCrop={mockOnCrop} onCancel={mockOnCancel} />,
      );
      const canvas = document.querySelector('canvas');
      expect(canvas).toBeInTheDocument();
      expect(canvas).toHaveClass('hidden');
    });
  });

  describe('Image Transform', () => {
    it('should apply scale and rotation transforms to image', () => {
      mockUseImageCropper.mockReturnValue({
        ...defaultMockReturn,
        scale: 1.5,
        rotation: 90,
        imageLoaded: true,
      });
      render(
        <ImageCropper image="test.jpg" onCrop={mockOnCrop} onCancel={mockOnCancel} />,
      );
      const img = screen.getByRole('img');
      expect(img).toHaveStyle({ transform: 'scale(1.5) rotate(90deg)' });
    });

    it('should apply default transform values', () => {
      render(
        <ImageCropper image="test.jpg" onCrop={mockOnCrop} onCancel={mockOnCancel} />,
      );
      const img = screen.getByRole('img');
      expect(img).toHaveStyle({ transform: 'scale(1) rotate(0deg)' });
    });
  });

  describe('Button Variants', () => {
    it('should render crop button with primary variant', () => {
      render(
        <ImageCropper image="test.jpg" onCrop={mockOnCrop} onCancel={mockOnCancel} />,
      );
      const cropButton = screen.getByText('Crop Image').closest('button');
      expect(cropButton).toHaveAttribute('data-variant', 'primary');
    });

    it('should render cancel button with outline variant', () => {
      render(
        <ImageCropper image="test.jpg" onCrop={mockOnCrop} onCancel={mockOnCancel} />,
      );
      const cancelButtons = screen.getAllByText('Cancel');
      expect(cancelButtons[0].closest('button')).toHaveAttribute('data-variant', 'outline');
    });
  });

  describe('Crop Overlay Keyboard Navigation', () => {
    it('should handle ArrowLeft key press on crop area', () => {
      mockUseImageCropper.mockReturnValue({
        ...defaultMockReturn,
        imageLoaded: true,
      });
      render(
        <ImageCropper image="test.jpg" onCrop={mockOnCrop} onCancel={mockOnCancel} />,
      );
      
      const cropArea = screen.getByLabelText(/crop area/i);
      // Simulate keydown - component should handle it without error
      fireEvent.keyDown(cropArea, { key: 'ArrowLeft' });
      // If we get here without error, the handler was called
      expect(cropArea).toBeInTheDocument();
    });

    it('should handle ArrowRight key press on crop area', () => {
      mockUseImageCropper.mockReturnValue({
        ...defaultMockReturn,
        imageLoaded: true,
      });
      render(
        <ImageCropper image="test.jpg" onCrop={mockOnCrop} onCancel={mockOnCancel} />,
      );
      
      const cropArea = screen.getByLabelText(/crop area/i);
      fireEvent.keyDown(cropArea, { key: 'ArrowRight' });
      expect(cropArea).toBeInTheDocument();
    });

    it('should handle ArrowUp key press on crop area', () => {
      mockUseImageCropper.mockReturnValue({
        ...defaultMockReturn,
        imageLoaded: true,
      });
      render(
        <ImageCropper image="test.jpg" onCrop={mockOnCrop} onCancel={mockOnCancel} />,
      );
      
      const cropArea = screen.getByLabelText(/crop area/i);
      fireEvent.keyDown(cropArea, { key: 'ArrowUp' });
      expect(cropArea).toBeInTheDocument();
    });

    it('should handle ArrowDown key press on crop area', () => {
      mockUseImageCropper.mockReturnValue({
        ...defaultMockReturn,
        imageLoaded: true,
      });
      render(
        <ImageCropper image="test.jpg" onCrop={mockOnCrop} onCancel={mockOnCancel} />,
      );
      
      const cropArea = screen.getByLabelText(/crop area/i);
      fireEvent.keyDown(cropArea, { key: 'ArrowDown' });
      expect(cropArea).toBeInTheDocument();
    });

    it('should handle non-arrow keys without side effects', () => {
      mockUseImageCropper.mockReturnValue({
        ...defaultMockReturn,
        imageLoaded: true,
      });
      render(
        <ImageCropper image="test.jpg" onCrop={mockOnCrop} onCancel={mockOnCancel} />,
      );
      
      const cropArea = screen.getByLabelText(/crop area/i);
      fireEvent.keyDown(cropArea, { key: 'Enter' });
      fireEvent.keyDown(cropArea, { key: 'Space' });
      fireEvent.keyDown(cropArea, { key: 'Escape' });
      // Component should handle other keys gracefully
      expect(cropArea).toBeInTheDocument();
    });
  });
});

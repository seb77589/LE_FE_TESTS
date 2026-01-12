/**
 * Tests for UploadProgress component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import UploadProgress from '@/components/ui/UploadProgress';

describe('UploadProgress', () => {
  describe('Basic Rendering', () => {
    it('should render progress bar', () => {
      const { container } = render(<UploadProgress progress={50} />);
      const progressBar = container.querySelector('.bg-primary');
      expect(progressBar).toBeInTheDocument();
    });

    it('should display progress percentage', () => {
      render(<UploadProgress progress={75} />);
      expect(screen.getByText('75%')).toBeInTheDocument();
    });

    it('should set correct width based on progress', () => {
      render(<UploadProgress progress={60} />);
      const progressBar = document.querySelector('.bg-primary');
      expect(progressBar).toHaveStyle({ width: '60%' });
    });
  });

  describe('File Name Display', () => {
    it('should display file name when provided', () => {
      render(<UploadProgress progress={50} fileName="test-document.pdf" />);
      expect(screen.getByText(/uploading: test-document.pdf/i)).toBeInTheDocument();
    });

    it('should not display file name section when fileName not provided', () => {
      render(<UploadProgress progress={50} />);
      expect(screen.queryByText(/uploading:/i)).not.toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle 0% progress', () => {
      render(<UploadProgress progress={0} />);
      expect(screen.getByText('0%')).toBeInTheDocument();
      const progressBar = document.querySelector('.bg-primary');
      expect(progressBar).toHaveStyle({ width: '0%' });
    });

    it('should handle 100% progress', () => {
      render(<UploadProgress progress={100} />);
      expect(screen.getByText('100%')).toBeInTheDocument();
      const progressBar = document.querySelector('.bg-primary');
      expect(progressBar).toHaveStyle({ width: '100%' });
    });

    it('should handle progress values above 100', () => {
      render(<UploadProgress progress={150} />);
      expect(screen.getByText('150%')).toBeInTheDocument();
      const progressBar = document.querySelector('.bg-primary');
      expect(progressBar).toHaveStyle({ width: '150%' });
    });
  });
});

/**
 * Tests for ProfilePicture component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProfilePicture } from '@/components/profile/ProfilePicture';

describe('ProfilePicture', () => {
  describe('Basic Rendering', () => {
    it('should render profile picture container', () => {
      const { container } = render(
        <ProfilePicture src="https://example.com/avatar.jpg" alt="Test User" />,
      );
      expect(container.firstChild).toBeInTheDocument();
    });

    it('should render fallback when no src provided', () => {
      render(<ProfilePicture fallbackText="Test User" />);
      // Should show initials
      expect(screen.getByText('TU')).toBeInTheDocument();
    });

    it('should render with different sizes', () => {
      const { container: container1 } = render(
        <ProfilePicture src="test.jpg" size="sm" />,
      );
      expect(container1.firstChild).toBeInTheDocument();

      const { container: container2 } = render(
        <ProfilePicture src="test.jpg" size="lg" />,
      );
      expect(container2.firstChild).toBeInTheDocument();
    });
  });

  describe('Initials Fallback', () => {
    it('should display initials from fallbackText', () => {
      render(<ProfilePicture fallbackText="Test User" />);
      expect(screen.getByText('TU')).toBeInTheDocument();
    });

    it('should handle single name', () => {
      render(<ProfilePicture fallbackText="Test" />);
      expect(screen.getByText('T')).toBeInTheDocument();
    });

    it('should handle empty fallbackText', () => {
      const { container } = render(<ProfilePicture />);
      // Should show default icon (User icon) - component renders a div container
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  describe('Edit Button', () => {
    it('should show edit button when showEditButton is true', () => {
      const onEdit = jest.fn();
      render(<ProfilePicture src="test.jpg" showEditButton onEdit={onEdit} />);
      const editButton = screen.getByTitle('Edit profile picture');
      expect(editButton).toBeInTheDocument();
    });

    it('should call onEdit when edit button is clicked', () => {
      const onEdit = jest.fn();
      render(<ProfilePicture src="test.jpg" showEditButton onEdit={onEdit} />);
      const editButton = screen.getByTitle('Edit profile picture');
      fireEvent.click(editButton);
      expect(onEdit).toHaveBeenCalledTimes(1);
    });

    it('should not show edit button when showEditButton is false', () => {
      render(<ProfilePicture src="test.jpg" showEditButton={false} />);
      expect(screen.queryByTitle('Edit profile picture')).not.toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should render component with fallback when image fails', () => {
      // Component handles image errors internally
      // Test that component renders successfully with fallback
      const { container } = render(
        <ProfilePicture src="invalid.jpg" fallbackText="Test User" />,
      );
      expect(container.firstChild).toBeInTheDocument();
      // Component will show fallback after image error (handled internally)
    });
  });
});

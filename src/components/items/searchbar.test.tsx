import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import SearchBar from './SearchBar'; // Assuming SearchBar is default export

// lucide-react is globally mocked in jest.setup.js
// next/link is not used in this component

describe('SearchBar Component', () => {
  const mockOnSearch = jest.fn();
  const mockOnFilterToggle = jest.fn();

  beforeEach(() => {
    mockOnSearch.mockClear();
    mockOnFilterToggle.mockClear();
  });

  describe('Initial Rendering', () => {
    test('renders input, Search button, and Filters button (if onFilterToggle is provided)', () => {
      render(<SearchBar onSearch={mockOnSearch} onFilterToggle={mockOnFilterToggle} />);

      expect(screen.getByPlaceholderText('Search for items...')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /filters/i })).toBeInTheDocument();
    });

    test('renders without Filters button if onFilterToggle is not provided', () => {
      render(<SearchBar onSearch={mockOnSearch} />);

      expect(screen.getByPlaceholderText('Search for items...')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /filters/i })).not.toBeInTheDocument();
    });
  });

  test('Input Interaction: typing updates input field value', () => {
    render(<SearchBar onSearch={mockOnSearch} />);
    const inputElement = screen.getByPlaceholderText('Search for items...') as HTMLInputElement;

    fireEvent.change(inputElement, { target: { value: 'test query' } });
    expect(inputElement.value).toBe('test query');
  });

  describe('Search Submission', () => {
    test('Clicking Search button calls onSearch with the input value', () => {
      render(<SearchBar onSearch={mockOnSearch} onFilterToggle={mockOnFilterToggle} />);
      const inputElement = screen.getByPlaceholderText('Search for items...');
      const searchButton = screen.getByRole('button', { name: /search/i });

      fireEvent.change(inputElement, { target: { value: 'test search' } });
      fireEvent.click(searchButton);

      expect(mockOnSearch).toHaveBeenCalledTimes(1);
      expect(mockOnSearch).toHaveBeenCalledWith('test search');
    });

    test('Pressing Enter in input calls onSearch with the input value', () => {
      render(<SearchBar onSearch={mockOnSearch} />);
      const inputElement = screen.getByPlaceholderText('Search for items...');
      const formElement = inputElement.closest('form'); // SearchBar is a form

      fireEvent.change(inputElement, { target: { value: 'enter search' } });

      // Simulate form submission (more robust for Enter key behavior)
      if (formElement) {
        fireEvent.submit(formElement);
      } else {
        // Fallback if form not found, though it should be there
        fireEvent.keyDown(inputElement, { key: 'Enter', code: 'Enter', charCode: 13 });
      }

      expect(mockOnSearch).toHaveBeenCalledTimes(1);
      expect(mockOnSearch).toHaveBeenCalledWith('enter search');
    });

    test('Search with empty term calls onSearch with an empty string', () => {
      render(<SearchBar onSearch={mockOnSearch} />);
      const searchButton = screen.getByRole('button', { name: /search/i });
      const inputElement = screen.getByPlaceholderText('Search for items...') as HTMLInputElement;

      // Ensure input is empty (it should be by default)
      expect(inputElement.value).toBe('');

      fireEvent.click(searchButton);
      expect(mockOnSearch).toHaveBeenCalledTimes(1);
      expect(mockOnSearch).toHaveBeenCalledWith('');
    });
  });

  describe('Filter Toggle Interaction', () => {
    test('Clicking Filters button calls onFilterToggle', () => {
      render(<SearchBar onSearch={mockOnSearch} onFilterToggle={mockOnFilterToggle} />);
      const filterButton = screen.getByRole('button', { name: /filters/i });

      fireEvent.click(filterButton);
      expect(mockOnFilterToggle).toHaveBeenCalledTimes(1);
    });
  });
});

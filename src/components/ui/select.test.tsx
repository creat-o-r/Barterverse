import * as React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
  SelectGroup, // Import if needed for structured tests
  SelectLabel, // Import if needed for structured tests
} from './select'; // Adjust path as necessary

// Mock lucide-react (already handled in jest.setup.js)

describe('Select Components', () => {
  const TestSelect = ({
    onValueChange,
    defaultValue,
    value: controlledValue, // For controlled component testing
    triggerClassName,
    contentClassName,
  }: {
    onValueChange?: (value: string) => void;
    defaultValue?: string;
    value?: string;
    triggerClassName?: string;
    contentClassName?: string;
  }) => (
    <Select onValueChange={onValueChange} defaultValue={defaultValue} value={controlledValue}>
      <SelectTrigger className={triggerClassName} data-testid="select-trigger">
        <SelectValue placeholder="Select a fruit" />
      </SelectTrigger>
      <SelectContent className={contentClassName} data-testid="select-content">
        <SelectGroup>
          <SelectLabel>Fruits</SelectLabel>
          <SelectItem value="apple">Apple</SelectItem>
          <SelectItem value="banana">Banana</SelectItem>
          <SelectItem value="blueberry">Blueberry</SelectItem>
          <SelectItem value="disabled-fruit" disabled>
            Disabled Fruit
          </SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  );

  describe('Basic Select Workflow', () => {
    test('opens, selects an item, calls onValueChange, closes, and updates SelectValue', async () => {
      const handleValueChange = jest.fn();
      render(<TestSelect onValueChange={handleValueChange} defaultValue="apple" />);

      const trigger = screen.getByTestId('select-trigger');

      // Verify SelectValue displays default value's text
      // Radix SelectValue with placeholder might not show default value text directly in trigger
      // if placeholder is also provided and no item is "selected" by default based on value.
      // It usually shows the placeholder initially or when the value doesn't match an item.
      // If defaultValue is set, Radix should render the corresponding item's text.
      expect(screen.getByText('Apple')).toBeInTheDocument(); // Check if default value's text is rendered

      // Initially, content should not be visible (or not in document, Radix portals it)
      expect(screen.queryByTestId('select-content')).toBeNull();

      // Open
      fireEvent.click(trigger); // Changed from mouseDown to click

      const content = await screen.findByTestId('select-content');
      expect(content).toBeVisible();
      const itemBanana = await within(content).findByText('Banana');
      expect(itemBanana).toBeVisible();

      // Select an Item
      fireEvent.click(itemBanana);

      expect(handleValueChange).toHaveBeenCalledWith('banana');

      // Content should close after selection
      await waitFor(() => {
        expect(screen.queryByTestId('select-content')).not.toBeInTheDocument(); // Radix unmounts content
      });

      // SelectValue should update to show "Banana"
      // This requires the component to re-render with the new value reflected in SelectValue.
      // In an uncontrolled component with defaultValue, Radix handles this internally.
      expect(screen.getByText('Banana')).toBeInTheDocument();
      expect(screen.queryByText('Apple')).not.toBeInTheDocument(); // Old value gone
    });
  });

  describe('Controlled Component Behavior (Value Prop)', () => {
    test('displays text for controlled value and calls onValueChange', async () => {
      const handleValueChange = jest.fn();
      // Start with 'apple' as the controlled value
      const { rerender } = render(
        <TestSelect value="apple" onValueChange={handleValueChange} />
      );

      const trigger = screen.getByTestId('select-trigger');
      expect(screen.getByText('Apple')).toBeInTheDocument(); // Displaying 'Apple'

      // Open
      fireEvent.click(trigger); // Changed from mouseDown to click
      const content = await screen.findByTestId('select-content');
      const itemBlueberry = await within(content).findByText('Blueberry');

      // Select "Blueberry"
      fireEvent.click(itemBlueberry);
      expect(handleValueChange).toHaveBeenCalledWith('blueberry');

      // Content should close
      await waitFor(() => {
        expect(screen.queryByTestId('select-content')).not.toBeInTheDocument();
      });

      // In a controlled component, SelectValue updates only if parent re-renders with new value.
      // Here, we check that 'Apple' (the old controlled value) is still displayed
      // because the test itself doesn't re-render with a new value prop.
      expect(screen.getByText('Apple')).toBeInTheDocument();

      // Simulate parent re-rendering with the new value
      rerender(<TestSelect value="blueberry" onValueChange={handleValueChange} />);
      expect(screen.getByText('Blueberry')).toBeInTheDocument(); // Now shows 'Blueberry'
      expect(screen.queryByText('Apple')).not.toBeInTheDocument();
    });
  });

  describe('Disabled State', () => {
    test('SelectTrigger disabled: does not open content on click', () => {
      render(
        <Select defaultValue="apple">
          <SelectTrigger disabled data-testid="disabled-trigger">
            <SelectValue placeholder="Select a fruit" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="apple">Apple</SelectItem>
          </SelectContent>
        </Select>
      );
      const trigger = screen.getByTestId('disabled-trigger');
      expect(trigger).toBeDisabled();
      fireEvent.mouseDown(trigger); // Use mouseDown as Radix does
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument(); // listbox is role of SelectContent
    });

    test('SelectItem disabled: does not trigger onValueChange or close select', async () => {
      const handleValueChange = jest.fn();
      render(<TestSelect onValueChange={handleValueChange} />);

      const trigger = screen.getByTestId('select-trigger');
      fireEvent.click(trigger); // Changed from mouseDown to click

      const content = await screen.findByTestId('select-content');
      const disabledItem = await within(content).findByText('Disabled Fruit');

      // Check if the item itself appears disabled (Radix adds data-[disabled])
      expect(disabledItem.closest('[data-disabled]')).not.toBeNull();

      fireEvent.click(disabledItem);

      expect(handleValueChange).not.toHaveBeenCalled();
      // Content should still be visible as selection was on a disabled item
      expect(screen.getByTestId('select-content')).toBeVisible();
    });
  });

  describe('className and Props Pass-through', () => {
    test('SelectTrigger applies custom className', () => {
      render(<TestSelect triggerClassName="custom-trigger-class" />);
      const trigger = screen.getByTestId('select-trigger');
      expect(trigger).toHaveClass('custom-trigger-class');
    });

    test('SelectContent applies custom className', async () => {
      render(<TestSelect contentClassName="custom-content-class" />);
      const trigger = screen.getByTestId('select-trigger');
      fireEvent.click(trigger); // Changed from mouseDown to click
      const content = await screen.findByTestId('select-content');
      expect(content).toHaveClass('custom-content-class');
    });
  });
});

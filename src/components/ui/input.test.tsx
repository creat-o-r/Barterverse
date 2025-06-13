import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Input } from './input'; // Adjust path as necessary

describe('Input Component', () => {
  const defaultClasses = [
    "flex", "h-10", "w-full", "rounded-md", "border", "border-input", "bg-background",
    "px-3", "py-2", "text-base", "ring-offset-background",
    "file:border-0", "file:bg-transparent", "file:text-sm", "file:font-medium", "file:text-foreground",
    "placeholder:text-muted-foreground",
    "focus-visible:outline-none", "focus-visible:ring-2", "focus-visible:ring-ring", "focus-visible:ring-offset-2",
    "disabled:cursor-not-allowed", "disabled:opacity-50",
    "md:text-sm"
  ];

  test('default rendering: renders an input element with default classes', () => {
    render(<Input data-testid="default-input" />);
    const inputElement = screen.getByTestId('default-input');
    expect(inputElement).toBeInTheDocument();
    expect(inputElement.tagName).toBe('INPUT');
    const classAttribute = inputElement.getAttribute('class');
    expect(classAttribute).toBeDefined();
    defaultClasses.forEach(cls => {
      expect(classAttribute).toContain(cls);
    });
  });

  test('type attribute: sets the type attribute correctly', () => {
    const { rerender } = render(<Input type="text" data-testid="type-input" />);
    let inputElement = screen.getByTestId('type-input');
    expect(inputElement).toHaveAttribute('type', 'text');

    rerender(<Input type="password" data-testid="type-input" />);
    inputElement = screen.getByTestId('type-input');
    expect(inputElement).toHaveAttribute('type', 'password');

    rerender(<Input type="email" data-testid="type-input" />);
    inputElement = screen.getByTestId('type-input');
    expect(inputElement).toHaveAttribute('type', 'email');

    rerender(<Input type="number" data-testid="type-input" />);
    inputElement = screen.getByTestId('type-input');
    expect(inputElement).toHaveAttribute('type', 'number');
  });

  test('className prop: merges default and custom classes', () => {
    const customClass = 'my-custom-input';
    render(<Input className={customClass} data-testid="class-input" />);
    const inputElement = screen.getByTestId('class-input');
    expect(inputElement.classList).toContain(customClass);
    // Check one of the default classes to ensure they are also present
    expect(inputElement.classList).toContain('h-10');
  });

  describe('Event Handling', () => {
    test('onChange handler is called', () => {
      const handleChange = jest.fn();
      render(<Input onChange={handleChange} data-testid="onchange-input" />);
      const inputElement = screen.getByTestId('onchange-input');
      fireEvent.change(inputElement, { target: { value: 'test value' } });
      expect(handleChange).toHaveBeenCalledTimes(1);
    });

    test('onFocus handler is called', () => {
      const handleFocus = jest.fn();
      render(<Input onFocus={handleFocus} data-testid="onfocus-input" />);
      const inputElement = screen.getByTestId('onfocus-input');
      fireEvent.focus(inputElement);
      expect(handleFocus).toHaveBeenCalledTimes(1);
    });

    test('onBlur handler is called', () => {
      const handleBlur = jest.fn();
      render(<Input onBlur={handleBlur} data-testid="onblur-input" />);
      const inputElement = screen.getByTestId('onblur-input');
      // Focus first, then blur
      fireEvent.focus(inputElement);
      fireEvent.blur(inputElement);
      expect(handleBlur).toHaveBeenCalledTimes(1);
    });
  });

  describe('Disabled state', () => {
    test('renders a disabled input and applies disabled classes', () => {
      render(<Input disabled data-testid="disabled-input" />);
      const inputElement = screen.getByTestId('disabled-input');
      expect(inputElement).toBeDisabled();
      // Check for specific disabled classes from the component's className string
      expect(inputElement.getAttribute('class')).toContain('disabled:cursor-not-allowed');
      expect(inputElement.getAttribute('class')).toContain('disabled:opacity-50');
    });

    test('onChange handler is not called when input is disabled', () => {
      const handleChange = jest.fn();
      render(<Input onChange={handleChange} disabled data-testid="disabled-change-input" />);
      const inputElement = screen.getByTestId('disabled-change-input');
      // Attempt to change the value
      fireEvent.change(inputElement, { target: { value: 'test value' } });
      expect(handleChange).not.toHaveBeenCalled();
    });
  });

  test('Ref forwarding: ref is correctly attached', () => {
    const inputRef = React.createRef<HTMLInputElement>();
    render(<Input ref={inputRef} data-testid="ref-input" />);
    expect(inputRef.current).toBeInTheDocument();
    expect(inputRef.current?.tagName).toBe('INPUT');
    expect(inputRef.current).toBe(screen.getByTestId('ref-input'));
  });

  test('Placeholder attribute: displays placeholder text', () => {
    const placeholderText = 'Enter your name';
    render(<Input placeholder={placeholderText} />);
    expect(screen.getByPlaceholderText(placeholderText)).toBeInTheDocument();
  });

  test('Value prop: displays the provided value', () => {
    const testValue = 'Initial Value';
    // For an uncontrolled input, defaultValue might be more appropriate for initial value.
    // For a controlled input, value + onChange is needed.
    // The component as written is uncontrolled by default but accepts `value`.
    render(<Input value={testValue} onChange={jest.fn()} data-testid="value-input"/>); // Add onChange for controlled pattern if needed
    const inputElement = screen.getByTestId('value-input') as HTMLInputElement;
    expect(inputElement.value).toBe(testValue);

    // Test changing value (simulating controlled component)
    const { rerender } = render(<Input value="First" onChange={() => {}} data-testid="controlled-input" />);
    const controlledInput = screen.getByTestId('controlled-input') as HTMLInputElement;
    expect(controlledInput.value).toBe("First");

    rerender(<Input value="Second" onChange={() => {}} data-testid="controlled-input" />);
    expect(controlledInput.value).toBe("Second");
  });
});

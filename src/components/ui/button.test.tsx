import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button, buttonVariants, ButtonProps } from './button'; // Adjust path as necessary
import { cn } from '@/lib/utils'; // For verifying classes if needed directly, though usually not

describe('Button Component', () => {
  test('default rendering: renders a button with default variant and size classes, and children', () => {
    render(<Button>Click Me</Button>);
    const buttonElement = screen.getByRole('button', { name: /click me/i });
    expect(buttonElement).toBeInTheDocument();
    expect(buttonElement.tagName).toBe('BUTTON');
    expect(buttonElement).toHaveTextContent('Click Me');

    // Check for default classes. This is a bit brittle if cva output changes,
    // but can be useful. A more robust way is to check for specific styles if possible,
    // or trust that cva applies the classes correctly and just test variants/sizes by name.
    // For now, let's check for some key parts of default variant/size.
    // From buttonVariants: default variant "bg-primary text-primary-foreground", default size "h-10 px-4 py-2"
    expect(buttonElement.className).toMatch(/bg-primary/);
    expect(buttonElement.className).toMatch(/text-primary-foreground/);
    expect(buttonElement.className).toMatch(/h-10/);
    expect(buttonElement.className).toMatch(/px-4/);
    expect(buttonElement.className).toMatch(/py-2/);
  });

  test('asChild prop: renders the child element with button classes and props', () => {
    render(
      <Button asChild>
        <a href="/test">Link Button</a>
      </Button>
    );
    // Use getByRole('link') because asChild renders an anchor tag.
    const linkElement = screen.getByRole('link', { name: /link button/i });
    expect(linkElement).toBeInTheDocument();
    expect(linkElement.tagName).toBe('A');
    expect(linkElement).toHaveAttribute('href', '/test');
    expect(linkElement).toHaveTextContent('Link Button');

    // Check for default button classes applied to the anchor
    expect(linkElement.className).toMatch(/bg-primary/); // Default variant
    expect(linkElement.className).toMatch(/h-10/); // Default size
  });

  describe('Variants and Sizes', () => {
    // Test Variants
    const variants: ButtonProps['variant'][] = ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'];
    variants.forEach((variant) => {
      test(`applies correct classes for variant: ${variant}`, () => {
        render(<Button variant={variant}>Variant Test</Button>);
        const buttonElement = screen.getByRole('button', { name: /variant test/i });
        // This relies on the structure of buttonVariants.
        // We expect cn(buttonVariants({ variant, size, className })) to work.
        // A simple check is to see if a key class for that variant is present.
        const expectedClasses = buttonVariants({ variant, size: 'default' });
        // Check if all generated classes for this variant are present
        expectedClasses.split(' ').forEach(cls => {
          if (cls) expect(buttonElement.classList).toContain(cls);
        });
      });
    });

    // Test Sizes
    const sizes: ButtonProps['size'][] = ['default', 'sm', 'lg', 'icon'];
    sizes.forEach((size) => {
      test(`applies correct classes for size: ${size}`, () => {
        render(<Button size={size}>{size === 'icon' ? '<i>I</i>' : 'Size Test'}</Button>);
        let buttonElement;
        if (size === 'icon') {
            // For icon, the content might be an SVG or an icon font, not simple text
            // Let's assume an icon button might not have text, or might have a specific role/label
            // For simplicity, find by role button. If it has an accessible name, great. Otherwise, might need adjustment.
            buttonElement = screen.getByRole('button');
        } else {
            buttonElement = screen.getByRole('button', { name: /size test/i });
        }
        const expectedClasses = buttonVariants({ variant: 'default', size });
        expectedClasses.split(' ').forEach(cls => {
          if (cls) expect(buttonElement.classList).toContain(cls);
        });
      });
    });
  });

  test('Event Handling: onClick mock function is called', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Clickable</Button>);
    const buttonElement = screen.getByRole('button', { name: /clickable/i });
    fireEvent.click(buttonElement);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  describe('Disabled state', () => {
    test('renders a disabled button and applies disabled classes', () => {
      render(<Button disabled>Disabled Button</Button>);
      const buttonElement = screen.getByRole('button', { name: /disabled button/i });
      expect(buttonElement).toBeDisabled();
      // Check for "disabled:opacity-50" or similar part of the disabled style from CVA
      expect(buttonElement.className).toMatch(/disabled:opacity-50/);
      // Or check for a more general "opacity-50" if that's what gets applied
      // Note: JSDOM doesn't actually compute styles or apply opacity based on disabled state,
      // so we are checking for the class that *should* cause the style.
      // The class "disabled:opacity-50" is a Tailwind directive.
      // The actual class applied by CVA for disabled might be just "opacity-50".
      // The base CVA string is: "disabled:pointer-events-none disabled:opacity-50"
      // So these classes should be present directly.
      expect(buttonElement.classList.contains('disabled:pointer-events-none')).toBe(true);
      expect(buttonElement.classList.contains('disabled:opacity-50')).toBe(true);
    });

    test('onClick handler is not called when button is disabled', () => {
      const handleClick = jest.fn();
      render(<Button onClick={handleClick} disabled>Disabled Click</Button>);
      const buttonElement = screen.getByRole('button', { name: /disabled click/i });
      fireEvent.click(buttonElement);
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  test('Ref forwarding: ref is correctly attached', () => {
    const buttonRef = React.createRef<HTMLButtonElement>();
    render(<Button ref={buttonRef}>Ref Button</Button>);
    expect(buttonRef.current).toBeInTheDocument();
    expect(buttonRef.current?.tagName).toBe('BUTTON');
    expect(buttonRef.current).toHaveTextContent('Ref Button');
  });

  test('Ref forwarding with asChild: ref is correctly attached to the child element', () => {
    const linkRef = React.createRef<HTMLAnchorElement>();
    render(<Button asChild ref={linkRef}><a href="#">Link Ref</a></Button>);
    expect(linkRef.current).toBeInTheDocument();
    expect(linkRef.current?.tagName).toBe('A');
    expect(linkRef.current).toHaveTextContent('Link Ref');
  });


  test('Passing other HTML attributes: applies attributes like type="submit"', () => {
    render(<Button type="submit">Submit Button</Button>);
    const buttonElement = screen.getByRole('button', { name: /submit button/i });
    expect(buttonElement).toHaveAttribute('type', 'submit');
  });
});

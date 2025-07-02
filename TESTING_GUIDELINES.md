# Testing Guidelines

This document provides guidelines for writing tests in this project.

## Overview of Testing Layers

Our testing strategy includes several layers:

*   **Unit Tests:** These test individual functions, components, or modules in isolation. They are fast to run and help ensure that the basic building blocks of the application work correctly. (e.g., testing a single React component's rendering or a utility function's logic). Use Jest for unit tests.
*   **Integration Tests:** These tests verify the interaction between multiple components or services. They are typically more complex than unit tests but less so than E2E tests. (e.g., testing if a form component correctly calls an API service). Use Jest with React Testing Library for frontend integration tests.
*   **End-to-End (E2E) Tests:** These tests simulate real user scenarios by interacting with the application through the UI, just like a user would. They cover complete workflows and provide the highest confidence that the application is working as expected from the user's perspective. Use Playwright for E2E tests.

## Running Tests Locally

*   **Run all tests (Unit and E2E):**
    ```bash
    npm run test
    ```
*   **Run only Unit Tests:**
    ```bash
    npm run test:unit
    ```
*   **Run only End-to-End Tests:**
    ```bash
    npm run test:e2e
    ```
    (Ensure the development server is running or configured to be started by Playwright as per `playwright.config.ts`)

## Improving E2E Test Robustness: Using `data-testid`

To make End-to-End tests more robust and less prone to breaking due to UI restyling or text changes, we recommend using `data-testid` attributes for selecting elements in Playwright tests.

**Why `data-testid`?**

*   **Resilience:** `data-testid` attributes are specifically for testing and are less likely to change during UI redesigns compared to CSS classes, ARIA roles (if not used correctly), or text content.
*   **Clarity:** They make tests easier to read and understand, as they clearly indicate which element is being targeted for testing purposes.

**How to use:**

1.  **In your React components (or HTML):** Add a `data-testid` attribute to the elements you need to interact with in your tests.

    ```tsx
    // Example in a React component
    function MyComponent() {
      return (
        <div>
          <button data-testid="submit-button">Submit</button>
          <input type="text" data-testid="username-input" />
        </div>
      );
    }
    ```

2.  **In your Playwright tests:** Use the `getByTestId` locator.

    ```typescript
    // Example in a Playwright test
    import { test, expect } from '@playwright/test';

    test('should submit the form', async ({ page }) => {
      await page.goto('/my-page');

      await page.getByTestId('username-input').fill('testuser');
      await page.getByTestId('submit-button').click();

      // ... further assertions
    });
    ```

**When to use other selectors:**

While `data-testid` is preferred for key interactive elements, other selectors can still be appropriate:
*   `getByRole`: For accessibility, use ARIA roles when they make sense (e.g., `page.getByRole('button', { name: /Submit/i })`). This also helps enforce accessible markup.
*   `getByText`: For verifying visible text content.
*   `getByLabel`: For form fields associated with a label.

Avoid highly specific CSS selectors or XPath queries that are tightly coupled to the DOM structure, as these are the most brittle. Prioritize user-facing attributes and test IDs.

## CI/CD Process

All tests (unit and E2E), linters, and type checkers are run automatically in our CI/CD pipeline (GitHub Actions) whenever code is pushed to a branch or a pull request is created/updated. This helps ensure that:
*   Code adheres to our linting standards.
*   There are no type errors.
*   All unit and E2E tests pass.

**A pull request cannot be merged if any of these checks fail.** This is crucial for maintaining code quality and ensuring seamless merges.

## General Best Practices

*   Write tests for all new features.
*   Write tests for bug fixes (regression tests).
*   Aim for clear, concise, and readable test cases.
*   Ensure your tests are independent and can be run in any order.
*   Mock external dependencies in unit and integration tests to ensure they are fast and reliable.
---
*This document is a work in progress and will be updated as our testing practices evolve.*
